import { supabase } from './supabase';

export type Message = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * Streams a response from the /interview edge function.
 * Calls onChunk with each text chunk as it arrives.
 * Returns the full assembled message when done.
 */
export async function streamInterview(
  messages: Message[],
  onChunk: (text: string) => void,
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/interview`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ messages }),
    },
  );

  if (!response.ok) {
    throw new Error(`Interview request failed: ${response.status}`);
  }

  // React Native's fetch doesn't support ReadableStream,
  // so we read the full response as text and parse SSE lines
  const text = await response.text();
  let fullText = '';

  const lines = text.split('\n');
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const data = line.slice(6).trim();
    if (data === '[DONE]') continue;

    try {
      const parsed = JSON.parse(data);
      if (parsed.text) {
        fullText += parsed.text;
        onChunk(parsed.text);
      }
    } catch {
      // skip malformed chunks
    }
  }

  return fullText;
}
