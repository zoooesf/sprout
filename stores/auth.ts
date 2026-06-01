import { create } from 'zustand';
import { supabase, type Profile, type Family, type Subject } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  family: Family | null;
  subjects: Subject[];
  activeSubjectId: string | null;
  activeSubject: Subject | null;

  // Actions
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setFamily: (family: Family | null) => void;
  setSubjects: (subjects: Subject[]) => void;
  setActiveSubjectId: (id: string | null) => void;
  loadUserData: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  family: null,
  subjects: [],
  activeSubjectId: null,
  activeSubject: null,

  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setFamily: (family) => set({ family }),
  setSubjects: (subjects) => set({ subjects }),
  setActiveSubjectId: (id) => {
    const subjects = get().subjects;
    const activeSubject = subjects.find((s) => s.id === id) ?? subjects[0] ?? null;
    set({ activeSubjectId: id, activeSubject });
  },

  loadUserData: async () => {
    const { session } = get();
    if (!session?.user) return;

    // Load profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (!profile) return;
    set({ profile });

    if (!profile.family_id) return;

    // Load family
    const { data: family } = await supabase
      .from('families')
      .select('*')
      .eq('id', profile.family_id)
      .single();

    if (family) set({ family });

    // Load subjects
    const { data: subjects } = await supabase
      .from('subjects')
      .select('*')
      .eq('family_id', profile.family_id)
      .order('created_at', { ascending: true });

    if (subjects && subjects.length > 0) {
      set({ subjects, activeSubjectId: subjects[0].id, activeSubject: subjects[0] });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null, family: null, subjects: [], activeSubjectId: null, activeSubject: null });
  },
}));
