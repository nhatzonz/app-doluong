// Tuy chon thiet lap theo loai phuong tien (chot trong plan v2)
export const VEHICLES = ['car', 'motorbike'];

export const MOUNTS = {
  car: ['windshield', 'vent', 'seat'],
  motorbike: ['handlebar', 'saddle', 'storage'],
};

export const TARGET_SPEEDS = {
  car: [30, 40, 50, 60],
  motorbike: [20, 30, 40],
};

export const DEFAULT_TARGET_SPEED = { car: 40, motorbike: 30 };

// Chip toc do chuyen canh bao khi lech muc tieu qua nguong nay
export const SPEED_TOLERANCE = 0.2;

// Nguong "Dat" cua buoc kiem tra nhanh
export const CHECK_MIN_HZ = 45;
export const CHECK_MAX_GPS_M = 15;
export const CHECK_DURATION_MS = 3000;

export function defaultSetup(vehicle = 'car') {
  const v = VEHICLES.includes(vehicle) ? vehicle : 'car';
  return { vehicle: v, mount: MOUNTS[v][0], targetSpeedKmh: DEFAULT_TARGET_SPEED[v] };
}
