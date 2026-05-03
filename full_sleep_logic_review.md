# 🌙 Full Sleep Component — Complete Logic Review
> **Project:** ScreenMind-25-26J-254 · **Component:** C3 – Sleep Disruption Risk Estimation  
> **Reviewed:** 2026-05-03 · Every file read and traced end-to-end.

---

## How the Whole System Connects (Data Flow)

```
Android Phone
  │
  ├── SleepEventModule.kt   ─── Screen ON/OFF/UNLOCK, Charging events ──► sleepEventService.js
  ├── SleepSensorModule.kt  ─── Accel (30s) + Light (5min) ────────────► sensorService.js
  ├── SnoringDetectionModule.kt ─ Audio amplitude + episodes ──────────► snoringService.js
  └── Notification Listener ─── Headless task ─────────────────────────► sleepNotificationHandler.js
           │
           ▼  (all write to)
      SQLite DB (db.js — 9 tables)
      sleepRepository.js  ← read/write layer
           │
           ├──► sleepScoring.js        → Local risk score (0–100)
           ├──► sleepApiService.js     → Python ML API (BiLSTM + RF)
           ├──► sleepFirebaseSync.js   → Firestore cloud backup
           │
           ▼
      Screens (React Native UI)
      ├── SleepHomeScreen.js       ← Dashboard + Start/Stop
      ├── SleepDetailsScreen.js    ← Day/Week/Month breakdown
      ├── SleepTrendScreen.js      ← 7-day line + bar charts  (NEW ✨)
      ├── MorningCheckInScreen.js  ← User feedback
      ├── SnoringScreen.js         ← Live snoring monitor
      ├── SleepScheduleScreen.js   ← Bedtime/wake settings
      └── DataPermissionsScreen.js ← Permission gates
```

---

## Layer 1: SQLite Database (`db.js`)

### What it does
Opens a single SQLite file `screenmind.db` using a **singleton pattern** (`dbInstance`). Creates 9 tables on first open. Uses safe `ALTER TABLE ... ADD COLUMN` migrations wrapped in try/catch so existing devices don't crash when you add a new column.

### Tables & their purpose

| Table | Key Columns | Purpose |
|---|---|---|
| `sleep_sessions` | `start_time`, `end_time` | One row per session. `end_time = NULL` = running session |
| `screen_events` | `event_type` (ON/OFF/UNLOCK), `ts`, `meta` | Every screen interaction during session |
| `notification_events` | `package_name`, `is_night`, `is_social_media` | Social media notifications received at night |
| `sensor_samples` | `sensor_type`, `x/y/z/value`, `meta` | Accel + light readings (every 30s / 5min) |
| `morning_checkins` | `sleep_quality`, `refreshed`, `woke_up`, `headache` | User's self-report next morning |
| `user_sleep_settings` | `bedtime_hour/minute`, `waketime_hour/minute` | User's personal schedule |
| `snoring_events` | `start_ts`, `end_ts`, `duration_seconds`, `intensity` | Each snoring episode |
| `snoring_sessions` | `total_episodes`, `total_duration_seconds` | Aggregate per session |
| `charging_events` | `is_likely_bedtime`, `is_likely_waketime` | Phone charging as bedtime proxy |

### ✅ What's correct
- Singleton pattern prevents multiple DB connections
- Migrations handle schema changes on existing installs safely
- All tables have proper `FOREIGN KEY` to `sleep_sessions(id)`

### ⚠️ Issue found
- `initialized` flag is checked **after** `dbInstance` is set, but `ensureTables` is also called **unconditionally** on first open (line 197). Tables are created twice on fresh install — harmless because of `IF NOT EXISTS`, but slightly wasteful.

---

## Layer 2: Repository (`sleepRepository.js`)

### What it does
Single access layer between all services and SQLite. All queries go through here.

### Key functions and their logic

#### `startSleepSession` / `stopSleepSession`
- Start: inserts a row with `end_time = NULL`
- Stop: sets `end_time = now` on that row
- ✅ Clean and correct.

#### `getActiveSleepSession`
- Finds the latest session where `end_time IS NULL`
- ✅ Correctly handles `userId = null` (no filter) vs. real user ID

#### `getSessionSummary(sessionId)` — **Core aggregation function**
Runs 8 separate SQL queries and assembles one object:
- Duration (capped at 24h to handle unclosed sessions)
- Unlock count, screen ON count
- Total / night / social media notification counts
- First charging start time
- All sensor samples (full array)
- All snoring events (full array)
- Morning check-in

**Returns:**
```js
{
  sessionId, start, end, durationMs,
  unlockCount, screenOnCount,
  notifCount, nightNotifCount, socialNotifCount,
  chargingStartTime,
  sensorSamples,        // full array
  snoringEvents,        // full array
  snoringTotalMinutes,
  checkIn
}
```

#### `getLast7Sessions`
- Gets last 7 completed sessions (newest first)
- Calls `getSessionSummary` on each → returns full array
- ✅ Used by ML pipeline, trend screen, and details screen

#### `cleanupStaleSessions`
- Runs on every app startup
- Finds sessions with `end_time IS NULL` and `start_time < 24h ago`
- Closes them with `start + 8h` as estimated end time
- ✅ Good safety mechanism

### 🔴 Bug: `getSessionSummary` loads all sensor samples into memory
For a full overnight session (30s accel × 8h = ~960 accel rows + light rows), this loads ~1000+ rows into a JavaScript array on every dashboard load. On low-RAM devices this could cause slowness.

### 🟡 Issue: No index on `session_id`
Every `WHERE session_id = ?` query does a full table scan. Should add:
```sql
CREATE INDEX IF NOT EXISTS idx_screen_events_session ON screen_events(session_id);
CREATE INDEX IF NOT EXISTS idx_sensor_samples_session ON sensor_samples(session_id);
```

---

## Layer 3: Event Tracking (`sleepEventService.js`)

### What it does
When a session starts, registers listeners on `SleepEventModule` (Kotlin) for 5 event types:

| Event | Action |
|---|---|
| `SLEEP_UNLOCK` | Logs `UNLOCK` to `screen_events`, sets `isNight` flag in meta |
| `SLEEP_SCREEN_ON` | Logs `ON` to `screen_events` |
| `SLEEP_SCREEN_OFF` | Logs `OFF` to `screen_events` |
| `SLEEP_CHARGING_START` | Logs to both `screen_events` AND `charging_events` with `isLikelyBedtime` flag |
| `SLEEP_CHARGING_STOP` | Logs to both tables with `isLikelyWakeTime` flag |

### ✅ What's correct
- Properly removes all subscriptions on `stopSleepEventTracking()`
- Calls `SleepEventModule.startListening()` / `stopListening()` to register/unregister the Android `BroadcastReceiver`
- Charging events are correctly logged to the dedicated `charging_events` table

### ⚠️ Issue
Old commented-out charging handler code (lines 88–122) is still in the file. The new implementation below it (lines 126–189) is correct, but the dead code is confusing. Should be cleaned up.

---

## Layer 4: Sensor Tracking (`sensorService.js`)

### What it does
Bridges to `SleepSensorModule.kt` which runs on a **background `HandlerThread`** (survives screen lock).

- **Accelerometer** polls every **30 seconds** — classifies movement as:
  - `STILL` (movement < 0.02g)
  - `LIGHT` (< 0.08g)
  - `RESTLESS` (< 0.30g)
  - `ACTIVE` (≥ 0.30g)

- **Light sensor** polls every **5 minutes** — classifies as:
  - `DARK` (< 5 lux)
  - `DIM` (< 20 lux)
  - `MODERATE` (< 50 lux)
  - `BRIGHT` (≥ 50 lux)

Both are saved to `sensor_samples` with classification in the `meta` JSON field.

### ✅ `calculateRestlessnessScore(sensorSamples)` — correct logic
```js
// Counts samples classified as RESTLESS or ACTIVE
// Returns percentage: (restlessCount / totalAccel) * 100
```

### ✅ `calculateDarknessScore(sensorSamples)` — correct logic
```js
// Counts DARK or DIM light samples
// Returns percentage: (darkCount / totalLight) * 100
```

### 🔴 Critical Bug: These functions are NEVER called when building ML features
`buildFeaturesFromSessions()` in `sleepApiService.js` line 96 hardcodes:
```js
restlessness_percent: 30,  // ← ALWAYS 30, real data ignored
```
The sensor data is collected and stored correctly, but **never fed into the ML model**.

---

## Layer 5: Snoring Detection (`snoringService.js`)

### What it does
- Bridges to `SnoringDetectionModule.kt` (native audio processing)
- Listens for `SNORING_EVENT` (start/end of episode)
- Listens for `SNORING_AMPLITUDE` (real-time audio level)
- Tracks: episode count, total duration, intensity (None/Mild/Moderate/Severe)
- Saves each episode to `snoring_events` table via `saveSnoringEpisode()`
- On stop: gracefully closes any open episode

### ✅ What's correct
- Live stats via `getLiveSnoringStats()` → used by `SnoringScreen.js` for real-time UI
- Intensity thresholds are reasonable (Mild < 15min, Moderate < 45min, Severe ≥ 45min)

---

## Layer 6: Notification Handling

### Receiving incoming notifications (passive tracking)
**Pipeline:** Android Notification Listener Service → `RNAndroidNotificationListenerHeadlessJs` → `combinedHeadlessTask.js` → `handleSleepNotification(parsed)`

#### `handleSleepNotification` logic:
1. Normalizes package name to lowercase
2. Checks if app is in tracked list (WhatsApp, Instagram, TikTok, Snapchat, Telegram, YouTube, Facebook, X/Twitter)
3. If **not** a social media app → **skip** (don't log it)
4. Checks if timestamp is within user's personal night window
5. If not night AND no active session → skip
6. Saves to `notification_events` with `is_night` and `is_social_media` flags

#### ✅ What's correct
- Uses user's personal bedtime schedule (not a fixed 9PM cutoff)
- Correctly handles cross-midnight night windows
- Social media filtering is accurate with prefix matching

### Sending outgoing warning notifications
**Pipeline:** `sleepWarningService.js` → `SleepEventModule.sendLocalNotification()` (Kotlin)

#### Warning types:
1. **Late-night usage warning** — fires every 5 min during night window (if user is active)
2. **Social media warning** — smarter message when social media notifications detected
3. **Bedtime reminder** — fires 30 min before scheduled bedtime, auto-reschedules daily

### 🔴 Bug: Warning cooldown disabled
```js
const WARNING_COOLDOWN_MS = 0; // ← Should be 30 * 60 * 1000
```
User gets spammed every 5 minutes all night.

### 🔴 Bug: Duplicate notification ID `2001` in both Kotlin files
Both `SleepEventModule.kt` and `SleepSensorModule.kt` post notifications with ID `2001`. Android replaces rather than stacks them.

---

## Layer 7: Local Sleep Scoring (`sleepScoring.js`)

### Formula (6-component weighted sum)

```
Risk Score = (LST × 30%) + (SI × 20%) + (NU × 15%) + (SMU × 20%) + (SR × 10%) + (RS × 5%)
```

| Component | Input | Max Reference | Weight |
|---|---|---|---|
| LST — Late Screen Time | Screen mins after 10PM | 120 min | 30% |
| SI — Sleep Interruptions | Night unlock count | 10 unlocks | 20% |
| NU — Notification Urgency | Responded night notifs / total | ratio | 15% |
| SMU — Social Media Usage | Social media mins after 10PM | 90 min | 20% |
| SR — Snoring Risk | Snoring duration | 60 min | 10% |
| RS — Restlessness | % restless accel windows | 100% | 5% |

**Then:** 70% objective score + 30% morning check-in adjustment (if available)

**Risk levels:** 0–33 = Low · 34–66 = Medium · 67–100 = High

### ✅ What's correct
- Adaptive weights when snoring is disabled (redistributes 10% to other factors)
- Clamp function prevents scores going outside 0–100
- `buildReasons()` generates human-readable explanations for top factors
- Returns both `score`, `risk`, `reasons[]`, and detailed `breakdown{}`

### 🟡 Issue: Screen time is estimated, not measured
```js
const screenTimeMins = (summary.screenOnCount ?? 0) * 8;
// Assumes each screen-on event = 8 minutes average
```
This is a rough proxy. Actual screen time would require `UsageStatsManager`.

---

## Layer 8: ML API Service (`sleepApiService.js`)

### 3-tier fallback strategy
```
1. predictSleepRiskML()    → POST /predict-risk with 7 sessions → BiLSTM + RF
2. computeRiskScore()      → POST /predict-risk with 1 session → rule-based fallback
3. computeDisruptionScore() → local formula (no network needed)
```

### `buildFeaturesFromSessions()` — builds ML input
```js
{
  screen_time_night_mins: screenOnCount * 8,    // rough estimate
  unlocks_night: unlockCount,
  notifications_night: nightNotifCount,
  social_media_mins: socialNotifCount * 3,      // rough proxy
  last_screen_off_hour: hour of session end,
  snoring_mins: snoringTotalMinutes,
  restlessness_percent: 30,                     // ← HARDCODED BUG
  day_of_week: getDay()
}
```

### 🔴 Bug: `restlessness_percent` hardcoded to 30
Real sensor data exists in `sensorSamples` but is ignored.

### 🟡 Issue: `social_media_mins` is estimated from notification count × 3
Should use `UsageStatsManager` for real app usage time.

### 🟡 Issue: `last_screen_off_hour` uses session end time, not last screen event
The actual last screen-off event is in the `screen_events` table but isn't queried here. Session end time is when the user pressed "Stop Sleep" which could be the next morning.

---

## Layer 9: Python ML Backend (`service.py`)

### BiLSTM + RF Risk Prediction
1. Takes 7-day feature matrix (8 features × 7 days)
2. Pads with zeros if fewer than 7 sessions
3. Normalises with `MinMaxScaler`
4. Runs BiLSTM → 3-class probabilities (LOW/MODERATE/HIGH)
5. Runs Random Forest → 3-class probabilities
6. Ensemble: 70% BiLSTM + 30% RF
7. Returns: `risk_class`, `risk_label`, `risk_score (0–100)`, `probabilities`, `contributing_factors`

### CNN Snoring Prediction
1. Accepts WAV/MP3/OGG audio file upload
2. Extracts MFCC features (40 coefficients, 174 time frames)
3. CNN binary classification → snoring / not-snoring
4. Returns: `is_snoring`, `confidence (0–1)`, `threshold`

### 🔴 Critical Bug: Inference scaler fits on inference data
```python
scaler = MinMaxScaler()
X_normalized = scaler.fit_transform(X)  # WRONG at inference time
```
The scaler should be saved during training and loaded here. Currently each inference request gets its own normalisation scale, which is mathematically inconsistent with training. For single-session requests, every feature normalises to 0.

### ✅ What's correct
- Lazy model loading (models load only on first request)
- MFCC extraction matches Colab training parameters exactly
- `contributing_factors` generates human-readable explanations
- Both TFLite models exist in `modal/` directory (not yet wired up)

---

## Layer 10: Firebase Sync (`sleepFirebaseSync.js`)

### What it does
- On session stop: immediately syncs that session to Firestore
- On app startup: checks for any unsynced sessions and uploads them
- Tracks synced session IDs in `AsyncStorage` to avoid double-uploads
- Firestore path: `users/{userId}/sleep_sessions/sleep_session_{id}`

### Payload sent to Firestore
All session stats + computed local risk score + breakdown + components. Useful for multi-device access and research data collection.

### 🟡 Issue: Firebase User ID fallback is hardcoded
```js
return (await AsyncStorage.getItem('current_user_id')) || 'test_user_123';
```
All data for users who aren't logged in goes to Firestore under `test_user_123`. If you have multiple test devices, they all overwrite each other's data. Should use Firebase Auth UID.

---

## Layer 11: Screens

### `SleepHomeScreen.js` — Dashboard
- **On mount:** checks permissions, schedules bedtime reminder, starts passive late-night monitor
- **On mount:** runs `cleanupStaleSessions()`, then `loadDashboard()`
- **loadDashboard logic:**
  1. Shows local score immediately (fast UX)
  2. Then tries ML API (8s timeout)
  3. Falls back to rule-based API (8s timeout)
  4. Falls back to already-shown local score
- **Start session:** starts event tracking + sensor tracking + late-night monitor
- **Stop session:** stops all tracking, syncs to Firebase, reloads dashboard

#### ⚠️ Issue: `handleStartSession` / `handleStopSession` functions are defined but never called
Lines 59–78 define these as free functions outside the component. The actual session logic is inside `onStartSession` / `onStopSession` inside the component. The outer functions call `startLateNightWarningMonitor(newSessionId)` with an undefined variable (`newSessionId`). These outer functions are dead code.

---

### `SleepDetailsScreen.js` — Session Details
- Day / Week / Month view switcher
- **Day view:** shows one session's data + morning check-in + 7-day bar chart
- **Week view:** aggregates last 7 sessions
- **Month view:** groups into 4 weekly buckets

#### Quality score formula (unique to this screen):
```js
quality = (1 - (0.5×durBad + 0.3×unlockBad + 0.2×notifBad)) × 100
// Blended with morning check-in: 60% objective + 40% self-report
```

#### 🔴 Bug: `useEffect` references `ui` before it's computed
```js
useEffect(() => {
  if (!ui?.bars?.length) { ... }  // line 351
}, [ui?.bars, selectedTrendId]);

const ui = useMemo(...);  // defined AFTER at line 362
```
In JavaScript, `const` declarations are not hoisted. This `useEffect` references `ui` before the `useMemo` that defines it. In React, hooks are called in order — `useEffect` registered at line 350 runs after render, by which time `ui` exists. So this works in practice, but the ordering is confusing and violates the rule of declaring before use. Should be refactored to move `useMemo` before the `useEffect`.

#### ✅ What's correct
- Period aggregation logic is solid
- `useMemo` prevents recalculation unless `summary`, `checkIn`, `weeklyData`, or `period` changes
- Morning check-in renders as a rich card with score bars and symptom chips

---

### `SleepTrendScreen.js` — 7-Day Trend (New)
- Loads last 7 sessions from SQLite
- Computes `computeDisruptionScore()` for each
- Shows: summary pills, risk line chart, duration bar chart, session list, weekly insight
- ✅ No extra dependencies — pure React Native

---

### `MorningCheckInScreen.js`
- Collects: sleep quality (0–10), refreshed (0–10), woke up (Yes/No), headache (Yes/No), dry mouth (Yes/No), snoring used (Yes/No)
- Optional: sleep start time + wake time (for latency calculation)
- Saves to `morning_checkins` via `saveMorningCheckIn()`
- ✅ This data feeds back into `computeDisruptionScore()` as 30% subjective adjustment

---

### `SnoringScreen.js`
- Shows live amplitude visualiser
- Live episode counter and total duration
- Start/stop recording button
- ✅ Uses `getLiveSnoringStats()` from `snoringService.js` for real-time updates

---

### `SleepScheduleScreen.js`
- 12-hour time picker for bedtime and wake-up time
- Saves to `user_sleep_settings` table
- ✅ Clears `cachedSettings` so changes take effect immediately in `sleepSettingsService.js`

---

### `DataPermissionsScreen.js`
- Shows status of 3 permissions: Usage Stats, Notification Listener, DND
- Deep links to Android system settings for each permission
- ✅ Uses `settingsAccess` module to check actual permission status

---

## Complete Bug List

### 🔴 High — Fix immediately

| # | File | Bug | Fix |
|---|---|---|---|
| B1 | `sleepApiService.js:96` | `restlessness_percent` hardcoded to `30` | Call `calculateRestlessnessScore(s.sensorSamples)` |
| B2 | `service.py:213` | Scaler fitted on inference data (data leakage) | Save scaler during training, use `.transform()` at inference |
| B3 | `sleepWarningService.js:24` | `WARNING_COOLDOWN_MS = 0` → spams notifications every 5 min | Restore to `30 * 60 * 1000` |
| B4 | `SleepEventModule.kt:82` `SleepSensorModule.kt:358` | Both use notification ID `2001` → overwrites each other | Remove `sendLocalNotification` from `SleepSensorModule.kt` |

### 🟡 Medium — Fix before submission

| # | File | Bug | Fix |
|---|---|---|---|
| B5 | `sleepApiService.js:93` | Social media mins = notifications × 3 (rough) | Use `UsageStatsManager` |
| B6 | `sleepApiService.js:94` | `last_screen_off_hour` = session end hour, not last screen event | Query `screen_events` for last OFF timestamp |
| B7 | `sleepFirebaseSync.js:18` | Firebase user ID fallback = `'test_user_123'` | Wire Firebase Auth UID |
| B8 | `SleepDetailsScreen.js:351` | `useEffect` references `ui` before `useMemo` declaration | Move `useMemo` above `useEffect` |
| B9 | `sleepRepository.js` | No SQL indexes on `session_id` columns | Add `CREATE INDEX` statements to `db.js` |
| B10 | `SleepHomeScreen.js:59–78` | Dead `handleStartSession/handleStopSession` functions | Delete them |

### 🟢 Low — Clean up

| # | File | Issue |
|---|---|---|
| L1 | `notificationService.js` | Entire file is commented out — dead code |
| L2 | `sleepEventService.js:88–122` | Old commented-out charging handlers still in file |
| L3 | `service.py` | Uses `print()` instead of Python `logging` module |
| L4 | `backend-python/app/tests/` | Empty — no unit tests at all |
| L5 | Light sensor data | Collected but not in ML feature vector |

---

## What Is Missing (Not Implemented Yet)

| Feature | Complexity | Research Value |
|---|---|---|
| Backend unit tests | Low | High — required for academic submission |
| Save inference scaler to disk | Low | High — fixes data leakage |
| Real restlessness in ML input | Low | High — data already collected |
| Light exposure as ML feature | Medium | High — well-researched sleep factor |
| Morning check-in → ML feedback loop (`/submit-checkin`) | Medium | Very High |
| TFLite on-device inference | Medium | High — offline operation |
| Firebase Auth wired to userId | Medium | Medium |
| SQL indexes for performance | Low | Medium |
| Pre-sleep stress check-in | Medium | Very High — new research angle |

---

## Summary: Current Health of Each Layer

| Layer | Status | Main Issue |
|---|---|---|
| SQLite schema (9 tables) | ✅ Solid | Minor: double-init on fresh install |
| Repository queries | ✅ Solid | Missing indexes, loads full sensor array |
| Event tracking (screen/charging) | ✅ Working | Dead code in file |
| Sensor tracking (accel/light) | ✅ Working | **Data never used in ML** |
| Snoring detection | ✅ Working | — |
| Notification receiving | ✅ Working | — |
| Warning notifications | ⚠️ Bug | **Cooldown disabled → spam** |
| Local scoring formula | ✅ Solid | Screen time is estimated |
| ML feature builder | 🔴 Bug | Restlessness hardcoded, wrong timestamp field |
| Python backend | 🔴 Bug | **Scaler data leakage** |
| Firebase sync | ✅ Working | User ID is placeholder |
| SleepHomeScreen | ✅ Working | Dead code functions |
| SleepDetailsScreen | ✅ Rich | `useEffect`/`useMemo` ordering issue |
| SleepTrendScreen | ✅ New & complete | — |
| MorningCheckInScreen | ✅ Complete | Not fed back to ML backend |
| SnoringScreen | ✅ Working | — |
| SleepScheduleScreen | ✅ Working | — |
| DataPermissionsScreen | ✅ Working | — |
