import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';

export function useLocation(isActive) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const watchRef = useRef(null);

  useEffect(() => {
    if (!isActive) {
      if (watchRef.current) {
        watchRef.current.remove();
        watchRef.current = null;
      }
      return;
    }

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Khong co quyen truy cap vi tri');
        return;
      }

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (loc) => {
          setLocation({
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
            speed: Math.max(0, loc.coords.speed || 0),
            altitude: loc.coords.altitude,
            timestamp: loc.timestamp,
          });
        }
      );
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
