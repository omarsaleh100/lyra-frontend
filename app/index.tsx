import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function Index() {
  const [checking, setChecking] = useState(true);
  const [route, setRoute] = useState<string>('/(auth)/login');

  useEffect(() => {
    (async () => {
      // 1. Check if logged in
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setRoute('/(auth)/login');
        setChecking(false);
        return;
      }

      // 2. Get internal user ID
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', session.user.id)
        .single();

      if (!user) {
        // Has auth but no user row yet — send to signup
        setRoute('/(app)/signup');
        setChecking(false);
        return;
      }

      // 3. Check if they've completed the interview (have a profile)
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setRoute('/(app)/home');       // completed — go to home
      } else {
        setRoute('/(app)/onboarding'); // not yet — do the interview
      }

      setChecking(false);
    })();
  }, []);

  if (checking) return null;

  return <Redirect href={route as any} />;
}
