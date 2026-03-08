import axios from "axios";
import { PYTHON_BACKEND_URL } from '@env';

const BASE_URL = `${PYTHON_BACKEND_URL}/api/v1`;

export async function analyzeJournalText(text) {
  console.log('📡 Calling:', `${BASE_URL}/social-media/analyze-text`);
  const { data } = await axios.post(`${BASE_URL}/social-media/analyze-text`, { text });
  console.log('📡 Raw response:', JSON.stringify(data));
  return data;
}