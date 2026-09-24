import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

import type { Database } from '@/types/database';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const webStorage = {
  getItem: async (storageKey: string) => typeof window === 'undefined' ? null : window.localStorage.getItem(storageKey),
  setItem: async (storageKey: string, value: string) => { if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, value); },
  removeItem: async (storageKey: string) => { if (typeof window !== 'undefined') window.localStorage.removeItem(storageKey); },
};

export const isSupabaseConfigured = Boolean(url && key);

export const supabase = createClient<Database>(url ?? 'https://example.supabase.co', key ?? 'missing', {
  auth: {
    storage: process.env.EXPO_OS === 'web' ? webStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

if (process.env.EXPO_OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
