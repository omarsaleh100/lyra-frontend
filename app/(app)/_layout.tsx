import { Stack } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { supabase } from '../../lib/supabase';
import { stopLocationTracking } from '../../lib/location';

const SignOutButton = () => (
  <TouchableOpacity
    onPress={async () => {
      await stopLocationTracking();

      // Delete any matches involving this user (for testing)
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (authUser) {
        const { data: me } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', authUser.id)
          .single();

        if (me) {
          await supabase.from('matches').delete().eq('user_a', me.id);
          await supabase.from('matches').delete().eq('user_b', me.id);
        }
      }

      await supabase.auth.signOut();
    }}
    style={{ padding: 10 }}
  >
    <Text style={{ color: '#555555', fontSize: 14 }}>Sign Out</Text>
  </TouchableOpacity>
);

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTransparent: true,
        headerTitle: '',
        headerRight: () => <SignOutButton />,
        headerStyle: { backgroundColor: 'transparent' },
        contentStyle: { backgroundColor: '#0A0A0F' },
        animation: 'slide_from_right',
        headerBackVisible: false,
      }}
    />
  );
}
