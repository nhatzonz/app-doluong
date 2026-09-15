import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useT, LANGUAGES } from '../../i18n';
import { useSettings } from './SettingsContext';
import { useTripStore } from '../trips/TripStoreContext';
import { checkHealthAt } from '../../services/api';
import { COLORS } from '../../utils/colors';
import { ChipSelect, Button, Note } from '../ui/kit';
import { ScreenHeader, SectionHeader, Panel, screenStyles } from '../ui/screen';
import { VEHICLES } from '../measure/setupOptions';

const isValidUrl = (url) => /^https?:\/\/[^\s/]+/i.test(url);

export default function SettingsScreen() {
  const { t } = useT();
  const navigation = useNavigation();
  const { settings, update } = useSettings();
  const { index, maxTrips, removeAll } = useTripStore();
  const [url, setUrl] = useState(settings.apiBaseUrl);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null); // { ok, msg }

  const cleanUrl = url.trim().replace(/\/+$/, '');
  const dirty = cleanUrl !== settings.apiBaseUrl;

  const test = async () => {
    if (!isValidUrl(cleanUrl)) {
      setResult({ ok: false, msg: t('settings.invalidUrl') });
      return;
    }
    setTesting(true);
    setResult(null);
    try {
      await checkHealthAt(cleanUrl);
      setResult({ ok: true, msg: t('settings.testOk') });
    } catch (e) {
      setResult({ ok: false, msg: t('settings.testFail', { msg: e?.message || '' }) });
    } finally {
      setTesting(false);
    }
  };

  const saveUrl = () => {
    if (!isValidUrl(cleanUrl)) {
      setResult({ ok: false, msg: t('settings.invalidUrl') });
      return;
    }
    update({ apiBaseUrl: cleanUrl });
    setUrl(cleanUrl);
    setResult({ ok: true, msg: t('settings.saved') });
  };

  const confirmDeleteAll = () => {
    Alert.alert(t('settings.deleteAll'), t('settings.deleteAllConfirm', { n: index.length }), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: removeAll },
    ]);
  };

  return (
    <View style={screenStyles.root}>
      <ScrollView
        contentContainerStyle={screenStyles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow={t('ui.settings.eyebrow')}
          title={t('settings.title')}
          onBack={() => navigation.goBack()}
        />

        <SectionHeader title={t('settings.language')} style={styles.firstSection} />
        <Panel>
          <ChipSelect
            value={settings.lang}
            onChange={(lang) => update({ lang })}
            options={LANGUAGES.map(l => ({ value: l.code, label: l.label }))}
          />
        </Panel>

        <SectionHeader title={t('settings.server')} />
        <Panel>
          <Text style={styles.inputLabel}>URL</Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            placeholder={t('settings.serverHint')}
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={styles.input}
          />
          <View style={styles.row}>
            <Button title={testing ? '...' : t('settings.test')} variant="ghost" onPress={test} disabled={testing} style={styles.flex} />
            <Button title={t('common.save')} onPress={saveUrl} disabled={!dirty} style={styles.flex} />
          </View>
          {result && <Note tone={result.ok ? 'ok' : 'warn'}>{result.msg}</Note>}
        </Panel>

        <SectionHeader title={t('settings.defaultVehicle')} />
        <Panel>
          <ChipSelect
            value={settings.defaultVehicle}
            onChange={(defaultVehicle) => update({ defaultVehicle })}
            options={VEHICLES.map(v => ({ value: v, label: `${v === 'car' ? '🚗' : '🏍️'} ${t(`vehicle.${v}`)}` }))}
          />
        </Panel>

        <SectionHeader title={t('settings.storage')} meta={`${index.length}/${maxTrips}`} />
        <Panel>
          <View style={styles.slots}>
            {Array.from({ length: maxTrips }).map((_, i) => (
              <View key={i} style={[styles.slot, i < index.length && styles.slotUsed]} />
            ))}
          </View>
          <Text style={[screenStyles.bodyText, styles.storageText]}>
            {t('settings.storageInfo', { n: index.length, max: maxTrips })}
          </Text>
          <Button
            title={t('settings.deleteAll')}
            variant="danger"
            onPress={confirmDeleteAll}
            disabled={index.length === 0}
            style={styles.gap}
          />
        </Panel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  firstSection: { marginTop: 4 },
  inputLabel: { fontSize: 9, color: COLORS.textMuted, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.divider,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  flex: { flex: 1 },
  gap: { marginTop: 14 },
  slots: { flexDirection: 'row', gap: 6 },
  slot: { flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.divider },
  slotUsed: { backgroundColor: COLORS.primary },
  storageText: { marginTop: 10 },
});
