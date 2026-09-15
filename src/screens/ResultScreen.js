import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMeasurementContext } from '../context/MeasurementContext';
import { exportCSV } from '../services/csvExport';
import { analyzeFullTrip } from '../services/api';
import { COLORS, SHADOW, comfortGradient, comfortSoloColor } from '../utils/colors';
import { classifyComfort } from '../utils/comfortClassifier';
import { energyAverageWRMS } from '../services/wrmsCalculator';
import { MIN_ISO_DURATION_SEC } from '../utils/constants';
import { useNavigation } from '@react-navigation/native';
import { useT } from '../i18n';
import { useTripStore } from '../features/trips/TripStoreContext';
import { tripIdFor } from '../features/trips/tripStorage';
import { wrmsBreakdown, SHOCK_WRMS } from '../features/analytics/tripMath';

const ML_MIN_SEGMENTS = 23; // khop backend: LAGS + MIN_TRAIN + MIN_TEST
// Canh bao khi cac doan soc chiem qua nua nang luong rung cua WRMS tong
const SHOCK_DOMINANCE = 0.5;

// The truc tiep khi dang do: doan moi nhat + dong ho "cap nhat X giay truoc"
function LiveCard({ segments, t, comfortLabel }) {
  const latest = segments[segments.length - 1];
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick(x => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!latest) {
    return (
      <View style={styles.liveCard}>
        <View style={styles.liveHead}>
          <View style={styles.liveDot} />
          <Text style={styles.liveLabel}>{t('results.live')}</Text>
        </View>
        <Text style={styles.liveWaiting}>{t('results.waitingFirst')}</Text>
      </View>
    );
  }
  const color = latest.color || comfortSoloColor(latest.wrms);
  const ago = latest.wallTimeEnd ? Math.max(0, Math.round((Date.now() - latest.wallTimeEnd) / 1000)) : null;
  return (
    <View style={styles.liveCard}>
      <View style={styles.liveHead}>
        <View style={styles.liveDot} />
        <Text style={styles.liveLabel}>{t('results.live')}</Text>
        <Text style={styles.liveMeta}>
          {t('results.latestSegment', { n: segments.length })}
          {ago != null ? ` · ${t('results.updatedAgo', { s: ago })}` : ''}
        </Text>
      </View>
      <View style={styles.liveRow}>
        <Text style={[styles.liveValue, { color }]}>
          {latest.wrms.toFixed(3)} <Text style={styles.listUnit}>m/s²</Text>
        </Text>
        <View style={[styles.comfortPill, { backgroundColor: color + '1A', borderColor: color + '33' }]}>
          <View style={[styles.comfortDot, { backgroundColor: color }]} />
          <Text style={[styles.comfortText, { color }]}>{comfortLabel(latest.comfort)}</Text>
        </View>
      </View>
      {Number.isFinite(latest.aw_z) && (
        <Text style={styles.listCoord}>
          aw_z {latest.aw_z.toFixed(3)} · aw_xy {Number.isFinite(latest.aw_xy) ? latest.aw_xy.toFixed(3) : '--'}
          {latest.speed != null ? ` · ${(latest.speed * 3.6).toFixed(0)} km/h` : ''}
        </Text>
      )}
    </View>
  );
}

// Danh sach chi render lai khi segmentResults doi (2s/lan), khong theo cac
// cap nhat gia toc 10 lan/giay cua context. Dang do → doan moi nhat o tren.
const SegmentList = memo(function SegmentList({ segments, newestFirst, t, comfortLabel }) {
  const order = newestFirst
    ? segments.map((_, i) => segments.length - 1 - i)
    : segments.map((_, i) => i);
  return (
    <>
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>{t('results.list')}</Text>
        <Text style={styles.listCount}>
          {segments.length}{newestFirst ? ` · ${t('results.newestFirst')}` : ''}
        </Text>
      </View>
      <View style={styles.listCard}>
        {order.map((index, pos) => {
          const item = segments[index];
          const color = item.color || comfortSoloColor(item.wrms);
          return (
            <View
              key={index}
              style={[styles.listRow, pos === order.length - 1 && { borderBottomWidth: 0 }]}
            >
              <View style={styles.listIndex}>
                <Text style={styles.listIndexText}>#{index + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listWRMS}>{item.wrms.toFixed(3)}
                  <Text style={styles.listUnit}> m/s²</Text>
                </Text>
                <Text style={styles.listCoord}>
                  {item.lat != null ? `${item.lat.toFixed(4)}, ${item.lon.toFixed(4)}` : t('common.noGps')}
                  {item.speed != null ? ` · ${(item.speed * 3.6).toFixed(0)} km/h` : ''}
                  {item.source === 'client' ? ` · ${t('common.offline')}` : ''}
                </Text>
              </View>
              <View style={[styles.comfortPill, { backgroundColor: color + '1A', borderColor: color + '33' }]}>
                <View style={[styles.comfortDot, { backgroundColor: color }]} />
                <Text style={[styles.comfortText, { color }]}>{comfortLabel(item.comfort)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </>
  );
});

export default function ResultScreen() {
  const { state, dispatch } = useMeasurementContext();
  const { segmentResults, fullAnalysis } = state;
  const [loading, setLoading] = useState(false);
  const { t, comfortLabel } = useT();
  const navigation = useNavigation();
  const { index: tripIndex, lastSave, minSegments } = useTripStore();

  // Chuyen hien tai da duoc TripAutoSaver luu chua?
  const currentTripId = state.startTime ? tripIdFor(state.startTime) : null;
  const savedTrip = !state.isRecording && currentTripId && tripIndex.some(m => m.id === currentTripId);
  const skippedSave = !state.isRecording && lastSave?.skipped && lastSave.startedAt === state.startTime;

  // RMS theo nang luong (trong so thoi luong) — khong phai trung binh cong
  const avgWRMS = energyAverageWRMS(segmentResults);
  const totalDuration = segmentResults.reduce((s, r) => s + (r.duration || 2), 0);
  const clientCount = segmentResults.filter(r => r.source === 'client').length;
  const overallComfort = classifyComfort(avgWRMS);
  const [heroFrom, heroTo] = comfortGradient(avgWRMS);

  // Chi tinh lai khi co doan moi (khong theo cap nhat gia toc 10 lan/giay)
  const breakdown = useMemo(() => wrmsBreakdown(segmentResults), [segmentResults]);
  const comfortableShare = useMemo(() => {
    if (segmentResults.length === 0) return 0;
    const calm = segmentResults.filter(s => s.wrms < 0.315).reduce((a, s) => a + (s.duration || 2), 0);
    return calm / totalDuration;
  }, [segmentResults, totalDuration]);
  const shockDominated = breakdown.shockCount > 0 && breakdown.shockEnergyShare > SHOCK_DOMINANCE;

  const handleExportCSV = async () => {
    if (segmentResults.length === 0) {
      Alert.alert(t('common.noData'), t('results.noDataExport'));
      return;
    }
    try {
      await exportCSV(segmentResults);
    } catch (e) {
      Alert.alert(t('common.error'), t('results.exportFailed', { msg: e.message }));
    }
  };

  const handleMLAnalysis = async () => {
    if (segmentResults.length < ML_MIN_SEGMENTS) {
      Alert.alert(t('common.noData'), t('results.mlNeed', { n: ML_MIN_SEGMENTS }));
      return;
    }
    setLoading(true);
    try {
      const result = await analyzeFullTrip(segmentResults);
      dispatch({ type: 'SET_FULL_ANALYSIS', payload: result });
    } catch (e) {
      Alert.alert(t('common.error'), t('results.backendFailed', { msg: e.message }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerBlock}>
        <Text style={styles.eyebrow}>{t('results.eyebrow')}</Text>
        <Text style={styles.title}>{t('results.title')}</Text>
        <Text style={styles.subtitle}>{t('results.subtitle')}</Text>
      </View>

      {state.isRecording && (
        <LiveCard segments={segmentResults} t={t} comfortLabel={comfortLabel} />
      )}

      {/* Hero summary */}
      <LinearGradient
        colors={[heroFrom, heroTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroLabel}>{t('results.total')}</Text>
        <Text style={styles.heroValue}>{avgWRMS.toFixed(3)}</Text>
        <Text style={styles.heroUnit}>m/s²</Text>

        <View style={styles.heroPill}>
          <Text style={styles.heroPillText}>{comfortLabel(overallComfort) || '—'}</Text>
        </View>

        {segmentResults.length > 0 && (
          <Text style={styles.heroNote}>
            {t('results.duration', { s: Math.round(totalDuration) })}
            {totalDuration < MIN_ISO_DURATION_SEC ? ` · ${t('results.tooShort')}` : ''}
            {clientCount > 0 ? ` · ${t('results.offlineCount', { n: clientCount })}` : ''}
          </Text>
        )}

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>{t('common.segments')}</Text>
            <Text style={styles.heroStatValue}>{segmentResults.length}</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>{t('results.median')}</Text>
            <Text style={styles.heroStatValue}>{breakdown.median != null ? breakdown.median.toFixed(3) : '--'}</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>{t('results.comfortableShare')}</Text>
            <Text style={styles.heroStatValue}>{segmentResults.length ? `${Math.round(comfortableShare * 100)}%` : '--'}</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>{t('results.max')}</Text>
            <Text style={styles.heroStatValue}>{breakdown.max != null ? breakdown.max.toFixed(2) : '--'}</Text>
          </View>
        </View>
      </LinearGradient>

      {shockDominated && (
        <View style={styles.shockNote}>
          <Text style={styles.shockText}>
            {t('results.shockNote', {
              n: breakdown.shockCount,
              limit: SHOCK_WRMS,
              p: Math.round(breakdown.shockEnergyShare * 100),
              w: breakdown.wrmsWithoutShocks != null ? breakdown.wrmsWithoutShocks.toFixed(3) : '--',
              c: breakdown.wrmsWithoutShocks != null ? comfortLabel(classifyComfort(breakdown.wrmsWithoutShocks)) : '--',
            })}
          </Text>
        </View>
      )}

      {savedTrip && (
        <TouchableOpacity
          style={styles.tripLink}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('TripDetail', { id: currentTripId })}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.actionTitle}>{t('results.viewTrip')}</Text>
            <Text style={styles.actionHint}>{t('results.viewTripHint')}</Text>
          </View>
          <Text style={styles.tripLinkArrow}>›</Text>
        </TouchableOpacity>
      )}
      {skippedSave && segmentResults.length > 0 && (
        <Text style={styles.notSaved}>{t('results.notSaved', { n: minSegments })}</Text>
      )}

      {/* ML card */}
      {fullAnalysis && (
        <View style={styles.mlCard}>
          <View style={styles.mlHead}>
            <View style={styles.mlBadge}>
              <Text style={styles.mlBadgeText}>ML</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mlTitle}>{t('results.mlTitle')}</Text>
              <Text style={styles.mlSub}>
                {t('results.mlSub', { b: fullAnalysis.baseline_r2 != null ? fullAnalysis.baseline_r2.toFixed(3) : '--' })}
              </Text>
            </View>
            <Text style={styles.mlValue}>
              {fullAnalysis.r2_score != null ? fullAnalysis.r2_score.toFixed(3) : '--'}
            </Text>
          </View>
          {!!fullAnalysis.note && (
            <Text style={styles.mlNote}>{fullAnalysis.note}</Text>
          )}
          {fullAnalysis.feature_importances && Object.keys(fullAnalysis.feature_importances).length > 0 && (
            <View style={styles.mlFeatures}>
              <FeatureBar label="Mean" value={fullAnalysis.feature_importances.mean || 0} />
              <FeatureBar label="STD" value={fullAnalysis.feature_importances.std || 0} />
              <FeatureBar label="Peak" value={fullAnalysis.feature_importances.peak || 0} />
              <FeatureBar label="Speed" value={fullAnalysis.feature_importances.speed || 0} />
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionCard}
          activeOpacity={0.85}
          onPress={handleExportCSV}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
            <Text style={styles.actionIconText}>CSV</Text>
          </View>
          <Text style={styles.actionTitle}>{t('results.exportCsv')}</Text>
          <Text style={styles.actionHint}>{t('results.exportCsvHint')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, loading && { opacity: 0.5 }]}
          activeOpacity={0.85}
          disabled={loading}
          onPress={handleMLAnalysis}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}>
            <Text style={[styles.actionIconText, { color: COLORS.primary }]}>ML</Text>
          </View>
          <Text style={styles.actionTitle}>
            {loading ? t('results.mlLoading') : t('results.ml')}
          </Text>
          <Text style={styles.actionHint}>
            {loading ? t('results.mlWait') : t('results.mlHint')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Segment list */}
      {segmentResults.length > 0 && (
        <SegmentList
          segments={segmentResults}
          newestFirst={state.isRecording}
          t={t}
          comfortLabel={comfortLabel}
        />
      )}

      {segmentResults.length === 0 && !state.isRecording && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>{t('results.empty')}</Text>
          <Text style={styles.emptyHint}>{t('results.emptyHint')}</Text>
        </View>
      )}
    </ScrollView>
  );
}

function FeatureBar({ label, value }) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureLabel}>{label}</Text>
      <View style={styles.featureTrack}>
        <View style={[styles.featureFill, { width: `${pct * 100}%` }]} />
      </View>
      <Text style={styles.featureValue}>{(pct * 100).toFixed(0)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  headerBlock: {
    paddingTop: 58,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    color: COLORS.textMuted,
    fontWeight: '700',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    marginTop: 2,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },

  hero: {
    marginHorizontal: 20,
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    ...SHADOW.md,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
  },
  heroValue: {
    color: '#FFFFFF',
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  heroUnit: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: -4,
    letterSpacing: 1,
  },
  heroPill: {
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroNote: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingVertical: 10,
  },
  heroStat: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  heroStatValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  heroStatDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  liveCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.bad + '33',
    ...SHADOW.sm,
  },
  liveHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.bad },
  liveLabel: { fontSize: 11, fontWeight: '800', color: COLORS.bad, letterSpacing: 1 },
  liveMeta: { flex: 1, textAlign: 'right', fontSize: 11, color: COLORS.textMuted, fontWeight: '600' },
  liveRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  liveValue: { fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: -0.5 },
  liveWaiting: { fontSize: 13, color: COLORS.textMuted, marginTop: 6, fontWeight: '600' },
  shockNote: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  shockText: { fontSize: 12, color: '#92400E', fontWeight: '600', lineHeight: 17 },
  tripLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    marginHorizontal: 20,
    marginTop: 14,
    padding: 16,
    ...SHADOW.sm,
  },
  tripLinkArrow: {
    fontSize: 28,
    color: COLORS.textMuted,
    fontWeight: '300',
  },
  notSaved: {
    marginHorizontal: 20,
    marginTop: 12,
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
    textAlign: 'center',
  },
  mlCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 14,
    padding: 16,
    ...SHADOW.sm,
  },
  mlHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mlBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mlBadgeText: {
    color: COLORS.primary,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  mlTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  mlSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  mlValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  mlNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 10,
    fontWeight: '600',
  },
  mlFeatures: {
    marginTop: 12,
    gap: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureLabel: {
    width: 44,
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  featureTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.surfaceMuted,
    overflow: 'hidden',
  },
  featureFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  featureValue: {
    width: 40,
    textAlign: 'right',
    fontSize: 11,
    color: COLORS.text,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 14,
  },
  actionCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    ...SHADOW.sm,
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  actionIconText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.good,
    letterSpacing: 0.5,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
  },
  actionHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },

  listHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  listCount: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
  },
  listCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    borderRadius: 18,
    overflow: 'hidden',
    ...SHADOW.sm,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  listIndex: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listIndexText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textMuted,
  },
  listWRMS: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.text,
    fontVariant: ['tabular-nums'],
  },
  listUnit: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  listCoord: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  comfortPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: 130,
  },
  comfortDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  comfortText: {
    fontSize: 10,
    fontWeight: '700',
  },

  empty: {
    alignItems: 'center',
    marginTop: 30,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '700',
  },
  emptyHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
