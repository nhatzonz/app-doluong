import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  loadIndex, loadTrip, saveTrip, updateTrip, deleteTrip, deleteAllTrips,
  MAX_TRIPS, MIN_TRIP_SEGMENTS,
} from './tripStorage';
import { log, warn } from '../../utils/logger';

const TripStoreContext = createContext(null);

export function TripStoreProvider({ children }) {
  const [index, setIndex] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [lastSave, setLastSave] = useState(null); // { id, skipped, startedAt }
  // Thiet lap (xe, cach gan, toc do) cho lan do sap toi / dang do
  const [pendingSetup, setPendingSetup] = useState(null);
  // Diem danh dau trong lan do hien tai
  const [currentMarks, setCurrentMarks] = useState([]);
  const cacheRef = useRef(new Map());

  useEffect(() => {
    loadIndex()
      .then(setIndex)
      .catch(e => warn('REC', `trip index load failed: ${e?.message}`))
      .finally(() => setLoaded(true));
  }, []);

  const getTrip = useCallback(async (id) => {
    if (cacheRef.current.has(id)) return cacheRef.current.get(id);
    const trip = await loadTrip(id);
    if (trip) cacheRef.current.set(id, trip);
    return trip;
  }, []);

  const save = useCallback(async (trip) => {
    const { index: next, evicted } = await saveTrip(trip);
    cacheRef.current.set(trip.id, trip);
    evicted.forEach(m => cacheRef.current.delete(m.id));
    setIndex(next);
    setLastSave({ id: trip.id, skipped: false, startedAt: trip.startedAt });
    log('REC', `trip saved ${trip.id} (${trip.segments.length} seg), evicted=${evicted.map(m => m.id).join(',') || 'none'}`);
    return next;
  }, []);

  const markSkipped = useCallback((startedAt, segmentCount) => {
    setLastSave({ id: null, skipped: true, startedAt });
    log('REC', `trip not saved: ${segmentCount} segments < ${MIN_TRIP_SEGMENTS}`);
  }, []);

  const patchTrip = useCallback(async (id, patch) => {
    const res = await updateTrip(id, patch);
    if (!res) return null;
    cacheRef.current.set(id, res.trip);
    setIndex(res.index);
    return res.trip;
  }, []);

  const remove = useCallback(async (id) => {
    cacheRef.current.delete(id);
    setIndex(await deleteTrip(id));
  }, []);

  const removeAll = useCallback(async () => {
    cacheRef.current.clear();
    setIndex(await deleteAllTrips());
  }, []);

  // Ref giu danh sach moi nhat → tra ve so thu tu dong bo, khong phu thuoc
  // thoi diem React chay updater.
  const marksRef = useRef([]);
  const addMark = useCallback((mark) => {
    const next = [...marksRef.current, { id: `m${mark.wallTime}`, label: 'unlabeled', ...mark }];
    marksRef.current = next;
    setCurrentMarks(next);
    return next.length;
  }, []);

  const resetMarks = useCallback(() => {
    marksRef.current = [];
    setCurrentMarks([]);
  }, []);

  const value = useMemo(() => ({
    index, loaded, lastSave,
    maxTrips: MAX_TRIPS, minSegments: MIN_TRIP_SEGMENTS,
    getTrip, save, markSkipped, patchTrip, remove, removeAll,
    pendingSetup, setPendingSetup,
    currentMarks, addMark, resetMarks,
  }), [index, loaded, lastSave, getTrip, save, markSkipped, patchTrip, remove, removeAll,
    pendingSetup, currentMarks, addMark, resetMarks]);

  return <TripStoreContext.Provider value={value}>{children}</TripStoreContext.Provider>;
}

export function useTripStore() {
  const ctx = useContext(TripStoreContext);
  if (!ctx) throw new Error('useTripStore must be used within TripStoreProvider');
  return ctx;
}
