import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';
import { log } from '../utils/logger';
import { G } from './wrmsCalculator';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 3500,
});

log('API', `baseURL = ${API_BASE_URL}`);

// samples: [{ ax, ay, az, timestamp }] voi ax/ay/az dang don vi g.
// Backend dung m/s², nen convert truoc khi gui de don vi nhat quan toan he thong.
export async function analyzeSegment(samples, location) {
  log('API', `→ POST /analyze (samples=${samples.length}, loc=${location?.lat?.toFixed(4)},${location?.lon?.toFixed(4)})`);
  const payload = samples.map(s => ({
    ax: s.ax * G,
    ay: s.ay * G,
    az: s.az * G,
    timestamp: s.timestamp,
  }));
  const response = await client.post('/analyze', { samples: payload, location });
  return response.data;
}

export async function analyzeFullTrip(segments) {
  log('API', `→ POST /analyze-full (segments=${segments.length})`);
  const response = await client.post('/analyze-full', { segments });
  return response.data;
}

export async function checkHealth() {
  const response = await client.get('/health');
  return response.data;
}

// Dia chi may chu nhap tu man Cai dat. Mac dinh van la API_BASE_URL.
export function setApiBaseUrl(url) {
  if (!url || client.defaults.baseURL === url) return;
  client.defaults.baseURL = url;
  log('API', `baseURL = ${url}`);
}

export function getApiBaseUrl() {
  return client.defaults.baseURL;
}

// Kiem tra 1 dia chi bat ky (chua luu) — dung cho nut "Kiem tra ket noi".
export async function checkHealthAt(url, timeout = 3000) {
  const response = await axios.get(`${url.replace(/\/+$/, '')}/health`, { timeout });
  return response.data;
}
