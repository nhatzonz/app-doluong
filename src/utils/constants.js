// Thay doi IP nay thanh IP laptop cua ban (cung WiFi voi dien thoai)
export const API_BASE_URL = 'http://192.168.1.17:8000';

export const SAMPLE_RATE = 50;        // Hz (danh gia duoc tan so <= 25 Hz)
export const SEGMENT_DURATION = 2;    // giay — do phan giai ban do, khong phai thoi luong danh gia ISO
export const SEGMENT_SIZE = SAMPLE_RATE * SEGMENT_DURATION; // 100 mau
export const MIN_SEGMENT_SAMPLES = SAMPLE_RATE;             // doan cuoi < 1s bi bo khi STOP
export const GPS_MAX_AGE_MS = 5000;   // GPS fix cu hon muc nay → segment khong co toa do
export const UI_UPDATE_EVERY = 10;    // cap nhat UI moi 10 mau

// ISO 2631-1 khuyen nghi thoi luong do du dai; duoi muc nay chi xem la tham khao
export const MIN_ISO_DURATION_SEC = 60;
