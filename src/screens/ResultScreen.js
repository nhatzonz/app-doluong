import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, FlatList, ScrollView, StyleSheet, Alert,
} from 'react-native';
import { useMeasurementContext } from '../context/MeasurementContext';
import { exportCSV } from '../services/csvExport';
import { analyzeFullTrip } from '../services/api';
import { COLORS } from '../utils/colors';
import { classifyComfort, getComfortColor } from '../utils/comfortClassifier';

export default function ResultScreen() {
  const { state, dispatch } = useMeasurementContext();
  const { segmentResults, fullAnalysis } = state;
  const [loading, setLoading] = useState(false);

  const avgWRMS = segmentResults.length > 0
    ? segmentResults.reduce((s, r) => s + r.wrms, 0) / segmentResults.length
    : 0;
  const overallComfort = classifyComfort(avgWRMS);
  const overallColor = getComfortColor(avgWRMS);

  const handleExportCSV = async () => {
    if (segmentResults.length === 0) {
      Alert.alert('Chua co du lieu', 'Hay do truoc khi xuat CSV');
      return;
    }
    try {
      await exportCSV(segmentResults);
    } catch (e) {
      Alert.alert('Loi', 'Khong the xuat CSV: ' + e.message);
    }
  };

  const handleMLAnalysis = async () => {
    if (segmentResults.length < 5) {
      Alert.alert('Chua du du lieu', 'Can it nhat 5 segment de phan tich ML');
      return;
    }
    setLoading(true);
    try {
      const result = await analyzeFullTrip(segmentResults);
      dispatch({ type: 'SET_FULL_ANALYSIS', payload: result });
    } catch (e) {
      Alert.alert('Loi', 'Khong ket noi duoc backend: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderSegment = ({ item, index }) => (
    <View style={[styles.row, { borderLeftColor: item.color, borderLeftWidth: 4 }]}>
      <Text style={styles.cell}>#{index + 1}</Text>
      <Text style={[styles.cell, { fontWeight: '700' }]}>{item.wrms.toFixed(3)}</Text>
      <Text style={[styles.cell, { color: item.color, fontSize: 11 }]}>{item.comfort}</Text>
      <Text style={[styles.cell, { fontSize: 10 }]}>
        {item.lat?.toFixed(4)}, {item.lon?.toFixed(4)}
      </Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Ket Qua Do Luong</Text>

      {/* Tong quan */}
      <View style={[styles.summaryCard, { backgroundColor: overallColor }]}>
        <Text style={styles.summaryTitle}>WRMS Trung binh</Text>
        <Text style={styles.summaryValue}>{avgWRMS.toFixed(3)} m/s²</Text>
        <Text style={styles.summaryComfort}>{overallComfort}</Text>
        <Text style={styles.summaryDetail}>
          {segmentResults.length} segments
        </Text>
      </View>

      {/* ML Result */}
      {fullAnalysis && (
        <View style={styles.mlCard}>
          <Text style={styles.mlTitle}>Ket qua ML (RandomForest)</Text>
          <Text style={styles.mlValue}>R² = {fullAnalysis.r2_score?.toFixed(3)}</Text>
          {fullAnalysis.feature_importances && (
            <Text style={styles.mlDetail}>
              Feature Importance: Mean={fullAnalysis.feature_importances.mean?.toFixed(2)},
              STD={fullAnalysis.feature_importances.std?.toFixed(2)},
              Peak={fullAnalysis.feature_importances.peak?.toFixed(2)}
            </Text>
          )}
        </View>
      )}

      {/* Nut chuc nang */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportCSV}>
          <Text style={styles.btnText}>Xuat CSV</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mlBtn, loading && { opacity: 0.5 }]}
          onPress={handleMLAnalysis}
          disabled={loading}
        >
          <Text style={styles.btnText}>
            {loading ? 'Dang phan tich...' : 'Phan tich ML'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bang segment */}
      {segmentResults.length > 0 && (
        <View style={styles.tableHeader}>
          <Text style={styles.headerCell}>#</Text>
          <Text style={styles.headerCell}>WRMS</Text>
          <Text style={styles.headerCell}>Comfort</Text>
          <Text style={styles.headerCell}>Toa do</Text>
        </View>
      )}

      {segmentResults.map((item, index) => (
        <View key={index}>
          {renderSegment({ item, index })}
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
    color: COLORS.primaryDark,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    alignItems: 'center',
  },
  summaryTitle: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryValue: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '800',
    marginVertical: 4,
  },
  summaryComfort: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  summaryDetail: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  mlCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  mlTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  mlValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
    marginVertical: 4,
  },
  mlDetail: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  buttonRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 12,
  },
  exportBtn: {
    flex: 1,
    backgroundColor: COLORS.good,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  mlBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: COLORS.border,
    marginHorizontal: 16,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  headerCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.card,
    marginHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cell: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
  },
});
