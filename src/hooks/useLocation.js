import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { log, warn } from '../utils/logger';

export function useLocation(isActive) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const watchRef = useRef(null);
  const updateCountRef = useRef(0);

  useEffect(() => {
    if (!isActive) {
      if (watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
        log('GPS', 'watch stopped');
      }
      return;
    }

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      log('GPS', `permission: ${status}`);
      if (status !== 'granted') {
        setErrorMsg('Khong co quyen truy cap vi tri');
        warn('GPS', 'permission DENIED');
        return;
      }

      updateCountRef.current = 0;
      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (loc) => {
          const speedMs = Math.max(0, loc.coords.speed || 0);
          const payload = {
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
            speed: speedMs,
            altitude: loc.coords.altitude,
            timestamp: loc.timestamp,
          };
          setLocation(payload);
          updateCountRef.current++;
          // Only log first 3 fixes + every 10th after, to avoid flooding
          const n = updateCountRef.current;
          if (n <= 3 || n % 10 === 0) {
            log('GPS', `#${n} lat=${payload.lat?.toFixed(5)} lon=${payload.lon?.toFixed(5)} spd=${speedMs.toFixed(2)}m/s (${(speedMs * 3.6).toFixed(1)}km/h) alt=${payload.altitude?.toFixed(1)}m acc=${loc.coords.accuracy?.toFixed(1)}m`);
          }
        }
      );
      log('GPS', 'watch started @ BestForNavigation, 1s / 1m');
    })();

    return () => {
      if (watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
      }
    };
  }, [isActive]);

  return { location, errorMsg };
}
