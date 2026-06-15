import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase, type LogEntry, type WeatherSnapshot } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import {
  enqueueEntry,
  getPendingEntries,
  getPendingCount,
  removeEntry,
  isNetworkError,
} from '@/lib/offlineQueue';

export function useLogEntries(date?: string) {
  const activeSubject = useAuthStore((s) => s.activeSubject);

  return useQuery({
    queryKey: ['log-entries', activeSubject?.id, date],
    enabled: !!activeSubject?.id,
    queryFn: async (): Promise<LogEntry[]> => {
      let query = supabase
        .from('log_entries')
        .select('*')
        .eq('subject_id', activeSubject!.id)
        .order('timestamp', { ascending: false });

      if (date) {
        const start = `${date}T00:00:00.000Z`;
        const end = `${date}T23:59:59.999Z`;
        query = query.gte('timestamp', start).lte('timestamp', end);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function usePendingCount() {
  return useQuery({
    queryKey: ['pending-count'],
    queryFn: getPendingCount,
    refetchInterval: 10_000,
  });
}

export function useCreateLogEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: {
      type: LogEntry['type'];
      payload: Record<string, unknown>;
      photo_urls?: string[];
      timestamp?: string;
      weather?: WeatherSnapshot | null;
    }) => {
      const { session, activeSubject } = useAuthStore.getState();
      if (!session?.user || !activeSubject) throw new Error('Not authenticated');

      const timestamp = entry.timestamp ?? new Date().toISOString();
      const rowId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });

      try {
        const { data, error } = await supabase
          .from('log_entries')
          .insert({
            subject_id: activeSubject.id,
            logged_by: session.user.id,
            type: entry.type,
            payload: entry.payload,
            photo_urls: entry.photo_urls ?? [],
            timestamp,
            weather: entry.weather ?? null,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (err) {
        if (isNetworkError(err)) {
          // Queue for later sync
          await enqueueEntry({
            id: rowId,
            subject_id: activeSubject.id,
            logged_by: session.user.id,
            type: entry.type,
            entry_timestamp: timestamp,
            payload: entry.payload,
            photo_urls: entry.photo_urls ?? [],
            weather: entry.weather as Record<string, unknown> | null,
          });
          queryClient.invalidateQueries({ queryKey: ['pending-count'] });
          // Return a stub so the UI treats it as saved
          return {
            id: rowId,
            subject_id: activeSubject.id,
            logged_by: session.user.id,
            type: entry.type,
            timestamp,
            payload: entry.payload,
            photo_urls: entry.photo_urls ?? [],
            weather: entry.weather ?? null,
            created_at: timestamp,
            _queued: true,
          } as any;
        }
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['log-entries'] });
    },
  });
}

/** Drains the offline queue when the screen comes into focus. */
export function useDrainQueue() {
  const queryClient = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function drain() {
        const pending = await getPendingEntries();
        if (pending.length === 0) return;

        let synced = 0;
        for (const item of pending) {
          if (!active) break;
          try {
            const { error } = await supabase.from('log_entries').insert({
              subject_id: item.subject_id,
              logged_by: item.logged_by,
              type: item.type,
              payload: item.payload,
              photo_urls: item.photo_urls,
              timestamp: item.entry_timestamp,
              weather: item.weather,
            });
            if (!error) {
              await removeEntry(item.id);
              synced++;
            }
          } catch {
            // Still offline — stop trying
            break;
          }
        }

        if (synced > 0) {
          queryClient.invalidateQueries({ queryKey: ['log-entries'] });
          queryClient.invalidateQueries({ queryKey: ['pending-count'] });
        }
      }

      drain();
      return () => { active = false; };
    }, [queryClient])
  );
}

export function useUpdateLogEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload, timestamp }: { id: string; payload: Record<string, unknown>; timestamp?: string }) => {
      const { error } = await supabase
        .from('log_entries')
        .update(timestamp !== undefined ? { payload, timestamp } : { payload })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['log-entries'] });
    },
  });
}

export function useCreateLibraryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: {
      name: string;
      type: 'medication' | 'cream' | 'supplement' | 'food' | 'recipe';
      default_dose?: string;
      ingredients?: string[];
      barcode?: string;
    }) => {
      const activeSubject = useAuthStore.getState().activeSubject;
      if (!activeSubject) throw new Error('No active subject');
      const { data, error } = await supabase
        .from('library_items')
        .insert({
          subject_id: activeSubject.id,
          type: item.type,
          name: item.name.trim(),
          default_dose: item.default_dose?.trim() || null,
          ingredients: item.ingredients ?? [],
          barcode: item.barcode || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-items'] });
      queryClient.invalidateQueries({ queryKey: ['family-library-items'] });
    },
  });
}

export function useDeleteLogEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('log_entries').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['log-entries'] });
    },
  });
}

export function useDeleteLibraryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('library_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-items'] });
    },
  });
}

export function useLibraryItems(type?: 'medication' | 'cream' | 'supplement' | 'food') {
  const activeSubject = useAuthStore((s) => s.activeSubject);

  return useQuery({
    queryKey: ['library-items', activeSubject?.id, type],
    enabled: !!activeSubject?.id,
    queryFn: async () => {
      let query = supabase
        .from('library_items')
        .select('*')
        .eq('subject_id', activeSubject!.id)
        .order('name');

      if (type) query = query.eq('type', type);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Queries food or recipe library items across the whole family (no subject filter). */
export function useFamilyLibraryItems(type: 'food' | 'recipe') {
  const activeSubject = useAuthStore((s) => s.activeSubject);

  return useQuery({
    queryKey: ['family-library-items', type],
    enabled: !!activeSubject?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('library_items')
        .select('*')
        .eq('type', type)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Returns the most recent log entry of the given type for the active subject. */
export function useLastEntry(type: 'medication' | 'cream') {
  const activeSubject = useAuthStore((s) => s.activeSubject);

  return useQuery({
    queryKey: ['last-entry', activeSubject?.id, type],
    enabled: !!activeSubject?.id,
    queryFn: async (): Promise<LogEntry | null> => {
      const { data, error } = await supabase
        .from('log_entries')
        .select('*')
        .eq('subject_id', activeSubject!.id)
        .eq('type', type)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
