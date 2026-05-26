require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = process.env.DATABASE_PATH || '/app/data/hackerchat.db';

let db;

function getDB() {
  if (!db) {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT,
      color TEXT DEFAULT '#0f0',
      role TEXT DEFAULT 'user' CHECK(role IN ('user','mod','admin')),
      token TEXT UNIQUE,
      ip TEXT,
      banned INTEGER DEFAULT 0,
      muted_until INTEGER DEFAULT 0,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      unlocked_features TEXT DEFAULT '',
      security_answer TEXT DEFAULT '',
      created_at INTEGER DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      topic TEXT DEFAULT '',
      owner_id INTEGER REFERENCES users(id),
      password TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS room_members (
      user_id INTEGER REFERENCES users(id),
      room_id INTEGER REFERENCES rooms(id),
      joined_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (user_id, room_id)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER REFERENCES rooms(id),
      user_id INTEGER REFERENCES users(id),
      username TEXT NOT NULL,
      color TEXT DEFAULT '#0f0',
      text TEXT NOT NULL,
      type TEXT DEFAULT 'user',
      created_at INTEGER DEFAULT (unixepoch())
    );
    CREATE TABLE IF NOT EXISTS bans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      room_id INTEGER REFERENCES rooms(id),
      banned_by INTEGER REFERENCES users(id),
      reason TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(username);
    CREATE TABLE IF NOT EXISTS reputation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_username TEXT NOT NULL,
      voter_username TEXT NOT NULL,
      value INTEGER NOT NULL CHECK(value IN (-1, 1)),
      created_at INTEGER DEFAULT (unixepoch()),
      UNIQUE(target_username, voter_username)
    );
    CREATE TABLE IF NOT EXISTS ephemeral_rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_name TEXT UNIQUE NOT NULL,
      delete_after INTEGER NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    );
  `);
  // Add XP columns to existing users table if missing
  try { db.exec('ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0'); } catch (e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN level INTEGER DEFAULT 1'); } catch (e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN unlocked_features TEXT DEFAULT ""'); } catch (e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN security_answer TEXT DEFAULT ""'); } catch (e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN dnd INTEGER DEFAULT 0'); } catch (e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN last_login INTEGER DEFAULT 0'); } catch (e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN favorite_cmds TEXT DEFAULT ""'); } catch (e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN device_id TEXT DEFAULT ""'); } catch (e) {}
  try { db.exec('ALTER TABLE users ADD COLUMN device_banned INTEGER DEFAULT 0'); } catch (e) {}
  db.exec(`
    CREATE TABLE IF NOT EXISTS device_bans (
      device_id TEXT PRIMARY KEY,
      banned_at INTEGER DEFAULT (unixepoch())
    );
  `);
  // Seed default lobby room if missing
  const exists = db.prepare('SELECT id FROM rooms WHERE name = ?').get('lobby');
  if (!exists) {
    db.prepare('INSERT INTO rooms (name, topic) VALUES (?, ?)').run('lobby', 'General discussion');
  }
}

function close() {
  if (db) { db.close(); db = null; }
}

// Allow direct execution: node db.js
if (require.main === module) {
  console.log('[DB] Initializing database...');
  getDB();
  console.log('[DB] Database ready at', DB_PATH);
  const count = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  console.log('[DB] Users:', count, '| Rooms:', db.prepare('SELECT COUNT(*) as c FROM rooms').get().c);
  close();
  console.log('[DB] Done.');
}

module.exports = { getDB, close };
