import { useEffect, useRef } from 'react';
import { useMeasurementContext } from '../../context/MeasurementContext';
import { useTripStore } from './TripStoreContext';
import { tripIdFor, MIN_TRIP_SEGMENTS } from './tripStorage';
import { summarizeTrip } from '../analytics/tripMath';
import { warn } from '../../utils/logger';

// Cho sau STOP: doan cuoi van dang goi API (timeout 3.5s) roi moi dispatch
// ADD_SEGMENT_RESULT. Moi ket qua den muon se gia han them.
const SAVE_DELAY_MS = 4500;

// Component khong render gi. CHI DOC MeasurementContext, khong dispatch.
export function TripAutoSaver() {
  const { state } = useMeasurementContext();
  const store = useTripStore();

  const storeRef = useRef(store);
  storeRef.current = store;

  const wasRecordingRef = useRef(state.isRecording);
  const snapshotRef = useRef(null);   // du lieu cua commit TRUOC
  const sessionRef = useRef(null);    // setup cua lan do dang chay
  const pendingRef = useRef(null);    // chuyen da STOP, cho luu
  const timerRef = useRef(null);

  const flush = () => {
    clearTimeout(timerRef.current);
    timerRef.current = null;
    const pending = pendingRef.current;
    const snap = snapshotRef.current;
    pendingRef.current = null;
    if (!pending || !snap || snap.startTime !== pending.startTime) return;

    const segments = snap.segmentResults;
    if (segments.length < MIN_TRIP_SEGMENTS) {
      storeRef.current.markSkipped(pending.startTime, segments.length);
      return;
    }
    const last = segments[segments.length - 1];
    const trip = {
      version: 1,
      id: tripIdFor(pending.startTime),
      name: null,
      startedAt: pending.startTime,
      endedAt: last?.wallTimeEnd ?? pending.stoppedAt,
      setup: pending.setup,
      summary: summarizeTrip(segments, snap.locationHistory),
      segments,
      track: snap.locationHistory,
      marks: pending.marks,
    };
    storeRef.current.save(trip).catch(e => warn('REC', `trip save failed: ${e?.message}`));
  };

  const schedule = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, SAVE_DELAY_MS);
  };

  // (1) Chuyen trang thai ghi. Khai bao TRUOC effect cap nhat snapshot de khi
  // START moi, snapshotRef van giu du lieu chuyen truoc (state da bi reset).
  useEffect(() => {
    const was = wasRecordingRef.current;
    wasRecordingRef.current = state.isRecording;

    if (!was && state.isRecording) {
      if (pendingRef.current) flush();
      sessionRef.current = { setup: storeRef.current.pendingSetup, startTime: state.startTime };
      storeRef.current.resetMarks();
    } else if (was && !state.isRecording) {
      pendingRef.current = {
        startTime: state.startTime,
        setup: sessionRef.current?.setup ?? null,
        marks: storeRef.current.currentMarks,
        stoppedAt: Date.now(),
      };
      schedule();
    }
  }, [state.isRecording]);

  // (2) Ket qua den muon sau STOP → gia han
  useEffect(() => {
    if (pendingRef.current && !state.isRecording) schedule();
  }, [state.segmentResults]);

  // (3) Snapshot cho lan commit ke tiep
  useEffect(() => {
    snapshotRef.current = {
      startTime: state.startTime,
      segmentResults: state.segmentResults,
      locationHistory: state.locationHistory,
    };
  });

  // Luu not neu component bi unmount (hiem, vd reload)
  useEffect(() => () => { if (pendingRef.current) flush(); }, []);

  return null;
}
