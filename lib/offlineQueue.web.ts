// Web platform stub: uses localStorage instead of expo-sqlite

const STORAGE_KEY = 'sprout_offline_queue';

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

function load(): QueuedEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function save(entries: QueuedEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function enqueueEntry(entry: Omit<QueuedEntry, 'queued_at'>): Promise<void> {
  const entries = load();
  const existing = entries.findIndex((e) => e.id === entry.id);
  const record = { ...entry, queued_at: Date.now() };
  if (existing >= 0) entries[existing] = record;
  else entries.push(record);
  save(entries);
}

export async function getPendingEntries(): Promise<QueuedEntry[]> {
  return load().sort((a, b) => a.queued_at - b.queued_at);
}

export async function getPendingCount(): Promise<number> {
  return load().length;
}

export async function removeEntry(id: string): Promise<void> {
  save(load().filter((e) => e.id !== id));
}

export async function clearAll(): Promise<void> {
  save([]);
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
