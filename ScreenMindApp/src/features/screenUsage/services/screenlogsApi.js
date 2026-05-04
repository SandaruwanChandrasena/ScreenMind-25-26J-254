// ✅ Your correct IP
const BASE_URL = 'http://192.168.8.131:8000';

export async function predictScreenlogRisk(payload) {
  try {
    console.log('[API] Sending payload:', payload);

    const response = await fetch(`${BASE_URL}/api/v1/screenlogs/predict-risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    console.log('[API] Raw response:', text);

    if (!response.ok) {
      throw new Error(`Prediction failed: ${text}`);
    }

    const data = JSON.parse(text);
    console.log('[API] Parsed response:', data);
    return data;

  } catch (error) {
    console.error('[API] Error:', error);
    throw error;
  }
}