import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Hermes (React Native) doesn't always expose a global `crypto` object.
// Supabase auth-js calls crypto.getRandomValues() during session operations.
if (typeof (global as any).crypto === 'undefined') {
  (global as any).crypto = {
    getRandomValues(array: ArrayBufferView & { [n: number]: number; length: number }) {
      for (let i = 0; i < array.length; i++) {
        (array as any)[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
    randomUUID(): string {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
    },
  };
}

// Replace these with your Supabase project values from https://supabase.com/dashboard
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});

// ── Types ────────────────────────────────────────────────────────────────────

export interface Family {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  family_id: string | null;
  display_name: string;
  email: string;
  created_at: string;
}

export interface Subject {
  id: string;
  family_id: string;
  name: string;
  birthday: string | null;
  pronouns: string | null;
  conditions: string[];
  color: string;
  created_at: string;
}

export interface LibraryItem {
  id: string;
  subject_id: string;
  type: 'medication' | 'cream' | 'supplement' | 'food';
  name: string;
  barcode: string | null;
  ingredients: string[];
  default_dose: string | null;
  created_at: string;
}

export interface WeatherSnapshot {
  temperature: number | null;
  humidity: number | null;
  pollen: number | null;
  description: string | null;
}

export interface LogEntry {
  id: string;
  subject_id: string;
  logged_by: string;
  type: 'food' | 'medication' | 'cream' | 'sleep' | 'checkin' | 'photo' | 'note';
  timestamp: string;
  payload: Record<string, unknown>;
  photo_urls: string[];
  weather: WeatherSnapshot | null;
  created_at: string;
}

// ── Payload type helpers ─────────────────────────────────────────────────────

export interface FoodPayload {
  name: string;
  ingredients: string[];
  barcode?: string;
  reaction?: string;
}

export interface MedicationPayload {
  library_item_id: string;
  library_item_name: string;
  dose?: string;
  notes?: string;
}

export interface CreamPayload {
  library_item_id: string;
  library_item_name: string;
  areas: string[];
  amount?: string;
  notes?: string;
}

export interface SleepPayload {
  asleep_at: string;
  woke_at?: string;
  hours?: number;
  quality?: number; // 1–5
  notes?: string;
}

export interface CheckInPayload {
  severity_score: number; // 1–10
  symptoms: string[];
  notes?: string;
}

export interface PhotoPayload {
  areas: string[];
  caption?: string;
}

export interface NotePayload {
  text: string;
}
