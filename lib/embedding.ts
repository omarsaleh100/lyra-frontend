import { supabase } from './supabase';
import { LyraProfile } from './profileParser';
import { Message } from './interview';

/**
 * Sends the completed interview data to the /embed edge function.
 * This function will:
 * 1. Generate 8 separate personality vectors via OpenAI.
 * 2. Save the full profile directly to the database.
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
      },
      body: JSON.stringify({
        userId,
        profile,
        transcript,
      }),
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || `Save request failed: ${response.status}`);
  }
}
