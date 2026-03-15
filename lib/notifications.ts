import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from './supabase';

// Handle notifications when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request push notification permissions, get Expo push token,
 * and store it in the users table.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  let token: string;
  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    token = tokenData.data;
  } catch {
    // Fails on simulator without APS entitlement — silently skip
    return null;
  }

  // Store token in users table
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (authUser) {
    await supabase
      .from('users')
      .update({ expo_push_token: token })
      .eq('auth_id', authUser.id);
  }

  return token;
}

/**
 * Set up listeners for notifications:
 * - Foreground: auto-navigate when notification arrives
 * - Tap: navigate when user taps a notification
 */
export function setupNotificationResponseListener(): () => void {
  // Navigate when notification arrives while app is open
  const receivedSub = Notifications.addNotificationReceivedListener(
    (notification) => {
      const data = notification.request.content.data;
      if (data?.matchId) {
        router.push(`/(app)/match/${data.matchId}` as any);
      } else if (data?.url) {
        router.push(data.url as any);
      }
    },
  );

  // Navigate when user taps a notification
  const responseSub = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;
      if (data?.matchId) {
        router.push(`/(app)/match/${data.matchId}` as any);
      } else if (data?.url) {
        router.push(data.url as any);
      }
    },
  );

  return () => {
    receivedSub?.remove?.();
    responseSub?.remove?.();
  };
}
