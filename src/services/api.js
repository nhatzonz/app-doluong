import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export async function analyzeSegment(samples, location) {
  const response = await client.post('/analyze', { samples, location });
  return response.data;
}

export async function analyzeFullTrip(segments) {
  const response = await client.post('/analyze-full', { segments });
  return response.data;
}

export async function checkHealth() {
  const response = await client.get('/health');
  return response.data;
}
