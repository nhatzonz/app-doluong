import { useState, useEffect, useRef, useCallback } from 'react';
import { Accelerometer } from 'expo-sensors';
import { log } from '../utils/logger';

export function useAccelerometer(isActive) {
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const [isAvailable, setIsAvailable] = useState(false);
  const subscriptionRef = useRef(null);
  const firstSamplesLoggedRef = useRef(0);

  useEffect(() => {
    Accelerometer.isAvailableAsync().then((ok) => {
      setIsAvailable(ok);
      log('ACCEL', `availability: ${ok ? 'YES' : 'NO'}`);
    });
  }, []);

  const handleUpdate = useCallback(({ x, y, z }) => {
    setData({ x, y, z });
    // Log raw values of the first 5 samples after each START so we can see sensor unit directly
    if (firstSamplesLoggedRef.current < 5) {
      firstSamplesLoggedRef.current++;
      log('ACCEL', `raw sample #${firstSamplesLoggedRef.current}: x=${x.toFixed(4)}, y=${y.toFixed(4)}, z=${z.toFixed(4)}`);
    }
  }, []);

  useEffect(() => {
    if (isActive && isAvailable) {
      Accelerometer.setUpdateInterval(20); // 50Hz
      firstSamplesLoggedRef.current = 0;
      subscriptionRef.current = Accelerometer.addListener(handleUpdate);
      log('ACCEL', 'subscribed @ setUpdateInterval(20ms) / target 50Hz');
    } else if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
      log('ACCEL', 'unsubscribed');
    }

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, [isActive, isAvailable, handleUpdate]);

  return { data, isAvailable };
}
