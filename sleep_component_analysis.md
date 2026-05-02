# 🌙 Sleep Component — Implementation Analysis & Improvement Guide
> Project: **ScreenMind-25-26J-254** · Component: **C3 – Sleep Disruption Risk Estimation**

---

## ✅ What You Have Implemented

### 1. Mobile App — React Native (Frontend)

#### Screens (`src/features/sleep/screens/`)
| Screen | What it Does |
|---|---|
| `SleepHomeScreen.js` | Main dashboard: Start/Stop session button, donut risk chart, stat tiles (time in bed, unlocks, notifications), reasons list, bottom navigation bar |
| `SleepDetailsScreen.js` | Detailed breakdown of a session (sensor data, snoring, notifications) |
| `MorningCheckInScreen.js` | User feedback form: sleep quality, refreshed feeling, woke-up events, headache, dry mouth, snoring used toggle |
| `SnoringScreen.js` | Real-time snoring monitor with amplitude visualiser and live episode counter |
| `SleepScheduleScreen.js` | Set bedtime and wake-up time (custom schedule settings) |
| `DataPermissionsScreen.js` | Permissions management UI for usage stats, notification listener, DND access |

#### Components (`src/features/sleep/components/`)
- `InsightRow.js` — reusable row for displaying insights
- `StatPill.js` — small pill UI for displaying a metric value

---

### 2. Mobile App — Services Layer

#### Data / Database (`services/db.js`, `sleepRepository.js`)
**SQLite schema with 8 tables:**
- `sleep_sessions` — start/end timestamps per session
- `screen_events` — ON / OFF / UNLOCK events with timestamps
- `notification_events` — notifications with `is_night` and `is_social_media` flags
- `sensor_samples` — accelerometer (x,y,z) and light (lux) readings with metadata
- `morning_checkins` — subjective user feedback per session
- `user_sleep_settings` — custom bedtime/wake schedule
- `snoring_events` — individual snoring episodes (start/end/duration/intensity)
- `snoring_sessions` — aggregate snoring stats per sleep session
- `charging_events` — charging start/stop events with bedtime/waketime inference flags

**Key repository functions implemented:**
- Session lifecycle: `startSleepSession`, `stopSleepSession`, `getActiveSleepSession`, `getLatestCompletedSession`
- Event logging: `logScreenEvent`, `logNotificationEvent`, `logSensorSample`, `logChargingEvent`
- Reporting: `getSessionSummary` (full aggregated stats), `getLast7Sessions`, `getSnoringReport`
- Maintenance: `cleanupStaleSessions` (closes sessions > 24 hours old on startup)
- Bedtime inference: `estimateBedtimeFromCharging`

#### Sensor Tracking (`sensorService.js`)
- Listens to native `SleepSensorModule` (Kotlin) via `NativeEventEmitter`
- Tracks **accelerometer** (`SLEEP_SENSOR_ACCEL`) → classifies as STILL / LIGHT / RESTLESS
- Tracks **light sensor** (`SLEEP_SENSOR_LIGHT`) → classifies as DARK / DIM / BRIGHT
- Runs on a **Kotlin background HandlerThread** (survives screen lock)
- Calculates `restlessnessPercent` and `darknessScore` from samples

#### Snoring Detection (`snoringService.js`)
- Bridges to native `SnoringDetectionModule` (Kotlin)
- Listens for `SNORING_EVENT` (start/end) and `SNORING_AMPLITUDE` events
- Tracks episode count, total duration, intensity (None / Mild / Moderate / Severe)
- Persists each episode to SQLite via `saveSnoringEpisode`
- Live stats available via `getLiveSnoringStats()`
- Gracefully closes open episode on stop

#### Sleep Scoring (`sleepScoring.js`)
**Local weighted formula (6-component):**
| Component | Weight | Signal |
|---|---|---|
| LST – Late Screen Time | 30% | Screen minutes after 10 PM |
| SI – Sleep Interruptions | 20% | Night unlock count |
| NU – Notification Urgency | 15% | Responded night notifications ratio |
| SMU – Social Media Usage | 20% | Social media minutes after 10 PM |
| SR – Snoring Risk | 10% | Snoring duration in minutes |
| RS – Restlessness | 5% | % of restless accelerometer windows |

- Adaptive weights when snoring is disabled
- **30% subjective adjustment** from morning check-in (sleep quality + refreshed rating)
- Outputs: `score (0–100)`, `risk (Low/Medium/High)`, `reasons[]`, `breakdown{}`

#### Sleep API Service (`sleepApiService.js`)
- `predictSleepRiskML(sessions)` → calls Python `/predict-risk` (BiLSTM + RF ensemble)
- `predictSnoring(audioBlob)` → calls Python `/predict-snoring` (CNN model)
- `checkBackendHealth()` → health check
- `buildFeaturesFromSessions(summaries)` → converts SQLite summaries to ML feature format
- `computeRiskScore(data)` → fallback to rule-based API if ML not available
- **3-tier fallback:** ML API → Rule-based API → Local scoring

#### Warning & Notification Services
- `sleepWarningService.js` — Late-night usage warnings every 5–10 mins; bedtime reminder 30 min before scheduled bedtime; context-aware (social media vs. general late use)
- `sleepNotificationHandler.js` — Handles incoming push notifications
- `notificationService.js` — Notification helper layer
- `sleepEventService.js` — Tracks screen/unlock events during session
- `sleepSettingsService.js` — Loads/saves bedtime schedule from SQLite

---

### 3. Python Backend (ML API)

#### FastAPI Endpoints (`app/api/v1/c3_sleep/`)
| Endpoint | Method | Description |
|---|---|---|
| `/api/v1/c3_sleep/health` | GET | Health check |
| `/api/v1/c3_sleep/predict-risk` | POST | BiLSTM + RF ensemble risk prediction |
| `/api/v1/c3_sleep/predict-risk-simple` | POST | Quick test endpoint (raw dict) |
| `/api/v1/c3_sleep/predict-snoring` | POST | CNN-based snoring classification (audio file upload) |

#### ML Models (all pre-trained, stored in `/modal/`)
| File | Type | Purpose |
|---|---|---|
| `sleep_risk_model.h5` (1.2 MB) | BiLSTM | 7-day sequence classification → LOW / MODERATE / HIGH |
| `sleep_risk_model.tflite` (185 KB) | TFLite | On-device version (not yet wired up) |
| `random_forest_model.pkl` (27 MB) | Random Forest | Ensemble backup for risk classification |
| `snoring_model.h5` (2 MB) | CNN | Snoring vs. non-snoring audio classifier |
| `snoring_model.tflite` (177 KB) | TFLite | On-device snoring (not yet wired up) |
| `sleep_risk_config.json` | Config | Feature list, labels, sequence length |
| `snoring_model_config.json` | Config | MFCC params, threshold |

#### Service Logic (`service.py`)
- Lazy model loading (models only load on first request)
- `predict_sleep_risk()` — 7-day feature matrix → normalise → BiLSTM (70%) + RF (30%) ensemble → risk score
- `predict_snoring()` — MFCC extraction matching Colab training exactly → CNN binary prediction
- `get_contributing_factors()` — human-readable explanations for latest session
- `calculate_risk_score()` — weighted probability → 0–100 score

#### Schemas (`schemas.py`)
- `SessionData` (8 features: screen_time, unlocks, notifications, social_media, last_screen_off_hour, snoring_mins, restlessness_percent, day_of_week)
- `SleepRiskRequest / SleepRiskResponse` — validated Pydantic models

---

### 4. System Integration
- Sleep risk score contributed to the **global ScreenMind fusion model** via `app/api/v1/fusion/`
- The 3-tier scoring strategy (ML → API fallback → local) ensures the dashboard always has a value even when the backend is unreachable

---

## 🚀 What You Can Do to Improve Your Component

### 🔴 High Priority (Core gaps)

#### 1. Restlessness score is hardcoded to `30` in `buildFeaturesFromSessions`
```js
// sleepApiService.js line 97
restlessness_percent: 30,  // ← always 30, ignores actual sensor data!
```
**Fix:** Call `calculateRestlessnessScore(s.sensorSamples)` from `sensorService.js` before building the feature vector. This is a real signal you're already collecting but not feeding into the ML model.

#### 2. TFLite models are not being used
You have `sleep_risk_model.tflite` and `snoring_model.tflite` but the app always calls the Python backend. For offline operation, wire these up using `react-native-tflite` or similar. This would:
- Make risk prediction work without internet/server
- Dramatically reduce latency for real-time feedback

#### 3. No unit tests for the backend
`backend-python/app/tests/` is **empty** (`__init__.py` only). Add at least:
- `test_predict_risk()` — verify a known feature vector returns correct risk class
- `test_predict_snoring()` — verify a known audio clip is classified correctly
- `test_calculate_risk_score()` — verify weighted score math

#### 4. Scaler is re-fit on the inference data (data leakage)
```python
# service.py line 213
scaler = MinMaxScaler()
X_normalized = scaler.fit_transform(X)  # ← fits on inference data!
```
**Fix:** Save the scaler used during training with `pickle.dump(scaler, ...)` and load it at inference time using `scaler.transform(X)` (not `fit_transform`). Right now, scaling is inconsistent with training.

---

### 🟡 Medium Priority (Quality improvements)

#### 5. Social media minutes estimate is very rough
```js
social_media_mins: (s.socialNotifCount || 0) * 3,  // 3 min per notification?
```
Consider tracking actual social media app usage time (via Android `UsageStatsManager`) rather than proxying from notification count. You're already requesting `USAGE_STATS` permission in `DataPermissionsScreen`.

#### 6. Light sensor data is collected but not fed to ML
Light exposure (blue light before bed) is stored in `sensor_samples` but:
- Not included in the ML feature vector
- Not shown on the `SleepDetailsScreen`

Add `avg_light_lux_before_sleep` or `darkness_score` as a 9th feature to the model retraining pipeline.

#### 7. Morning Check-In is not linked to the ML feedback loop
The check-in gives subjective ground truth (`sleep_quality`, `refreshed`) but this data:
- Is only used in the *local* `computeDisruptionScore()` for a 30% adjustment
- Is NOT sent back to the backend for model retraining

Implement a `/submit-checkin` endpoint that stores labeled training samples to a database for future model retraining.

#### 8. No trend/history visualisation
The app only shows the **latest session**. Add a 7-day trend chart showing:
- Risk score over time
- Sleep duration per night
- Unlock count trend

This is high-value for a research demo and is already possible since you have `getLast7Sessions()`.

#### 9. `userId` is hardcoded to `null`
```js
// SleepHomeScreen.js line 256
const userId = null; // later: set Firebase auth uid
```
The sign-in system exists (`SignInScreen.js`). Wire up Firebase Auth so data is associated with real users.

---

### 🟢 Low Priority / Extra Features (To go above and beyond)

#### 10. Add a Sleep Trend Screen
Create a new `SleepTrendScreen.js` that shows:
- Line chart of risk score (last 7 days)
- Bar chart of sleep duration
- Highlight best/worst nights

#### 11. Export / Share Report
Allow users to export their sleep summary as a PDF or share a screenshot — useful for demonstration or clinical referral.

#### 12. Adaptive Bedtime Suggestion
Use the 7-day history to suggest an optimal bedtime:
> "Based on your data, you sleep best when you put the phone down before 10:30 PM."

#### 13. Add snoring audio confidence to the dashboard
The snoring model returns a `confidence` float (0–1) but the UI only shows episode count and total minutes. Show the confidence level to give users more transparency.

#### 14. Logging cleanup
`service.py` uses `print()` for model loading. Replace with Python `logging` module for better log levels and easier debugging in production.

#### 15. Document the Colab training notebook
The ML models are pre-trained but there is no Colab notebook in the repo. Add it (or link it) so reviewers can see the training data, augmentation strategy, model architecture, and evaluation metrics.

---

## 📊 Summary Table

| Area | Status | Priority Fix Needed |
|---|---|---|
| SQLite data collection | ✅ Complete | — |
| Accelerometer + light sensors | ✅ Implemented | Feed light data to ML |
| Snoring detection (native) | ✅ Implemented | — |
| Morning check-in UI | ✅ Complete | Feed back to ML training |
| Local scoring formula | ✅ Complete | — |
| BiLSTM + RF backend API | ✅ Complete | Fix scaler leakage |
| 3-tier scoring fallback | ✅ Complete | — |
| Bedtime warnings | ✅ Complete | — |
| TFLite on-device inference | ❌ Not wired | Medium |
| Restlessness in ML features | ❌ Hardcoded 30 | **High** |
| Backend unit tests | ❌ Empty | High |
| Inference scaler | ❌ Leakage bug | **High** |
| 7-day trend visualisation | ❌ Not built | Medium |
| Firebase Auth integration | ❌ null userId | Medium |
| Light feature in ML | ❌ Not included | Medium |
| Training notebook in repo | ❌ Missing | Low |
