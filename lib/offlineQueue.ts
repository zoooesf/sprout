import * as SQLite from 'expo-sqlite';

export interface QueuedEntry {
  id: string;
  subject_id: string;
  logged_by: string;
  type: string;
  entry_timestamp: string;
  payload: Record<string, unknown>;
  photo_urls: string[];
  weather: Record<string, unknown> | null;
  queued_at: number;
}

let _db: SQLite.SQLiteDatabase | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('sprout_offline.db');
  await _db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS pending_entries (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      logged_by TEXT NOT NULL,
      type TEXT NOT NULL,
      entry_timestamp TEXT NOT NULL,
      payload TEXT NOT NULL,
      photo_urls TEXT NOT NULL DEFAULT '[]',
      weather TEXT,
      queued_at INTEGER NOT NULL
    );
  `);
  return _db;
}

export async function enqueueEntry(entry: Omit<QueuedEntry, 'queued_at'>): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO pending_entries
      (id, subject_id, logged_by, type, entry_timestamp, payload, photo_urls, weather, queued_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    entry.id,
    entry.subject_id,
    entry.logged_by,
    entry.type,
    entry.entry_timestamp,
    JSON.stringify(entry.payload),
    JSON.stringify(entry.photo_urls),
    entry.weather ? JSON.stringify(entry.weather) : null,
    Date.now()
  );
}

export async function getPendingEntries(): Promise<QueuedEntry[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Record<string, any>>(
    'SELECT * FROM pending_entries ORDER BY queued_at ASC'
  );
  return rows.map(parseRow);
}

export async function getPendingCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM pending_entries'
  );
  return row?.count ?? 0;
}

export async function removeEntry(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM pending_entries WHERE id = ?', id);
}

export async function clearAll(): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM pending_entries');
}

function parseRow(row: Record<string, any>): QueuedEntry {
  return {
    id: row.id,
    subject_id: row.subject_id,
    logged_by: row.logged_by,
    type: row.type,
    entry_timestamp: row.entry_timestamp,
    payload: JSON.parse(row.payload),
    photo_urls: JSON.parse(row.photo_urls),
    weather: row.weather ? JSON.parse(row.weather) : null,
    queued_at: row.queued_at,
  };
}

export function isNetworkError(error: unknown): boolean {
  const msg = (error as any)?.message ?? '';
  return (
    msg.includes('Failed to fetch') ||
    msg.includes('Network request failed') ||
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('offline') ||
    msg.includes('ERR_INTERNET_DISCONNECTED')
  );
}
