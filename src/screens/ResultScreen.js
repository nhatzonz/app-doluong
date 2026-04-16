import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useMeasurementContext } from '../context/MeasurementContext';
import { exportCSV } from '../services/csvExport';
import { analyzeFullTrip } from '../services/api';
import { COLORS, SHADOW, comfortGradient, comfortSoloColor } from '../utils/colors';
import { classifyComfort } from '../utils/comfortClassifier';

export default function ResultScreen() {
  const { state, dispatch } = useMeasurementContext();
  const { segmentResults, fullAnalysis } = state;
  const [loading, setLoading] = useState(false);

  const avgWRMS = segmentResults.length > 0
    ? segmentResults.reduce((s, r) => s + r.wrms, 0) / segmentResults.length
    : 0;
  const overallComfort = classifyComfort(avgWRMS);
  const [heroFrom, heroTo] = comfortGradient(avgWRMS);

  const minWRMS = segmentResults.length > 0
    ? Math.min(...segmentResults.map(s => s.wrms))
    : 0;
  const maxWRMS = segmentResults.length > 0
    ? Math.max(...segmentResults.map(s => s.wrms))
    : 0;

  const handleExportCSV = async () => {
    if (segmentResults.length === 0) {
      Alert.alert('Chưa có dữ liệu', 'Hãy đo trước khi xuất CSV');
      return;
    }
    try {
      await exportCSV(segmentResults);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể xuất CSV: ' + e.message);
    }
  };

  const handleMLAnalysis = async () => {
    if (segmentResults.length < 5) {
      Alert.alert('Chưa đủ dữ liệu', 'Cần ít nhất 5 segment để phân tích ML');
      return;
    }
    setLoading(true);
    try {
      const result = await analyzeFullTrip(segmentResults);
      dispatch({ type: 'SET_FULL_ANALYSIS', payload: result });
    } catch (e) {
      Alert.alert('Lỗi', 'Không kết nối được backend: ' + e.message);
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
        <Text style={styles.eyebrow}>REPORT</Text>
        <Text style={styles.title}>Kết quả đo</Text>
        <Text style={styles.subtitle}>Tổng hợp & phân tích tuyến đường</Text>
      </View>

      {/* Hero summary */}
      <LinearGradient
        colors={[heroFrom, heroTo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroLabel}>WRMS TRUNG BÌNH</Text>
        <Text style={styles.heroValue}>{avgWRMS.toFixed(3)}</Text>
        <Text style={styles.heroUnit}>m/s²</Text>

        <View style={styles.heroPill}>
          <Text style={styles.heroPillText}>{overallComfort || '—'}</Text>
        </View>

        <View style={styles.heroStats}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>Segments</Text>
            <Text style={styles.heroStatValue}>{segmentResults.length}</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>Min</Text>
            <Text style={styles.heroStatValue}>{minWRMS.toFixed(2)}</Text>
          </View>
          <View style={styles.heroStatDivider} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>Max</Text>
            <Text style={styles.heroStatValue}>{maxWRMS.toFixed(2)}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ML card */}
      {fullAnalysis && (
        <View style={styles.mlCard}>
          <View style={styles.mlHead}>
            <View style={styles.mlBadge}>
              <Text style={styles.mlBadgeText}>ML</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mlTitle}>RandomForest Analysis</Text>
              <Text style={styles.mlSub}>Coefficient of determination</Text>
            </View>
            <Text style={styles.mlValue}>
              {fullAnalysis.r2_score?.toFixed(3) || '--'}
            </Text>
          </View>
          {fullAnalysis.feature_importances && (
            <View style={styles.mlFeatures}>
              <FeatureBar label="Mean" value={fullAnalysis.feature_importances.mean || 0} />
              <FeatureBar label="STD" value={fullAnalysis.feature_importances.std || 0} />
              <FeatureBar label="Peak" value={fullAnalysis.feature_importances.peak || 0} />
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
          <Text style={styles.actionTitle}>Xuất CSV</Text>
          <Text style={styles.actionHint}>Chia sẻ dữ liệu</Text>
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
            {loading ? 'Đang phân tích...' : 'Phân tích ML'}
          </Text>
          <Text style={styles.actionHint}>
            {loading ? 'Vui lòng đợi' : 'RandomForest'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Segment list */}
      {segmentResults.length > 0 && (
        <>
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Segments</Text>
            <Text style={styles.listCount}>{segmentResults.length}</Text>
          </View>
          <View style={styles.listCard}>
            {segmentResults.map((item, index) => {
              const color = item.color || comfortSoloColor(item.wrms);
              return (
                <View
                  key={index}
                  style={[
                    styles.listRow,
                    index === segmentResults.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={styles.listIndex}>
                    <Text style={styles.listIndexText}>#{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listWRMS}>{item.wrms.toFixed(3)}
                      <Text style={styles.listUnit}> m/s²</Text>
                    </Text>
                    <Text style={styles.listCoord}>
                      {item.lat?.toFixed(4) || '--'}, {item.lon?.toFixed(4) || '--'}
                    </Text>
                  </View>
                  <View style={[styles.comfortPill, { backgroundColor: color + '1A', borderColor: color + '33' }]}>
                    <View style={[styles.comfortDot, { backgroundColor: color }]} />
                    <Text style={[styles.comfortText, { color }]}>{item.comfort}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}

      {segmentResults.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Chưa có dữ liệu đo.</Text>
          <Text style={styles.emptyHint}>Mở tab Đo lường và bấm START để bắt đầu.</Text>
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
