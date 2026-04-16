// Thay doi IP nay thanh IP laptop cua ban (cung WiFi voi dien thoai)
export const API_BASE_URL = 'http://192.168.1.42:8000';

export const SAMPLE_RATE = 50;        // Hz (khop voi fs=50 trong code mau)
export const SEGMENT_DURATION = 2;    // giay
export const SEGMENT_SIZE = SAMPLE_RATE * SEGMENT_DURATION; // 100 mau

// Mau sac theo muc do gho
export const ROUGHNESS_COLORS = {
  good: '#4CAF50',       // Xanh
  moderate: '#FF9800',   // Cam
  bad: '#F44336',        // Do
};
