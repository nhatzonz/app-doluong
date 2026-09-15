import { useEffect, useState } from 'react';
import { useTripStore } from '../trips/TripStoreContext';

// Tai 1 chuyen theo id; tai lai khi index thay doi (doi ten, sua nhan, xoa).
export function useTrip(id) {
  const { getTrip, index } = useTripStore();
  const [trip, setTrip] = useState(undefined); // undefined = dang tai, null = khong co
  const meta = index.find(m => m.id === id);

  useEffect(() => {
    let alive = true;
    if (!meta) {
      setTrip(null);
      return undefined;
    }
    getTrip(id).then(tr => { if (alive) setTrip(tr ?? null); });
    return () => { alive = false; };
  }, [id, meta, getTrip]);

  return trip;
}
