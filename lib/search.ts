import type { LogEntry } from '@/lib/supabase';

/** Lowercased, space-joined blob of every free-text field relevant to this entry's type. */
export function getSearchBlob(entry: LogEntry): string {
  const p = entry.payload as Record<string, any>;
  const parts: unknown[] = [];
  switch (entry.type) {
    case 'food':
      parts.push(p.name, ...(p.ingredients ?? []), p.reaction);
      break;
    case 'medication':
      parts.push(p.library_item_name, p.dose, p.notes);
      break;
    case 'cream':
      parts.push(p.library_item_name, ...(p.areas ?? []), p.amount, p.notes);
      break;
    case 'sleep':
      parts.push(p.notes);
      break;
    case 'checkin':
      parts.push(...(p.symptoms ?? []), p.notes);
      break;
    case 'photo':
      parts.push(...(p.areas ?? []), p.caption);
      break;
    case 'note':
      parts.push(p.text);
      break;
  }
  return parts.filter((v): v is string => typeof v === 'string' && v.length > 0)
    .join(' ')
    .toLowerCase();
}

/** The list-type payload field used for tag refinement, or [] if this type has none. */
export function getEntryTags(entry: LogEntry): string[] {
  const p = entry.payload as Record<string, any>;
  switch (entry.type) {
    case 'photo': return p.areas ?? [];
    case 'cream': return p.areas ?? [];
    case 'food': return p.ingredients ?? [];
    case 'checkin': return p.symptoms ?? [];
    default: return [];
  }
}

export interface SearchFilters {
  /** Empty set = no type restriction (match all types). */
  types: Set<LogEntry['type']>;
  /** Raw query text; trimmed/lowercased internally. */
  query: string;
  /** Empty set = no tag restriction; otherwise OR-match against the entry's tags. */
  tags: Set<string>;
}

export function filterEntries(entries: LogEntry[], filters: SearchFilters): LogEntry[] {
  const q = filters.query.trim().toLowerCase();
  return entries.filter((e) => {
    if (filters.types.size > 0 && !filters.types.has(e.type)) return false;
    if (q && !getSearchBlob(e).includes(q)) return false;
    if (filters.tags.size > 0) {
      const tags = getEntryTags(e);
      if (!tags.some((t) => filters.tags.has(t))) return false;
    }
    return true;
  });
}

/** Sorted distinct tag values present across the given entries. */
export function computeAvailableTags(entries: LogEntry[]): string[] {
  const set = new Set<string>();
  for (const e of entries) {
    for (const t of getEntryTags(e)) set.add(t);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
