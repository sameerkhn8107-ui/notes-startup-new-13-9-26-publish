// Native key/value document store, backed by the SQLite `kv` table (migration v2).
import { getDb } from "./database";

export async function kvGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      `SELECT value FROM kv WHERE key = ?`,
      [key],
    );
    if (!row?.value) return fallback;
    const parsed = JSON.parse(row.value);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO kv (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, JSON.stringify(value)],
  );
}
