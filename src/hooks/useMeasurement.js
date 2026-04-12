import { useEffect, useRef, useCallback } from 'react';
import { useMeasurementContext } from '../context/MeasurementContext';
import { useAccelerometer } from './useAccelerometer';
import { useLocation } from './useLocation';
import { analyzeSegment } from '../services/api';
import { calculateSegmentWRMS } from '../services/wrmsCalculator';
import { classifyComfort, getComfortColor } from '../utils/comfortClassifier';
import { SEGMENT_SIZE } from '../utils/constants';

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

  useEffect(() => {
    if (!isRecordingRef.current) return;

    // Chi xu ly khi data thuc su thay doi
    const now = Date.now();
    if (now - prevTimestampRef.current < 15) return; // throttle ~50Hz
    prevTimestampRef.current = now;

    accelRef.current = accelData;

    const sample = { x: accelData.x, y: accelData.y, z: accelData.z, timestamp: now };
    bufferRef.current.push(sample);

    // Cap nhat UI moi 10 mau (5 lan/giay thay vi 50)
    if (bufferRef.current.length % 10 === 0) {
      dispatchRef.current({ type: 'UPDATE_ACCEL', payload: accelData });

      const resultant = Math.sqrt(
        accelData.x ** 2 + accelData.y ** 2 + accelData.z ** 2
      );
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

    try {
      const result = await analyzeSegment(
        samples.map(s => ({ ax: s.x, ay: s.y, az: s.z, timestamp: s.timestamp })),
        loc
      );
      dispatchRef.current({
        type: 'ADD_SEGMENT_RESULT',
        payload: { ...result, lat: loc.lat, lon: loc.lon, speed: loc.speed },
      });
    } catch {
      // Fallback: tinh WRMS phia client
      const wrms = calculateSegmentWRMS(samples);
      const comfort = classifyComfort(wrms);
      const color = getComfortColor(wrms);
      dispatchRef.current({
        type: 'ADD_SEGMENT_RESULT',
        payload: { wrms, comfort, color, lat: loc.lat, lon: loc.lon, speed: loc.speed },
      });
    }
  };

  const startMeasurement = useCallback(() => {
    bufferRef.current = [];
    locationRef.current = null;
    dispatch({ type: 'START_RECORDING' });
  }, [dispatch]);

  const stopMeasurement = useCallback(() => {
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
