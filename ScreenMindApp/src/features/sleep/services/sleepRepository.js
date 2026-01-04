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
  const rs = await exec(
    db,
    `SELECT * FROM sleep_sessions
     WHERE end_time IS NULL AND (? IS NULL OR user_id = ?)
     ORDER BY start_time DESC
     LIMIT 1;`,
    [userId, userId]
  );

  if (rs.rows.length === 0) return null;
  return rs.rows.item(0);
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
export async function logNotificationEvent({
  userId = null,
  sessionId = null,
  packageName = null,
  title = null,
  ts = Date.now(),
}) {
  const db = await getDB();

  await exec(
    db,
    `INSERT INTO notification_events (user_id, session_id, package_name, title, ts)
     VALUES (?, ?, ?, ?, ?);`,
    [userId, sessionId, packageName, title, ts]
  );

  return true;
}

/**
 * Insert sensor sample
 * For ACCEL/GYRO use x,y,z. For LIGHT use value.
 */
export async function logSensorSample({
  userId = null,
  sessionId = null,
  sensorType,
  x = null,
  y = null,
  z = null,
  value = null,
  ts = Date.now(),
}) {
  const db = await getDB();

  await exec(
    db,
    `INSERT INTO sensor_samples (user_id, session_id, sensor_type, x, y, z, value, ts)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [userId, sessionId, sensorType, x, y, z, value, ts]
  );

  return true;
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
export async function getSessionSummary(sessionId) {
  const db = await getDB();

  // Get session times
  const srs = await exec(db, `SELECT * FROM sleep_sessions WHERE id = ? LIMIT 1;`, [sessionId]);
  if (srs.rows.length === 0) return null;

  const session = srs.rows.item(0);
  const start = session.start_time;
  const end = session.end_time ?? Date.now(); // if still running

  const durationMs = Math.max(0, end - start);

  // Count unlocks
  const unlockRS = await exec(
    db,
    `SELECT COUNT(*) as c FROM screen_events WHERE session_id = ? AND event_type = 'UNLOCK';`,
    [sessionId]
  );
  const unlockCount = unlockRS.rows.item(0).c;

  // Count screen ON events (rough restlessness proxy)
  const onRS = await exec(
    db,
    `SELECT COUNT(*) as c FROM screen_events WHERE session_id = ? AND event_type = 'ON';`,
    [sessionId]
  );
  const screenOnCount = onRS.rows.item(0).c;

  // Count notifications
  const notifRS = await exec(
    db,
    `SELECT COUNT(*) as c FROM notification_events WHERE session_id = ?;`,
    [sessionId]
  );
  const notifCount = notifRS.rows.item(0).c;

  // Check-in (if exists)
  const checkRS = await exec(
    db,
    `SELECT * FROM morning_checkins WHERE session_id = ? ORDER BY ts DESC LIMIT 1;`,
    [sessionId]
  );
  const checkIn = checkRS.rows.length ? checkRS.rows.item(0) : null;

  return {
    sessionId,
    start,
    end: session.end_time,
    durationMs,
    unlockCount,
    screenOnCount,
    notifCount,
    checkIn,
  };
}

export async function getLatestCompletedSession(userId = null) {
  const db = await getDB();

  const rs = await exec(
    db,
    `SELECT * FROM sleep_sessions
     WHERE end_time IS NOT NULL
     AND (? IS NULL OR user_id = ?)
     ORDER BY end_time DESC
     LIMIT 1;`,
    [userId, userId]
  );

  if (rs.rows.length === 0) return null;
  return rs.rows.item(0);
}
