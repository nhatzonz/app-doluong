import { useEffect, useRef, useCallback } from 'react';
import { useMeasurementContext } from '../context/MeasurementContext';
import { useAccelerometer } from './useAccelerometer';
import { useLocation } from './useLocation';
import { analyzeSegment } from '../services/api';
import { analyzeSegmentLocal, calculateDynamicResultant } from '../services/wrmsCalculator';
import { classifyComfort, getComfortColor } from '../utils/comfortClassifier';
import { SEGMENT_SIZE, MIN_SEGMENT_SAMPLES, GPS_MAX_AGE_MS, UI_UPDATE_EVERY } from '../utils/constants';
import { log, warn, createRollingStats, diagnoseGravity } from '../utils/logger';

export function useMeasurement() {
  const { state, dispatch } = useMeasurementContext();
  const bufferRef = useRef([]);
  const sampleCountRef = useRef(0);
  const locationRef = useRef(null);
  const segmentSpeedsRef = useRef([]);
  const dispatchRef = useRef(dispatch);
  dispatchRef.current = dispatch;

  // DIAG: rolling stats + gravity check
  const statsRef = useRef(createRollingStats());
  const lastFlushRef = useRef(0);
  const gravityDiagnosedRef = useRef(false);

  const processSegment = useCallback(async (samples, segmentSpeeds) => {
    // Chi gan vi tri khi GPS fix con moi; khong co thi de null (khong gan 0,0)
    const fix = locationRef.current;
    const fresh = fix && (Date.now() - fix.receivedAt) <= GPS_MAX_AGE_MS;
    const speeds = segmentSpeeds.length > 0 ? segmentSpeeds : (fresh ? [fix.speed] : []);
    const avgSpeed = speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : null;
    const loc = fresh
      ? { lat: fix.lat, lon: fix.lon, speed: avgSpeed, altitude: fix.altitude }
      : null;
    const n = samples.length;
    const dur = (samples[n - 1].timestamp - samples[0].timestamp) / 1000;

    // timestamp cua sensor tinh tu luc bat may (khong phai gio thuc) → chi dung
    // de tinh fs. wallTime/wallTimeEnd (epoch ms) dung cho hien thi, CSV, ghep GPS.
    // processSegment duoc goi ngay khi nhan mau cuoi nen Date.now() ≈ thoi diem mau cuoi.
    const wallTimeEnd = Date.now();
    const meta = {
      lat: loc?.lat ?? null,
      lon: loc?.lon ?? null,
      speed: avgSpeed,
      timestamp: samples[0].timestamp,
      wallTime: wallTimeEnd - Math.round(dur * 1000),
      wallTimeEnd,
    };
    log('SEG', `process n=${n} dur=${dur.toFixed(2)}s (${dur > 0 ? ((n - 1) / dur).toFixed(1) : '—'}Hz) | gps=${fresh ? 'yes' : 'NO'}`);

    try {
      const t0 = Date.now();
      const result = await analyzeSegment(
        samples.map(s => ({ ax: s.x, ay: s.y, az: s.z, timestamp: s.timestamp })),
        loc
      );
      log('API', `← backend ok in ${Date.now() - t0}ms | wrms=${result.wrms?.toFixed(4)} aw_z=${result.aw_z?.toFixed(4)} comfort=${result.comfort}`);
      dispatchRef.current({
        type: 'ADD_SEGMENT_RESULT',
        payload: { ...result, ...meta, source: 'backend' },
      });
    } catch (e) {
      warn('API', `✗ backend error: ${e?.message || e}. Fallback → client WRMS`);
      // Fallback: cung thuat toan ISO 2631-1 nhu backend
      const result = analyzeSegmentLocal(samples);
      log('WRMS', `client fallback: wrms=${result.wrms.toFixed(4)} aw_z=${result.aw_z.toFixed(4)}`);
      dispatchRef.current({
        type: 'ADD_SEGMENT_RESULT',
        payload: {
          ...result,
          comfort: classifyComfort(result.wrms),
          color: getComfortColor(result.wrms),
          ...meta,
          source: 'client',
        },
      });
    }
  }, []);

  const handleSample = useCallback((sample) => {
    bufferRef.current.push(sample);
    sampleCountRef.current++;

    // DIAG: feed rolling stats
    const dyn = calculateDynamicResultant(sample.x, sample.y, sample.z);
    statsRef.current.push(sample.x, sample.y, sample.z, dyn);

    const now = Date.now();
    if (now - lastFlushRef.current >= 1000) {
      lastFlushRef.current = now;
      const s = statsRef.current.flush();
      if (s) {
        log('ACCEL', `1s stats: n=${s.n} (${s.hz}Hz) mean=(${s.meanX},${s.meanY},${s.meanZ})g dynRes mean=${s.meanR} rms=${s.rmsR} min=${s.minR} max=${s.maxR}`);

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

    // Cap nhat UI thua (5 lan/giay) — logic do khong phu thuoc vao UI
    if (sampleCountRef.current % UI_UPDATE_EVERY === 0) {
      dispatchRef.current({
        type: 'UPDATE_ACCEL',
        payload: { accel: { x: sample.x, y: sample.y, z: sample.z }, sampleCount: sampleCountRef.current },
      });
      dispatchRef.current({
        type: 'ADD_ACCEL_HISTORY',
        payload: { value: dyn, timestamp: now },
      });
    }

    if (bufferRef.current.length >= SEGMENT_SIZE) {
      const segmentSamples = bufferRef.current;
      const speeds = segmentSpeedsRef.current;
      bufferRef.current = [];
      segmentSpeedsRef.current = [];
      processSegment(segmentSamples, speeds);
    }
  }, [processSegment]);

  const { isAvailable } = useAccelerometer(state.isRecording, handleSample);
  const { location, errorMsg } = useLocation(state.isRecording);

  // Location thay doi cham (1 lan/giay)
  useEffect(() => {
    if (location && state.isRecording) {
      locationRef.current = { ...location, receivedAt: Date.now() };
      segmentSpeedsRef.current.push(location.speed);
      dispatchRef.current({ type: 'UPDATE_LOCATION', payload: location });
    }
  }, [location]);

  const startMeasurement = useCallback(() => {
    bufferRef.current = [];
    sampleCountRef.current = 0;
    segmentSpeedsRef.current = [];
    locationRef.current = null;
    gravityDiagnosedRef.current = false;
    lastFlushRef.current = Date.now();
    statsRef.current = createRollingStats();
    log('REC', '=== START recording ===');
    dispatch({ type: 'START_RECORDING' });
  }, [dispatch]);

  const stopMeasurement = useCallback(() => {
    const leftover = bufferRef.current;
    log('REC', `=== STOP recording === (buffer=${leftover.length} leftover samples)`);
    // Doan cuoi qua ngan thi bo: pho tan so thap khong dang tin
    if (leftover.length >= MIN_SEGMENT_SAMPLES) {
      processSegment(leftover, segmentSpeedsRef.current);
    }
    bufferRef.current = [];
    segmentSpeedsRef.current = [];
    dispatch({ type: 'STOP_RECORDING' });
  }, [dispatch, processSegment]);

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
