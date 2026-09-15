import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Polygon, Circle, Text as SvgText } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useT } from '../../i18n';
import { COLORS } from '../../utils/colors';
import { getComfortColor } from '../../utils/comfortClassifier';
import { COMFORT_CODES, COMFORT_THRESHOLDS } from '../analytics/tripMath';
import { Note } from '../ui/kit';
import { ScreenHeader, SectionHeader, Panel, screenStyles } from '../ui/screen';

// Giu it nhat 1 chu so thap phan (1 → "1.0") cho dong bo voi chu thich ban do
const num = (v) => (Number.isInteger(v) ? v.toFixed(1) : String(v));
const rangeText = (i) => (i === COMFORT_THRESHOLDS.length - 1
  ? `> ${num(COMFORT_THRESHOLDS[i])}`
  : i === 0 ? `< ${num(COMFORT_THRESHOLDS[1])}` : `${num(COMFORT_THRESHOLDS[i])} – ${num(COMFORT_THRESHOLDS[i + 1])}`);

const AXIS_COLORS = { x: '#2E8BFF', y: '#8B5CF6', z: '#EC4899' }; // trung mau the aX/aY/aZ o man Do

// So do 3 truc gan voi than may (dien thoai dung, man hinh huong ve nguoi xem)
function PhoneAxesDiagram() {
  return (
    <Svg width={220} height={170}>
      <Rect x={70} y={30} width={70} height={125} rx={12} fill="#FFFFFF" stroke={COLORS.text} strokeWidth={2} />
      <Rect x={78} y={42} width={54} height={98} rx={4} fill={COLORS.surfaceMuted} />
      {/* Y: len dinh may */}
      <Line x1={105} y1={92} x2={105} y2={14} stroke={AXIS_COLORS.y} strokeWidth={3} />
      <Polygon points="105,4 99,16 111,16" fill={AXIS_COLORS.y} />
      <SvgText x={116} y={16} fontSize={14} fontWeight="bold" fill={AXIS_COLORS.y}>Y</SvgText>
      {/* X: sang phai */}
      <Line x1={105} y1={92} x2={190} y2={92} stroke={AXIS_COLORS.x} strokeWidth={3} />
      <Polygon points="200,92 188,86 188,98" fill={AXIS_COLORS.x} />
      <SvgText x={196} y={80} fontSize={14} fontWeight="bold" fill={AXIS_COLORS.x}>X</SvgText>
      {/* Z: huong ra phia nguoi xem (⊙) */}
      <Circle cx={105} cy={92} r={9} fill="#FFFFFF" stroke={AXIS_COLORS.z} strokeWidth={3} />
      <Circle cx={105} cy={92} r={3} fill={AXIS_COLORS.z} />
      <SvgText x={40} y={110} fontSize={14} fontWeight="bold" fill={AXIS_COLORS.z}>Z ⊙</SvgText>
    </Svg>
  );
}

const POSES = [
  { key: 'guide.poseFlat', values: ['≈ 0', '≈ 0', '≈ −9.8'], hot: 2 },
  { key: 'guide.poseUpright', values: ['≈ 0', '≈ −9.8', '≈ 0'], hot: 1 },
  { key: 'guide.poseSide', values: ['≈ ±9.8', '≈ 0', '≈ 0'], hot: 0 },
];
const AXIS_ORDER = ['x', 'y', 'z'];

export default function IsoGuideScreen() {
  const { t, comfortLabel } = useT();
  const navigation = useNavigation();

  return (
    <View style={screenStyles.root}>
      <ScrollView contentContainerStyle={screenStyles.scroll} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow={t('ui.guide.eyebrow')}
          title={t('guide.title')}
          onBack={() => navigation.goBack()}
        />

        <SectionHeader title={t('guide.whatTitle')} style={styles.firstSection} />
        <Panel>
          <Text style={screenStyles.bodyText}>{t('guide.whatBody')}</Text>
        </Panel>

        <SectionHeader title={t('guide.levelsTitle')} meta="m/s²" />
        <Panel flush>
          {COMFORT_CODES.map((code, i) => {
            const color = getComfortColor(COMFORT_THRESHOLDS[i]);
            return (
              <View key={code} style={[styles.level, i === COMFORT_CODES.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={[styles.swatch, { backgroundColor: color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.levelName}>{comfortLabel(code)}</Text>
                  <Text style={styles.levelHint}>{t(`guide.levelExamples.${code}`)}</Text>
                </View>
                <View style={[styles.rangePill, { backgroundColor: color + '14', borderColor: color + '33' }]}>
                  <Text style={[styles.range, { color }]}>{rangeText(i)}</Text>
                </View>
              </View>
            );
          })}
        </Panel>

        <SectionHeader title={t('guide.axesTitle')} />
        <Panel>
          <Text style={screenStyles.bodyText}>{t('guide.axesIntro')}</Text>
          <View style={styles.diagram}><PhoneAxesDiagram /></View>
          {['axisX', 'axisY', 'axisZ'].map((k, i) => (
            <View key={k} style={styles.axisRow}>
              <View style={[styles.axisDot, { backgroundColor: AXIS_COLORS[AXIS_ORDER[i]] }]} />
              <Text style={[screenStyles.bodyText, { flex: 1 }]}>{t(`guide.${k}`)}</Text>
            </View>
          ))}

          <Text style={styles.subTitle}>{t('guide.axesGravityTitle')}</Text>
          <Text style={screenStyles.bodyText}>{t('guide.axesGravityBody')}</Text>
          <View style={styles.table}>
            <View style={[styles.tr, styles.thRow]}>
              <Text style={[styles.td, styles.tdPose, styles.th]}>{t('guide.posePose')}</Text>
              {AXIS_ORDER.map(a => (
                <Text key={a} style={[styles.td, styles.th, { color: AXIS_COLORS[a] }]}>a{a.toUpperCase()}</Text>
              ))}
            </View>
            {POSES.map((p, r) => (
              <View key={p.key} style={[styles.tr, r === POSES.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={[styles.td, styles.tdPose]}>{t(p.key)}</Text>
                {p.values.map((v, i) => (
                  <Text key={i} style={[styles.td, i === p.hot && styles.tdHot]}>{v}</Text>
                ))}
              </View>
            ))}
          </View>
          <Note>{t('guide.axesExample')}</Note>
          <Note tone="ok">{t('guide.axesUsage')}</Note>
        </Panel>

        <SectionHeader title={t('guide.mountTitle')} />
        <Panel>
          <View style={styles.mountRow}>
            <View style={styles.mountIcon}><Text style={styles.mountGlyph}>🚗</Text></View>
            <Text style={[screenStyles.bodyText, { flex: 1 }]}>{t('guide.mountCar')}</Text>
          </View>
          <View style={[styles.mountRow, styles.gap]}>
            <View style={styles.mountIcon}><Text style={styles.mountGlyph}>🏍️</Text></View>
            <Text style={[screenStyles.bodyText, { flex: 1 }]}>{t('guide.mountBike')}</Text>
          </View>
          <Note tone="warn">{t('guide.bikeNote')}</Note>
        </Panel>

        <SectionHeader title={t('guide.speedTitle')} />
        <Panel>
          <Text style={screenStyles.bodyText}>{t('guide.speedBody')}</Text>
        </Panel>

        <SectionHeader title={t('guide.limitsTitle')} />
        <Panel>
          <Text style={screenStyles.bodyText}>{t('guide.limitsBody')}</Text>
          <Note tone="warn">{t('guide.walkNote')}</Note>
        </Panel>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  firstSection: { marginTop: 4 },
  level: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  swatch: { width: 6, height: 34, borderRadius: 3 },
  levelName: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  levelHint: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },
  rangePill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  range: { fontSize: 11, fontWeight: '800', fontVariant: ['tabular-nums'] },
  gap: { marginTop: 10 },
  diagram: { alignItems: 'center', marginVertical: 8 },
  axisRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  axisDot: { width: 10, height: 10, borderRadius: 5 },
  subTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text, marginTop: 16, marginBottom: 4 },
  table: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.divider },
  thRow: { backgroundColor: COLORS.surfaceMuted },
  td: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    fontSize: 12,
    color: COLORS.text,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  tdPose: { flex: 1.6, textAlign: 'left', fontWeight: '600' },
  th: { fontWeight: '800', fontSize: 11 },
  tdHot: { fontWeight: '800', color: COLORS.bad },
  mountRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mountIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mountGlyph: { fontSize: 20 },
});
