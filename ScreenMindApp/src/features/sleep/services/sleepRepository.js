import { getDB } from "./db";

/**
 * Helper to run SQL safely
 */
async function exec(db, sql, params = []) {
  const res = await db.executeSql(sql, params);
  // res is array of [resultSet]; RN SQLite returns [ResultSet]
  return res[0];
}

/**
 * Create a new sleep session
 * Returns sessionId
 */
export async function startSleepSession({ userId = null, startTime = Date.now() }) {
  const db = await getDB();
  const createdAt = Date.now();

  const rs = await exec(
    db,
    `INSERT INTO sleep_sessions (user_id, start_time, end_time, created_at)
     VALUES (?, ?, NULL, ?);`,
    [userId, startTime, createdAt]
  );

  return rs.insertId;
}

/**
 * End a session
 */
export async function stopSleepSession({ sessionId, endTime = Date.now() }) {
  const db = await getDB();

  await exec(
    db,
    `UPDATE sleep_sessions SET end_time = ? WHERE id = ?;`,
    [endTime, sessionId]
  );

  return true;
}

/**
 * Get current running session (end_time IS NULL)
 */
export async function getActiveSleepSession(userId = null) {
  const db = await getDB();

  // ✅ If userId is null, do NOT include user_id filter
  if (userId == null) {
    const rs = await exec(
      db,
      `SELECT * FROM sleep_sessions
       WHERE end_time IS NULL
       ORDER BY start_time DESC
       LIMIT 1;`,
      []
    );
    return rs.rows.length ? rs.rows.item(0) : null;
  }

  const rs = await exec(
    db,
    `SELECT * FROM sleep_sessions
     WHERE end_time IS NULL AND user_id = ?
     ORDER BY start_time DESC
     LIMIT 1;`,
    [userId]
  );

  return rs.rows.length ? rs.rows.item(0) : null;
}


/**
 * Insert screen event: ON/OFF/UNLOCK
 */
export async function logScreenEvent({ userId = null, sessionId = null, eventType, ts = Date.now(), meta = null }) {
  const db = await getDB();

  await exec(
    db,
    `INSERT INTO screen_events (user_id, session_id, event_type, ts, meta)
     VALUES (?, ?, ?, ?, ?);`,
    [userId, sessionId, eventType, ts, meta ? JSON.stringify(meta) : null]
  );

  return true;
}

/**
 * Insert notification event
 */
// export async function logNotificationEvent({
//   userId = null,
//   sessionId = null,
//   packageName = null,
//   title = null,
//   ts = Date.now(),
// }) {
//   const db = await getDB();

//   await exec(
//     db,
//     `INSERT INTO notification_events (user_id, session_id, package_name, title, ts)
//      VALUES (?, ?, ?, ?, ?);`,
//     [userId, sessionId, packageName, title, ts]
//   );

//   return true;
// }

export async function logNotificationEvent({
  userId = null,
  sessionId = null,
  packageName = null,
  title = null,
  ts = Date.now(),
  isNight = 0,         // ← NEW
  isSocialMedia = 0,   // ← NEW
}) {
  const db = await getDB();

  await exec(
    db,
    `INSERT INTO notification_events 
     (user_id, session_id, package_name, title, 
      ts, is_night, is_social_media)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [userId, sessionId, packageName, title,
     ts, isNight, isSocialMedia]
  );

  return true;
}

/**
 * Insert sensor sample
 * For ACCEL/GYRO use x,y,z. For LIGHT use value.
 */
// export async function logSensorSample({
//   userId = null,
//   sessionId = null,
//   sensorType,
//   x = null,
//   y = null,
//   z = null,
//   value = null,
//   ts = Date.now(),
// }) {
//   const db = await getDB();

//   await exec(
//     db,
//     `INSERT INTO sensor_samples (user_id, session_id, sensor_type, x, y, z, value, ts)
//      VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
//     [userId, sessionId, sensorType, x, y, z, value, ts]
//   );

//   return true;
// }

export async function logSensorSample({
  userId = null,
  sessionId = null,
  sensorType,
  x = null,
  y = null,
  z = null,
  value = null,
  ts = Date.now(),
  meta = null,       // ← ADD THIS
}) {
  const db = await getDB();

  await exec(
    db,
    `INSERT INTO sensor_samples 
     (user_id, session_id, sensor_type, x, y, z, value, ts, meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [userId, sessionId, sensorType, x, y, z, value, ts, meta]
  );

  return true;
}


export async function getSessionSensorSamples(sessionId) {
  const db = await getDB();
  const rs = await exec(
    db,
    `SELECT * FROM sensor_samples 
     WHERE session_id = ? 
     ORDER BY ts ASC;`,
    [sessionId]
  );
  
  const samples = [];
  for (let i = 0; i < rs.rows.length; i++) {
    samples.push(rs.rows.item(i));
  }
  return samples;
}

/**
 * Save morning check-in
 */
export async function saveMorningCheckIn({
  userId = null,
  sessionId = null,
  sleepQuality,
  refreshed,
  wokeUp,
  headache,
  dryMouth,
  snoreUsed,
  ts = Date.now(),
}) {
  const db = await getDB();

  await exec(
    db,
    `INSERT INTO morning_checkins
     (user_id, session_id, sleep_quality, refreshed, woke_up, headache, dry_mouth, snore_used, ts)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [userId, sessionId, sleepQuality, refreshed, wokeUp, headache, dryMouth, snoreUsed, ts]
  );

  return true;
}

/**
 * Build a "night summary" from a session
 * (counts + duration)
 */
// export async function getSessionSummary(sessionId) {
//   const db = await getDB();

//   // Get session times
//   const srs = await exec(db, `SELECT * FROM sleep_sessions WHERE id = ? LIMIT 1;`, [sessionId]);
//   if (srs.rows.length === 0) return null;

//   const session = srs.rows.item(0);
//   const start = session.start_time;
//   const end = session.end_time ?? Date.now(); // if still running

//   const durationMs = Math.max(0, end - start);

//   // Count unlocks
//   const unlockRS = await exec(
//     db,
//     `SELECT COUNT(*) as c FROM screen_events WHERE session_id = ? AND event_type = 'UNLOCK';`,
//     [sessionId]
//   );
//   const unlockCount = unlockRS.rows.item(0).c;

//   // Count screen ON events (rough restlessness proxy)
//   const onRS = await exec(
//     db,
//     `SELECT COUNT(*) as c FROM screen_events WHERE session_id = ? AND event_type = 'ON';`,
//     [sessionId]
//   );
//   const screenOnCount = onRS.rows.item(0).c;

//   // Count notifications
//   const notifRS = await exec(
//     db,
//     `SELECT COUNT(*) as c FROM notification_events WHERE session_id = ?;`,
//     [sessionId]
//   );
//   const notifCount = notifRS.rows.item(0).c;

//   // Check-in (if exists)
//   const checkRS = await exec(
//     db,
//     `SELECT * FROM morning_checkins WHERE session_id = ? ORDER BY ts DESC LIMIT 1;`,
//     [sessionId]
//   );
//   const checkIn = checkRS.rows.length ? checkRS.rows.item(0) : null;

//   return {
//     sessionId,
//     start,
//     end: session.end_time,
//     durationMs,
//     unlockCount,
//     screenOnCount,
//     notifCount,
//     checkIn,
//   };
// }

export async function getSessionSummary(sessionId) {
  const db = await getDB();

  const srs = await exec(
    db, 
    `SELECT * FROM sleep_sessions WHERE id = ? LIMIT 1;`, 
    [sessionId]
  );
  if (srs.rows.length === 0) return null;

  const session = srs.rows.item(0);
  const start = session.start_time;
  const end = session.end_time ?? Date.now();
  const durationMs = Math.max(0, end - start);

  // Count unlocks (night only)
  const unlockRS = await exec(db,
    `SELECT COUNT(*) as c FROM screen_events 
     WHERE session_id = ? AND event_type = 'UNLOCK';`,
    [sessionId]
  );

  // Count screen ON events
  const onRS = await exec(db,
    `SELECT COUNT(*) as c FROM screen_events 
     WHERE session_id = ? AND event_type = 'ON';`,
    [sessionId]
  );

  // Count all notifications
  const notifRS = await exec(db,
    `SELECT COUNT(*) as c FROM notification_events 
     WHERE session_id = ?;`,
    [sessionId]
  );

  // Count night notifications
  const nightNotifRS = await exec(db,
    `SELECT COUNT(*) as c FROM notification_events 
     WHERE session_id = ? AND is_night = 1;`,
    [sessionId]
  );

  // Count social media notifications
  const socialNotifRS = await exec(db,
    `SELECT COUNT(*) as c FROM notification_events 
     WHERE session_id = ? AND is_social_media = 1;`,
    [sessionId]
  );

  // Get charging events
  const chargingRS = await exec(db,
    `SELECT ts FROM screen_events 
     WHERE session_id = ? AND event_type = 'CHARGING_START'
     ORDER BY ts ASC LIMIT 1;`,
    [sessionId]
  );

  // Get sensor samples
  const sensorRS = await exec(db,
    `SELECT * FROM sensor_samples 
     WHERE session_id = ? ORDER BY ts ASC;`,
    [sessionId]
  );
  const sensorSamples = [];
  for (let i = 0; i < sensorRS.rows.length; i++) {
    sensorSamples.push(sensorRS.rows.item(i));
  }

  // Get snoring data
  const snoreRS = await exec(db,
    `SELECT * FROM snoring_events 
     WHERE session_id = ?;`,
    [sessionId]
  );
  const snoringEvents = [];
  for (let i = 0; i < snoreRS.rows.length; i++) {
    snoringEvents.push(snoreRS.rows.item(i));
  }

  // Check-in
  const checkRS = await exec(db,
    `SELECT * FROM morning_checkins 
     WHERE session_id = ? ORDER BY ts DESC LIMIT 1;`,
    [sessionId]
  );
  const checkIn = checkRS.rows.length 
    ? checkRS.rows.item(0) : null;

  // Calculate totals
  const snoringTotalSeconds = snoringEvents.reduce(
    (sum, e) => sum + (e.duration_seconds || 0), 0
  );

  return {
    sessionId,
    start,
    end: session.end_time,
    durationMs,
    unlockCount: unlockRS.rows.item(0).c,
    screenOnCount: onRS.rows.item(0).c,
    notifCount: notifRS.rows.item(0).c,
    nightNotifCount: nightNotifRS.rows.item(0).c,
    socialNotifCount: socialNotifRS.rows.item(0).c,
    chargingStartTime: chargingRS.rows.length 
      ? chargingRS.rows.item(0).ts : null,
    sensorSamples,
    snoringEvents,
    snoringTotalMinutes: Math.round(snoringTotalSeconds / 60),
    checkIn,
  };
}


/**
 * Save a single snoring episode
 */
export async function saveSnoringEpisode({
  userId = null,
  sessionId = null,
  startTs,
  endTs,
  durationSeconds,
  intensity = "Mild",
}) {
  const db = await getDB();

  await exec(
    db,
    `INSERT INTO snoring_events
     (user_id, session_id, start_ts, end_ts, 
      duration_seconds, intensity)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [userId, sessionId, startTs, endTs, 
     durationSeconds, intensity]
  );

  return true;
}

/**
 * Get all snoring episodes for a session
 */
export async function getSnoringEpisodes(sessionId) {
  const db = await getDB();

  const rs = await exec(
    db,
    `SELECT * FROM snoring_events
     WHERE session_id = ?
     ORDER BY start_ts ASC;`,
    [sessionId]
  );

  const episodes = [];
  for (let i = 0; i < rs.rows.length; i++) {
    episodes.push(rs.rows.item(i));
  }
  return episodes;
}

/**
 * Get snoring report summary for a session
 */
export async function getSnoringReport(sessionId) {
  const db = await getDB();

  const rs = await exec(
    db,
    `SELECT 
       COUNT(*) as episode_count,
       SUM(duration_seconds) as total_seconds,
       MAX(intensity) as worst_intensity
     FROM snoring_events
     WHERE session_id = ?;`,
    [sessionId]
  );

  const row = rs.rows.item(0);
  const totalSeconds = row.total_seconds ?? 0;
  const totalMinutes = Math.round(totalSeconds / 60);

  // Calculate intensity
  let intensity = "None";
  if (totalMinutes > 0 && totalMinutes < 15) intensity = "Mild";
  else if (totalMinutes >= 15 && totalMinutes < 45) 
    intensity = "Moderate";
  else if (totalMinutes >= 45) intensity = "Severe";

  // Get all episodes for timeline
  const episodes = await getSnoringEpisodes(sessionId);

  return {
    episodeCount: row.episode_count ?? 0,
    totalMinutes,
    totalSeconds,
    intensity,
    episodes,
  };
}

/**
 * Debug: dump snoring table
 */
export async function debugDumpSnoringTable() {
  const db = await getDB();
  const rs = await exec(
    db, 
    `SELECT * FROM snoring_events ORDER BY id DESC LIMIT 20;`, 
    []
  );

  console.log("=== SNORING EVENTS TABLE ===");
  for (let i = 0; i < rs.rows.length; i++) {
    console.log(JSON.stringify(rs.rows.item(i)));
  }
  console.log("============================");
}


export async function getLatestCompletedSession(userId = null) {
  const db = await getDB();

  if (userId == null) {
    const rs = await exec(
      db,
      `SELECT * FROM sleep_sessions
       WHERE end_time IS NOT NULL
       ORDER BY end_time DESC
       LIMIT 1;`,
      []
    );
    return rs.rows.length ? rs.rows.item(0) : null;
  }

  const rs = await exec(
    db,
    `SELECT * FROM sleep_sessions
     WHERE end_time IS NOT NULL AND user_id = ?
     ORDER BY end_time DESC
     LIMIT 1;`,
    [userId]
  );

  return rs.rows.length ? rs.rows.item(0) : null;
}

