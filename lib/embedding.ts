import { supabase } from './supabase';
import { LyraProfile } from './profileParser';
import { Message } from './interview';

/**
 * Sends the full profile + transcript to the /embed Edge Function,
 * which generates 8 personality vectors and saves everything to the
 * profiles table using the service role.
 */
export async function saveProfile(
  userId: string,
  profile: LyraProfile,
  transcript: Message[],
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/embed`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ userId, profile, transcript }),
    },
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Embed request failed: ${response.status}`);
  }

  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error || 'Profile save failed');
  }
}
