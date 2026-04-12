import { useState, useEffect, useRef, useCallback } from 'react';
import { Accelerometer } from 'expo-sensors';

export function useAccelerometer(isActive) {
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const [isAvailable, setIsAvailable] = useState(false);
  const subscriptionRef = useRef(null);

  useEffect(() => {
    Accelerometer.isAvailableAsync().then(setIsAvailable);
  }, []);

  const handleUpdate = useCallback(({ x, y, z }) => {
    setData({ x, y, z });
  }, []);

  useEffect(() => {
    if (isActive && isAvailable) {
      Accelerometer.setUpdateInterval(20); // 50Hz
      subscriptionRef.current = Accelerometer.addListener(handleUpdate);
    } else if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
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
