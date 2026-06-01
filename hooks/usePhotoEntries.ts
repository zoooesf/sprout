import { useQuery } from '@tanstack/react-query';
import { supabase, type LogEntry } from '@/lib/supabase';

export function usePhotoEntries(subjectId: string | undefined) {
  return useQuery({
    queryKey: ['log-entries', subjectId, 'photo'],
    enabled: !!subjectId,
    queryFn: async (): Promise<LogEntry[]> => {
      const { data, error } = await supabase
        .from('log_entries')
        .select('*')
        .eq('subject_id', subjectId!)
        .eq('type', 'photo')
        .order('timestamp', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
