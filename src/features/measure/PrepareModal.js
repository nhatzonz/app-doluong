import React, { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, ScrollView, StyleSheet, Alert, ActivityIndicator, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Accelerometer } from 'expo-sensors';
import * as Location from 'expo-location';
import { useT } from '../../i18n';
import { useSettings } from '../settings/SettingsContext';
import { useTripStore } from '../trips/TripStoreContext';
import { checkHealth } from '../../services/api';
import { exportCSV } from '../../services/csvExport';
import { COLORS, SHADOW } from '../../utils/colors';
import { Button, ChipSelect, Note } from '../ui/kit';
import { ScreenHeader, SectionHeader, Panel, screenStyles } from '../ui/screen';
import { tripDisplayName } from '../ui/format';
import {
  VEHICLES, MOUNTS, TARGET_SPEEDS, DEFAULT_TARGET_SPEED, defaultSetup,
  CHECK_MIN_HZ, CHECK_MAX_GPS_M, CHECK_DURATION_MS,
} from './setupOptions';

// Chay kiem tra nhanh. Chi goi khi CHUA do → subscription rieng khong
// anh huong luong do chinh; luon go subscription truoc khi resolve.
async function runQuickCheck() {
  const hzPromise = new Promise((resolve) => {
    let count = 0;
    let first = null;
    let last = null;
    Accelerometer.setUpdateInterval(20);
    const sub = Accelerometer.addListener(({ timestamp }) => {
      const ts = Number.isFinite(timestamp) ? timestamp * 1000 : Date.now();
      if (first == null) first = ts;
      last = ts;
      count++;
    });
    setTimeout(() => {
      sub.remove();
      const dur = (last - first) / 1000;
      resolve(count > 1 && dur > 0 ? (count - 1) / dur : 0);
    }, CHECK_DURATION_MS);
  });

  const gpsPromise = (async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation });
    return pos?.coords?.accuracy ?? null;
  })().catch(() => null);

  const serverPromise = checkHealth().then(() => true).catch(() => false);

  const [hz, gps, server] = await Promise.all([hzPromise, gpsPromise, serverPromise]);
  return { hz, gps, server };
}

export function PrepareModal({ visible, onCancel, onStart }) {
  const { t, lang } = useT();
  const { settings } = useSettings();
  const { index, maxTrips, getTrip } = useTripStore();
  const [setup, setSetup] = useState(() => defaultSetup(settings.defaultVehicle));
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    if (visible) {
      setSetup(defaultSetup(settings.defaultVehicle));
      setCheck(null);
    }
  }, [visible, settings.defaultVehicle]);

  const changeVehicle = (vehicle) => setSetup({
    vehicle,
    mount: MOUNTS[vehicle][0],
    targetSpeedKmh: DEFAULT_TARGET_SPEED[vehicle],
  });

  const doCheck = async () => {
    setChecking(true);
    setCheck(null);
    try {
      const res = await runQuickCheck();
      if (mountedRef.current) setCheck(res);
    } finally {
      if (mountedRef.current) setChecking(false);
    }
  };

  const oldest = index.length >= maxTrips ? index[index.length - 1] : null;

  const exportOldest = async () => {
    try {
      const trip = await getTrip(oldest.id);
      if (trip) await exportCSV(trip.segments, { setup: trip.setup, fileName: `${trip.id}.csv` });
    } catch (e) {
      Alert.alert(t('common.error'), t('results.exportFailed', { msg: e.message }));
    }
  };

  const checkRow = (label, value, pass, last) => (
    <View style={[styles.checkRow, last && { borderBottomWidth: 0 }]}>
      <View style={[styles.checkIcon, { backgroundColor: pass ? '#ECFDF5' : '#FEF2F2' }]}>
        <Text style={[styles.checkIconText, { color: pass ? COLORS.good : COLORS.bad }]}>{pass ? '✓' : '✗'}</Text>
      </View>
      <Text style={styles.checkLabel}>{label}</Text>
      <Text style={styles.checkValue}>{value}</Text>
      <Text style={[styles.badge, { color: pass ? COLORS.good : COLORS.bad }]}>
        {pass ? t('prepare.pass') : t('prepare.fail')}
      </Text>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <View style={screenStyles.root}>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <ScreenHeader
            modal
            eyebrow={t('ui.prepare.eyebrow')}
            title={t('prepare.title')}
            onClose={onCancel}
          />

          <SectionHeader title={t('prepare.vehicle')} style={styles.firstSection} />
          <View style={screenStyles.row2}>
            {VEHICLES.map(v => {
              const active = setup.vehicle === v;
              return (
                <TouchableOpacity
                  key={v}
                  activeOpacity={0.85}
                  onPress={() => changeVehicle(v)}
                  style={[styles.vehicleCard, active && styles.vehicleCardActive]}
                >
                  <Text style={styles.vehicleGlyph}>{v === 'car' ? '🚗' : '🏍️'}</Text>
                  <Text style={[styles.vehicleLabel, active && { color: COLORS.primary }]}>{t(`vehicle.${v}`)}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <SectionHeader title={t('prepare.mount')} />
          <Panel>
            <ChipSelect
              value={setup.mount}
              onChange={(mount) => setSetup(s => ({ ...s, mount }))}
              options={MOUNTS[setup.vehicle].map(m => ({ value: m, label: t(`mount.${m}`) }))}
            />
          </Panel>

          <SectionHeader title={t('prepare.targetSpeed')} meta="km/h" />
          <Panel>
            <ChipSelect
              value={setup.targetSpeedKmh}
              onChange={(targetSpeedKmh) => setSetup(s => ({ ...s, targetSpeedKmh }))}
              options={TARGET_SPEEDS[setup.vehicle].map(v => ({ value: v, label: `${v} km/h` }))}
            />
          </Panel>

          <SectionHeader title={t('prepare.check')} />
          <Panel>
            <Text style={screenStyles.mutedText}>{t('prepare.checkHint')}</Text>
            <Button
              title={checking ? t('prepare.checking') : t('prepare.runCheck')}
              variant="ghost"
              onPress={doCheck}
              disabled={checking}
              style={styles.gapSm}
            />
            {checking && <ActivityIndicator style={styles.gapSm} color={COLORS.primary} />}
            {check && (
              <View style={styles.checkBox}>
                {checkRow(t('prepare.sampleRate'), `${check.hz.toFixed(1)} Hz`, check.hz >= CHECK_MIN_HZ)}
                {checkRow(
                  t('prepare.gpsAccuracy'),
                  check.gps != null ? `±${check.gps.toFixed(0)} m` : '--',
                  check.gps != null && check.gps <= CHECK_MAX_GPS_M
                )}
                {checkRow(t('prepare.server'), check.server ? t('common.online') : t('common.offlineChip'), check.server, true)}
              </View>
            )}
            <Text style={[screenStyles.mutedText, styles.gapSm]}>{t('prepare.skipCheck')}</Text>
          </Panel>

          {oldest && (
            <>
              <Note tone="warn">
                {t('prepare.evictWarning', { max: maxTrips, name: tripDisplayName(oldest, t, lang) })}
              </Note>
              <Button title={t('prepare.exportOldest')} variant="ghost" onPress={exportOldest} style={styles.gapSm} />
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onStart(setup)}
            disabled={checking}
            style={[styles.startTouch, checking && { opacity: 0.5 }]}
          >
            <LinearGradient
              colors={[COLORS.accentFrom, COLORS.accentTo]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.startBtn}
            >
              <Text style={styles.startLabel}>{t('prepare.begin')}</Text>
              <Text style={styles.startSub}>
                {`${setup.vehicle === 'car' ? '🚗' : '🏍️'} ${t(`mount.${setup.mount}`)} · ${setup.targetSpeedKmh} km/h`}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingBottom: 24 },
  firstSection: { marginTop: 4 },
  gapSm: { marginTop: 10 },
  vehicleCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOW.sm,
  },
  vehicleCardActive: { borderColor: COLORS.primary, backgroundColor: '#F5F9FF' },
  vehicleGlyph: { fontSize: 30 },
  vehicleLabel: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginTop: 6 },
  checkBox: {
    marginTop: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: 12,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  checkIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  checkIconText: { fontSize: 13, fontWeight: '900' },
  checkLabel: { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: '600' },
  checkValue: { fontSize: 13, color: COLORS.text, fontWeight: '800', fontVariant: ['tabular-nums'] },
  badge: { fontSize: 11, fontWeight: '800', minWidth: 58, textAlign: 'right' },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  startTouch: { borderRadius: 18, ...SHADOW.lg },
  startBtn: { borderRadius: 18, paddingVertical: 14, alignItems: 'center' },
  startLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  startSub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600', marginTop: 2 },
});
