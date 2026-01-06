import axios from "axios";

// Android emulator: 10.0.2.2
// Real device: use your PC IP address (e.g., http://192.168.1.10:5000)
const BASE_URL = "http://10.0.2.2:5000/api/v1";

export async function analyzeJournalText(text) {
  // When backend is ready, Node should expose:
  // POST /social-media/analyze-text  { text }
  const { data } = await axios.post(`${BASE_URL}/social-media/analyze-text`, { text });
  return data;
}
