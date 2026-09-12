import * as SQLite from "expo-sqlite";

import { runMigrations } from "./migrations";

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS folders (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'text',
  color TEXT NOT NULL DEFAULT 'default',
  folderId TEXT,
  isPinned INTEGER NOT NULL DEFAULT 0,
  isFavorite INTEGER NOT NULL DEFAULT 0,
  isArchived INTEGER NOT NULL DEFAULT 0,
  isDeleted INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  deletedAt TEXT
);

CREATE TABLE IF NOT EXISTS checklist_items (
  id TEXT PRIMARY KEY NOT NULL,
  noteId TEXT NOT NULL,
  text TEXT NOT NULL DEFAULT '',
  isCompleted INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS note_labels (
  noteId TEXT NOT NULL,
  labelId TEXT NOT NULL,
  PRIMARY KEY (noteId, labelId)
);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY NOT NULL,
  noteId TEXT NOT NULL,
  type TEXT NOT NULL,
  localPath TEXT NOT NULL,
  fileName TEXT,
  fileSize INTEGER,
  duration INTEGER,
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title);
CREATE INDEX IF NOT EXISTS idx_notes_folder ON notes(folderId);
CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(createdAt);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updatedAt);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON notes(isPinned);
CREATE INDEX IF NOT EXISTS idx_notes_favorite ON notes(isFavorite);
CREATE INDEX IF NOT EXISTS idx_notes_archived ON notes(isArchived);
CREATE INDEX IF NOT EXISTS idx_notes_deleted ON notes(isDeleted);
CREATE INDEX IF NOT EXISTS idx_checklist_note ON checklist_items(noteId);
CREATE INDEX IF NOT EXISTS idx_attachments_note ON attachments(noteId);
CREATE INDEX IF NOT EXISTS idx_notelabels_label ON note_labels(labelId);
CREATE INDEX IF NOT EXISTS idx_notelabels_note ON note_labels(noteId);
`;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync("notes_app.db");
    await db.execAsync(SCHEMA);
    // Apply versioned, additive migrations (pages/blocks for the Workspace).
    // Failures here are swallowed so the core notes app always stays usable.
    try {
      await runMigrations(db);
    } catch (e) {
      console.warn("[database] migrations failed (app continues)", e);
    }
    dbInstance = db;
    return db;
  })();
  return initPromise;
}
