import { useState, useEffect, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';
import { log } from '../utils/logger';

// onSample({ x, y, z, timestamp }) duoc goi truc tiep trong listener cua sensor
// cho MOI mau (don vi g, timestamp ms). Khong di qua React state: state bi
// batch/bo qua khi gia tri trung → mat mau va sai timestamp.
export function useAccelerometer(isActive, onSample) {
  const [isAvailable, setIsAvailable] = useState(false);
  const subscriptionRef = useRef(null);
  const onSampleRef = useRef(onSample);
  onSampleRef.current = onSample;

  useEffect(() => {
    Accelerometer.isAvailableAsync().then((ok) => {
      setIsAvailable(ok);
      log('ACCEL', `availability: ${ok ? 'YES' : 'NO'}`);
    });
  }, []);

  useEffect(() => {
    if (!isActive || !isAvailable) return;

    let firstLogged = 0;
    Accelerometer.setUpdateInterval(20); // 50Hz
    subscriptionRef.current = Accelerometer.addListener(({ x, y, z, timestamp }) => {
      // timestamp cua sensor (giay) chinh xac hon thoi diem JS nhan duoc
      const ts = Number.isFinite(timestamp) ? timestamp * 1000 : Date.now();
      if (firstLogged < 5) {
        firstLogged++;
        log('ACCEL', `raw sample #${firstLogged}: x=${x.toFixed(4)}, y=${y.toFixed(4)}, z=${z.toFixed(4)}, t=${ts.toFixed(1)}ms`);
      }
      onSampleRef.current?.({ x, y, z, timestamp: ts });
    });
    log('ACCEL', 'subscribed @ setUpdateInterval(20ms) / target 50Hz');

    return () => {
      subscriptionRef.current?.remove();
      subscriptionRef.current = null;
      log('ACCEL', 'unsubscribed');
    };
  }, [isActive, isAvailable]);

  return { isAvailable };
}
