import { useQuery } from '@tanstack/react-query';
import { supabase, type LogEntry } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

/** Fetches every log entry for the active subject, for client-side search/filtering. */
export function useSearchEntries() {
  const activeSubject = useAuthStore((s) => s.activeSubject);

  return useQuery({
    queryKey: ['log-entries', activeSubject?.id, 'all'],
    enabled: !!activeSubject?.id,
    queryFn: async (): Promise<LogEntry[]> => {
      const { data, error } = await supabase
        .from('log_entries')
        .select('*')
        .eq('subject_id', activeSubject!.id)
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
