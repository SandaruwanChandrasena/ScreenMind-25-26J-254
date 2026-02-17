import SQLite from "react-native-sqlite-storage";

SQLite.enablePromise(true);
// Optional debug:
// SQLite.DEBUG(true);

const DB_NAME = "screenmind.db";

let dbInstance = null;
let initialized = false;

async function ensureTables(db) {
  // Create tables once
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS sleep_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      start_time INTEGER NOT NULL,
      end_time INTEGER,
      created_at INTEGER NOT NULL
    );
  `);

  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS screen_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      session_id INTEGER,
      event_type TEXT NOT NULL,
      ts INTEGER NOT NULL,
      meta TEXT,
      FOREIGN KEY(session_id) REFERENCES sleep_sessions(id)
    );
  `);

  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS notification_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      session_id INTEGER,
      package_name TEXT,
      title TEXT,
      ts INTEGER NOT NULL,
      FOREIGN KEY(session_id) REFERENCES sleep_sessions(id)
    );
  `);

  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS sensor_samples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      session_id INTEGER,
      sensor_type TEXT NOT NULL,
      x REAL,
      y REAL,
      z REAL,
      value REAL,
      ts INTEGER NOT NULL,
      FOREIGN KEY(session_id) REFERENCES sleep_sessions(id)
    );
  `);

  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS morning_checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      session_id INTEGER,
      sleep_quality INTEGER,
      refreshed INTEGER,
      woke_up TEXT,
      headache TEXT,
      dry_mouth TEXT,
      snore_used TEXT,
      ts INTEGER NOT NULL,
      FOREIGN KEY(session_id) REFERENCES sleep_sessions(id)
    );
  `);
}

export async function getDB() {
  try {
    if (dbInstance) {
      // Ensure tables exist (first time only)
      if (!initialized) {
        await ensureTables(dbInstance);
        initialized = true;
      }
      return dbInstance;
    }

    // ✅ Use stable signature (avoids "Cannot convert null value to object")
    // openDatabase(name, version, displayName, size)
    dbInstance = await SQLite.openDatabase(DB_NAME, "1.0", "ScreenMind DB", 200000);

    // Create tables immediately (avoids init race)
    await ensureTables(dbInstance);
    initialized = true;

    return dbInstance;
  } catch (e) {
    console.log("SQLite openDatabase error:", e);

    // Very common if native module isn't linked
    throw new Error(
      "SQLite failed to open. Check installation/linking and rebuild the Android app."
    );
  }
}

// optional if you still want to call init explicitly
export async function initSleepDB() {
  const db = await getDB();
  return !!db;
}
