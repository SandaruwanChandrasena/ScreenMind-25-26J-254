// src/features/sleep/services/sleepApiService.js

import { PYTHON_BACKEND_URL } from '@env';
const BASE_URL = `${PYTHON_BACKEND_URL}/api/v1/c3_sleep`;

/**
 * Predict sleep disruption risk from behavioral data
 */
export async function predictSleepRisk(sessions) {
  try {
    const response = await fetch(`${BASE_URL}/predict-risk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessions }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Risk prediction:', result);
    return result;

  } catch (error) {
    console.log('❌ Risk prediction API error:', error);
    // Return fallback result if API unavailable
    return null;
  }
}

/**
 * Predict snoring from audio data
 * audioBlob: Blob of WAV audio
 */
export async function predictSnoring(audioBlob) {
  try {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioBlob,
      type: 'audio/wav',
      name: 'snoring_sample.wav',
    });

    const response = await fetch(`${BASE_URL}/predict-snoring`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Snoring prediction:', result);
    return result;

  } catch (error) {
    console.log('❌ Snoring prediction API error:', error);
    return null;
  }
}

/**
 * Check if backend is available
 */
export async function checkBackendHealth() {
  try {
    const response = await fetch(`${BASE_URL}/health`, {
      method: 'GET',
      timeout: 5000,
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Convert session summaries (from getSessionSummary) to the SessionData
 * format expected by the /predict-risk endpoint.
 */
export function buildFeaturesFromSessions(sessionSummaries) {
  return sessionSummaries.map(s => ({
    screen_time_night_mins: (s.screenOnCount || 0) * 8,
    unlocks_night: s.unlockCount || 0,
    notifications_night: s.nightNotifCount ?? s.notifCount ?? 0,
    social_media_mins: (s.socialNotifCount || 0) * 3,
    last_screen_off_hour: new Date(s.end || Date.now()).getHours(),
    snoring_mins: s.snoringTotalMinutes ?? 0,
    restlessness_percent: 30,
    day_of_week: new Date(s.start || Date.now()).getDay(),
  }));
}

/**
 * Run ML risk prediction against 7-session feature array.
 * Returns { risk_score, risk_category, contributing_factors, probabilities } or null.
 */
export async function predictSleepRiskML(sessions) {
  try {
    const response = await fetch(`${BASE_URL}/predict-risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessions }),
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const result = await response.json();
    return {
      risk_score: result.risk_score,
      risk_category: result.risk_label,
      contributing_factors: result.contributing_factors,
      probabilities: result.probabilities,
    };
  } catch (error) {
    console.log('❌ ML risk prediction error:', error);
    return null;
  }
}

/**
 * Rule-based risk score using a single session's stats.
 * Calls the same /predict-risk endpoint with one session entry.
 * Returns { risk_score, risk_category, reasons, breakdown } or null.
 */
export async function computeRiskScore(data) {
  try {
    const session = {
      screen_time_night_mins: data.screen_time_after_10pm || 0,
      unlocks_night: data.unlock_count_night || 0,
      notifications_night: data.notification_count_night || 0,
      social_media_mins: data.social_media_mins_night || 0,
      last_screen_off_hour: data.last_screen_off_hour || 0,
      snoring_mins: data.snoring_duration_mins || 0,
      restlessness_percent: data.restlessness_score || 0,
      day_of_week: new Date().getDay(),
    };
    const response = await fetch(`${BASE_URL}/predict-risk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessions: [session] }),
    });
    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    const result = await response.json();
    return {
      risk_score: result.risk_score,
      risk_category: result.risk_label,
      reasons: result.contributing_factors || [],
      breakdown: result.probabilities || {},
    };
  } catch (error) {
    console.log('❌ Rule-based risk API error:', error);
    return null;
  }
}