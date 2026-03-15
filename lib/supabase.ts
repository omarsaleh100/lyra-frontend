import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// SecureStore adapter for Supabase auth token persistence
// Use AFTER_FIRST_UNLOCK so background location task can read the token while device is locked
const storeOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK };
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key, storeOptions),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value, storeOptions),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key, storeOptions),
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
