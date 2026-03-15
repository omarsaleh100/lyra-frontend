import 'react-native-url-polyfill/auto';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const LOCATION_TASK = 'lyra-background-location';

// Background Supabase client — no auto-refresh (background tasks can't refresh tokens)
const bgSupabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: {
        getItem: (key: string) => SecureStore.getItemAsync(key, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }),
        setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }),
        removeItem: (key: string) => SecureStore.deleteItemAsync(key, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }),
      },
      autoRefreshToken: false,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

// Define the background task
TaskManager.defineTask(LOCATION_TASK, async ({ data, error }: any) => {
  if (error) return;

  const { locations } = data;
  if (!locations || locations.length === 0) return;

  const { coords } = locations[0];

  try {
    const { data: { session } } = await bgSupabase.auth.getSession();
    if (!session) return;

    const { data: userData } = await bgSupabase
      .from('users')
      .select('id')
      .eq('auth_id', session.user.id)
      .single();

    if (!userData) return;

    // Upsert location — the match trigger fires automatically
    await bgSupabase
      .from('locations')
      .upsert({
        user_id: userData.id,
        location: `SRID=4326;POINT(${coords.longitude} ${coords.latitude})`,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  } catch {
    // Silently fail in background
  }
});

/**
 * Request location permissions and start background tracking.
 * iOS quirk: ask foreground first, wait, then ask background.
 */
export async function startLocationTracking(): Promise<boolean> {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') return false;

  // iOS race condition workaround
  await new Promise((r) => setTimeout(r, 600));

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') return false;

  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 30000, // every 30 seconds
    distanceInterval: 20, // or every 20 meters
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'Lyra',
      notificationBody: 'Looking for compatible people nearby',
    },
  });

  return true;
}

export async function stopLocationTracking(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK);
  }
}
