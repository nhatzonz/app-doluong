import React, { useState } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useT } from '../../i18n';
import { useTripStore } from '../trips/TripStoreContext';
import { COLORS, SHADOW, comfortSoloColor, comfortTint } from '../../utils/colors';
import { classifyComfort } from '../../utils/comfortClassifier';
import { ComfortPill, ComfortShareBar, IconButton, Button } from '../ui/kit';
import { ScreenHeader, StatStrip, SectionHeader, ActionTile, screenStyles } from '../ui/screen';
import { fmtKm, fmtDuration, fmtDateTime, fmtNum, tripDisplayName, vehicleIcon } from '../ui/format';
import { RenameModal } from './RenameModal';

export default function HistoryScreen() {
  const { t, lang, comfortLabel } = useT();
  const navigation = useNavigation();
  const { index, maxTrips, minSegments, remove, patchTrip } = useTripStore();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState([]);
  const [renaming, setRenaming] = useState(null);

  const toggle = (id) => setSelected(prev => (
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev.slice(-1), id]
  ));

  const onPressTrip = (meta) => {
    if (selecting) toggle(meta.id);
    else navigation.navigate('TripDetail', { id: meta.id });
  };

  const onLongPressTrip = (meta) => {
    const name = tripDisplayName(meta, t, lang);
    Alert.alert(name, undefined, [
      { text: t('common.rename'), onPress: () => setRenaming(meta) },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () => Alert.alert(t('common.delete'), t('history.deleteConfirm', { name }), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.delete'), style: 'destructive', onPress: () => remove(meta.id) },
        ]),
      },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const startCompare = () => {
    if (selected.length !== 2) {
      Alert.alert(t('history.compare'), t('history.selectTwo'));
      return;
    }
    // Chuyen cu hon ben trai
    const [a, b] = index.filter(m => selected.includes(m.id)).reverse();
    setSelecting(false);
    setSelected([]);
    navigation.navigate('Compare', { a: a.id, b: b.id });
  };

  // Chi so tong hop hien thi (chi doc summary da luu)
  const totalKm = index.reduce((acc, m) => acc + (m.summary?.distanceM || 0), 0);
  const totalS = index.reduce((acc, m) => acc + (m.summary?.durationS || 0), 0);

  return (
    <View style={screenStyles.root}>
      <ScrollView contentContainerStyle={screenStyles.scrollTab} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow={t('history.eyebrow')}
          title={t('history.title')}
          subtitle={t('history.storageHint', { max: maxTrips })}
          right={(
            <>
              <IconButton glyph="ⓘ" onPress={() => navigation.navigate('IsoGuide')} accessibilityLabel={t('guide.title')} />
              <IconButton glyph="⚙︎" onPress={() => navigation.navigate('Settings')} accessibilityLabel={t('settings.title')} />
            </>
          )}
        />

        <StatStrip
          items={[
            { label: t('history.statTrips'), value: `${index.length}/${maxTrips}` },
            { label: t('history.statKm'), value: fmtKm(totalKm) },
            { label: t('history.statTime'), value: fmtDuration(totalS) },
          ]}
        />

        {/* O luu tru: hien truc quan 5 cho */}
        <View style={styles.slots}>
          {Array.from({ length: maxTrips }).map((_, i) => (
            <View key={i} style={[styles.slot, i < index.length && styles.slotUsed]} />
          ))}
        </View>

        {index.length > 0 && (
          <View style={[screenStyles.row2, styles.tiles]}>
            <ActionTile
              badge="∑"
              tint="#EFF6FF"
              color={COLORS.primary}
              title={t('history.stats')}
              hint={t('history.statsHint')}
              onPress={() => navigation.navigate('Stats')}
            />
            <ActionTile
              badge="A·B"
              tint="#F5F3FF"
              color="#8B5CF6"
              title={selecting ? t('history.cancelSelect') : t('history.compare')}
              hint={selecting ? t('history.selecting', { n: selected.length }) : t('history.compareTileHint')}
              disabled={index.length < 2}
              onPress={() => {
                if (selecting) {
                  setSelecting(false);
                  setSelected([]);
                } else {
                  setSelecting(true);
                }
              }}
            />
          </View>
        )}

        {selecting && (
          <Button
            title={`${t('history.compare')} (${selected.length}/2)`}
            onPress={startCompare}
            disabled={selected.length !== 2}
            style={styles.compareBtn}
          />
        )}

        {index.length === 0 ? (
          <View style={styles.empty}>
            <Image source={require('../../../assets/logo-mark.png')} style={styles.emptyLogo} resizeMode="contain" />
            <Text style={styles.emptyTitle}>{t('history.empty')}</Text>
            <Text style={styles.emptyHint}>{t('history.emptyHint', { n: minSegments, max: maxTrips })}</Text>
          </View>
        ) : (
          <SectionHeader title={t('history.tripsHeader')} meta={t('history.count', { n: index.length, max: maxTrips })} />
        )}

        {index.map(meta => {
          const s = meta.summary || {};
          const wrms = s.wrmsTotal || 0;
          const color = comfortSoloColor(wrms);
          const isSelected = selected.includes(meta.id);
          return (
            <TouchableOpacity
              key={meta.id}
              activeOpacity={0.85}
              onPress={() => onPressTrip(meta)}
              onLongPress={() => onLongPressTrip(meta)}
              style={[styles.card, isSelected && styles.cardSelected]}
            >
              <View style={styles.cardHead}>
                <View style={[styles.vehicleBadge, { backgroundColor: comfortTint(wrms) }]}>
                  <Text style={styles.vehicleGlyph}>{vehicleIcon(meta.setup?.vehicle)}</Text>
                </View>
                <View style={styles.cardHeadText}>
                  <Text style={styles.name} numberOfLines={1}>{tripDisplayName(meta, t, lang)}</Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {/* Chuyen chua dat ten: ten da chua ngay gio → hien cach gan may thay vi lap lai */}
                    {meta.name
                      ? fmtDateTime(meta.startedAt, lang)
                      : (meta.setup?.mount ? t(`mount.${meta.setup.mount}`) : fmtDateTime(meta.startedAt, lang))}
                    {meta.setup?.vehicle ? ` · ${t(`vehicle.${meta.setup.vehicle}`)}` : ''}
                  </Text>
                </View>
                {selecting ? (
                  <View style={[styles.check, isSelected && styles.checkOn]}>
                    {isSelected && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                ) : (
                  <TouchableOpacity onPress={() => onLongPressTrip(meta)} hitSlop={10} style={styles.moreBtn}>
                    <Text style={styles.more}>⋯</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.valueRow}>
                <View>
                  <Text style={styles.valueLabel}>WRMS</Text>
                  <Text style={[styles.value, { color }]}>
                    {fmtNum(wrms)}
                    <Text style={styles.unit}> m/s²</Text>
                  </Text>
                </View>
                <ComfortPill wrms={wrms} label={comfortLabel(classifyComfort(wrms))} />
              </View>

              <ComfortShareBar share={s.comfortShare} height={8} />

              <View style={styles.footer}>
                <Text style={styles.footerItem}>{fmtKm(s.distanceM)} km</Text>
                <View style={styles.footerDot} />
                <Text style={styles.footerItem}>{fmtDuration(s.durationS)}</Text>
                <View style={styles.footerDot} />
                <Text style={styles.footerItem}>{s.segmentCount ?? '--'} {t('common.segments').toLowerCase()}</Text>
                {meta.markCount ? (
                  <>
                    <View style={styles.footerDot} />
                    <Text style={styles.footerItem}>📍 {meta.markCount}</Text>
                  </>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <RenameModal
        visible={!!renaming}
        initialName={renaming ? tripDisplayName(renaming, t, lang) : ''}
        onCancel={() => setRenaming(null)}
        onSave={async (name) => {
          const id = renaming.id;
          setRenaming(null);
          await patchTrip(id, { name });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slots: { flexDirection: 'row', gap: 6, marginTop: 10, paddingHorizontal: 2 },
  slot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: COLORS.divider },
  slotUsed: { backgroundColor: COLORS.primary },
  tiles: { marginTop: 14 },
  compareBtn: { marginTop: 12 },

  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOW.sm,
  },
  cardSelected: { borderColor: COLORS.primary },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardHeadText: { flex: 1 },
  vehicleBadge: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  vehicleGlyph: { fontSize: 22 },
  name: { fontSize: 15, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  meta: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontWeight: '600', fontVariant: ['tabular-nums'] },
  moreBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  more: { fontSize: 22, color: COLORS.textMuted, fontWeight: '700' },

  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 10,
  },
  valueLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 1.2 },
  value: { fontSize: 26, fontWeight: '800', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 0 },

  footer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginTop: 10 },
  footerItem: { fontSize: 11, color: COLORS.textMuted, fontWeight: '700', fontVariant: ['tabular-nums'] },
  footerDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: COLORS.textMuted, marginHorizontal: 7, opacity: 0.6 },

  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkMark: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },

  empty: {
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingVertical: 32,
    paddingHorizontal: 24,
    marginTop: 18,
    ...SHADOW.sm,
  },
  emptyLogo: { width: 92, height: 92, marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  emptyHint: { fontSize: 12, color: COLORS.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 18 },
});
