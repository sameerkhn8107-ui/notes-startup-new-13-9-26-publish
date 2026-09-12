// Native (SQLite) versioned migration runner.
//
// Safety model:
//   1. Read PRAGMA user_version.
//   2. For each pending version, take a SAFETY SNAPSHOT of the db file.
//   3. Apply the migration inside a transaction (auto-rollback on throw).
//   4. VALIDATE the resulting schema; throw (keeping snapshot) on failure.
//   5. Bump user_version only after success.
//
// All migrations here are ADDITIVE (CREATE TABLE IF NOT EXISTS) so existing
// notes/folders/labels data is never modified.
import type * as SQLite from "expo-sqlite";
import * as FileSystem from "expo-file-system/legacy";

export const LATEST_SCHEMA_VERSION = 2;

const DB_DIR = FileSystem.documentDirectory + "SQLite/";
const DB_FILE = DB_DIR + "notes_app.db";

async function getUserVersion(db: SQLite.SQLiteDatabase): Promise<number> {
  try {
    const row = await db.getFirstAsync<{ user_version: number }>(
      "PRAGMA user_version",
    );
    return row?.user_version ?? 0;
  } catch {
    return 0;
  }
}

async function setUserVersion(
  db: SQLite.SQLiteDatabase,
  v: number,
): Promise<void> {
  await db.execAsync(`PRAGMA user_version = ${v}`);
}

async function snapshot(target: number): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(DB_FILE);
    if (info.exists && !info.isDirectory) {
      const dest = `${DB_DIR}notes_app.premigration_v${target}.bak`;
      await FileSystem.copyAsync({ from: DB_FILE, to: dest });
      console.log(`[migrations] safety snapshot created -> ${dest}`);
    }
  } catch (e) {
    // Snapshot failure must not block an additive migration, but we log it.
    console.warn(`[migrations] snapshot for v${target} failed`, e);
  }
}

type Migration = {
  version: number;
  up: (db: SQLite.SQLiteDatabase) => Promise<void>;
  validate: (db: SQLite.SQLiteDatabase) => Promise<boolean>;
};

async function tableExists(
  db: SQLite.SQLiteDatabase,
  name: string,
): Promise<boolean> {
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) AS c FROM sqlite_master WHERE type='table' AND name=?`,
    [name],
  );
  return (row?.c ?? 0) > 0;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    up: async (db) => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS pages (
          id TEXT PRIMARY KEY NOT NULL,
          parentPageId TEXT,
          title TEXT NOT NULL DEFAULT '',
          icon TEXT NOT NULL DEFAULT '',
          cover TEXT,
          orderIndex INTEGER NOT NULL DEFAULT 0,
          isFavorite INTEGER NOT NULL DEFAULT 0,
          isArchived INTEGER NOT NULL DEFAULT 0,
          isDeleted INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          deletedAt TEXT
        );
        CREATE TABLE IF NOT EXISTS blocks (
          id TEXT PRIMARY KEY NOT NULL,
          pageId TEXT NOT NULL,
          parentBlockId TEXT,
          type TEXT NOT NULL DEFAULT 'text',
          content TEXT NOT NULL DEFAULT '{}',
          depth INTEGER NOT NULL DEFAULT 0,
          orderIndex INTEGER NOT NULL DEFAULT 0,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_pages_parent ON pages(parentPageId);
        CREATE INDEX IF NOT EXISTS idx_pages_deleted ON pages(isDeleted);
        CREATE INDEX IF NOT EXISTS idx_pages_favorite ON pages(isFavorite);
        CREATE INDEX IF NOT EXISTS idx_pages_order ON pages(orderIndex);
        CREATE INDEX IF NOT EXISTS idx_blocks_page ON blocks(pageId);
        CREATE INDEX IF NOT EXISTS idx_blocks_order ON blocks(orderIndex);
      `);
    },
    validate: async (db) => {
      return (await tableExists(db, "pages")) && (await tableExists(db, "blocks"));
    },
  },
  {
    version: 2,
    up: async (db) => {
      // Single key/value document store for all M2-M7 workspace entities
      // (databases, properties, records, views, comments, tasks, projects,
      // reminders, version history, template metadata). Additive & safe.
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS kv (
          key TEXT PRIMARY KEY NOT NULL,
          value TEXT NOT NULL DEFAULT '{}'
        );
      `);
    },
    validate: async (db) => {
      return await tableExists(db, "kv");
    },
  },
];

export async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  let current = await getUserVersion(db);
  if (current >= LATEST_SCHEMA_VERSION) return;

  for (const m of MIGRATIONS) {
    if (m.version <= current) continue;
    await snapshot(m.version);
    try {
      await db.withTransactionAsync(async () => {
        await m.up(db);
      });
      const ok = await m.validate(db);
      if (!ok) {
        throw new Error(`validation failed for migration v${m.version}`);
      }
      await setUserVersion(db, m.version);
      current = m.version;
      console.log(`[migrations] applied v${m.version}`);
    } catch (e) {
      // Transaction already rolled back; snapshot preserved for recovery.
      console.warn(`[migrations] v${m.version} failed — rolled back`, e);
      throw e;
    }
  }
}
