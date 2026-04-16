import { useEffect, useRef, useCallback } from 'react';
import { useMeasurementContext } from '../context/MeasurementContext';
import { useAccelerometer } from './useAccelerometer';
import { useLocation } from './useLocation';
import { analyzeSegment } from '../services/api';
import { calculateSegmentWRMS, calculateDynamicResultant } from '../services/wrmsCalculator';
import { classifyComfort, getComfortColor } from '../utils/comfortClassifier';
import { SEGMENT_SIZE } from '../utils/constants';
import { log, warn, createRollingStats, diagnoseGravity } from '../utils/logger';

export function useMeasurement() {
  const { state, dispatch } = useMeasurementContext();
  const bufferRef = useRef([]);
  const locationRef = useRef(null);
  const isRecordingRef = useRef(false);
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  const { data: accelData, isAvailable } = useAccelerometer(state.isRecording);
  const { location, errorMsg } = useLocation(state.isRecording);

  // Sync refs
  isRecordingRef.current = state.isRecording;

  // Cap nhat location vao ref + context (location thay doi cham, 1 lan/giay)
  useEffect(() => {
    if (location && isRecordingRef.current) {
      locationRef.current = location;
      dispatchRef.current({ type: 'UPDATE_LOCATION', payload: location });
    }
  }, [location]);

  // Xu ly accelerometer data - dung ref de tranh re-render loop
  const accelRef = useRef({ x: 0, y: 0, z: 0 });
  const prevTimestampRef = useRef(0);

  // DIAG: rolling stats + gravity check
  const statsRef = useRef(createRollingStats());
  const lastFlushRef = useRef(0);
  const gravityDiagnosedRef = useRef(false);

  useEffect(() => {
    if (!isRecordingRef.current) return;

    const now = Date.now();
    prevTimestampRef.current = now;

    accelRef.current = accelData;

    const sample = { x: accelData.x, y: accelData.y, z: accelData.z, timestamp: now };
    bufferRef.current.push(sample);

    // DIAG: feed rolling stats — dynRes da la gia toc dong (tru trong luc)
    const dyn = calculateDynamicResultant(accelData.x, accelData.y, accelData.z);
    statsRef.current.push(accelData.x, accelData.y, accelData.z, dyn);

    // DIAG: flush stats every 1s
    if (now - lastFlushRef.current >= 1000) {
      lastFlushRef.current = now;
      const s = statsRef.current.flush();
      if (s) {
        log('ACCEL', `1s stats: n=${s.n} (${s.hz}Hz) mean=(${s.meanX},${s.meanY},${s.meanZ}) dynRes mean=${s.meanR} rms=${s.rmsR} min=${s.minR} max=${s.maxR}`);

        // DIAG: one-time gravity diagnosis after first full second
        if (!gravityDiagnosedRef.current) {
          gravityDiagnosedRef.current = true;
          const d = diagnoseGravity(
            parseFloat(s.meanX), parseFloat(s.meanY), parseFloat(s.meanZ)
          );
          log('DIAG', `trục trọng lực: ${d.axis} (|mean|=${d.magnitude.toFixed(3)})`);
          log('DIAG', `unit: ${d.unit}`);
          log('DIAG', `${d.orient}`);
          log('DIAG', `verdict: ${d.verdict}`);
        }
      }
    }

    // Cap nhat UI moi 10 mau (5 lan/giay thay vi 50)
    if (bufferRef.current.length % 10 === 0) {
      dispatchRef.current({ type: 'UPDATE_ACCEL', payload: accelData });

      // Gia toc dong (da tru trong luc) de hien thi dung tren bieu do
      const resultant = calculateDynamicResultant(accelData.x, accelData.y, accelData.z);
      dispatchRef.current({
        type: 'ADD_ACCEL_HISTORY',
        payload: { value: resultant, timestamp: now },
      });
    }

    // Khi du 1 segment (100 mau) -> gui len backend
    if (bufferRef.current.length >= SEGMENT_SIZE) {
      const segmentSamples = [...bufferRef.current];
      bufferRef.current = [];
      processSegment(segmentSamples, locationRef.current);
    }
  }, [accelData.x, accelData.y, accelData.z]);

  const processSegment = async (samples, currentLoc) => {
    const loc = currentLoc || { lat: 0, lon: 0, speed: 0, altitude: 0 };

    // DIAG: segment summary
    const n = samples.length;
    const dur = n > 1 ? (samples[n - 1].timestamp - samples[0].timestamp) / 1000 : 0;
    const hz = dur > 0 ? (n / dur).toFixed(1) : '—';
    log('SEG', `process n=${n} dur=${dur.toFixed(2)}s (${hz}Hz) | gpsLoc=${currentLoc ? 'yes' : 'NO (fallback 0,0)'}`);

    try {
      const t0 = Date.now();
      const result = await analyzeSegment(
        samples.map(s => ({ ax: s.x, ay: s.y, az: s.z, timestamp: s.timestamp })),
        loc
      );
      log('API', `← backend ok in ${Date.now() - t0}ms | wrms=${result.wrms?.toFixed(4)} comfort=${result.comfort}`);
      dispatchRef.current({
        type: 'ADD_SEGMENT_RESULT',
        payload: { ...result, lat: loc.lat, lon: loc.lon, speed: loc.speed },
      });
    } catch (e) {
      warn('API', `✗ backend error: ${e?.message || e}. Fallback → client WRMS`);
      // Fallback: tinh WRMS phia client
      const wrms = calculateSegmentWRMS(samples);
      const comfort = classifyComfort(wrms);
      const color = getComfortColor(wrms);
      log('WRMS', `client fallback: wrms=${wrms.toFixed(4)} comfort=${comfort}`);
      dispatchRef.current({
        type: 'ADD_SEGMENT_RESULT',
        payload: { wrms, comfort, color, lat: loc.lat, lon: loc.lon, speed: loc.speed },
      });
    }
  };

  const startMeasurement = useCallback(() => {
    bufferRef.current = [];
    locationRef.current = null;
    gravityDiagnosedRef.current = false;
    lastFlushRef.current = Date.now();
    statsRef.current = createRollingStats();
    log('REC', '=== START recording ===');
    dispatch({ type: 'START_RECORDING' });
  }, [dispatch]);

  const stopMeasurement = useCallback(() => {
    log('REC', `=== STOP recording === (buffer=${bufferRef.current.length} leftover samples)`);
    if (bufferRef.current.length > 0) {
      processSegment([...bufferRef.current], locationRef.current);
      bufferRef.current = [];
    }
    dispatch({ type: 'STOP_RECORDING' });
  }, [dispatch]);

  return {
    isRecording: state.isRecording,
    currentAccel: state.currentAccel,
    currentLocation: state.currentLocation,
    currentWRMS: state.currentWRMS,
    currentComfort: state.currentComfort,
    segmentResults: state.segmentResults,
    sampleCount: state.sampleCount,
    startTime: state.startTime,
    isAvailable,
    locationError: errorMsg,
    startMeasurement,
    stopMeasurement,
  };
}
