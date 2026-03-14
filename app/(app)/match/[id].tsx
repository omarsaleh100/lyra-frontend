import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';

const { width } = Dimensions.get('window');

const DEMO_PROFILE = {
  name: 'Alex',
  age: 26,
  bio: 'Coffee addict, trail runner, aspiring novelist.',
  personality:
    'Warm and intellectually curious. Loves deep conversations about philosophy and art. Introverted but lights up around people she trusts.',
  photo: 'https://i.pravatar.cc/400?img=1',
};

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Someone compatible is near you</Text>

      {/* Profile Card */}
      <View style={styles.card}>
        <Image source={{ uri: DEMO_PROFILE.photo }} style={styles.photo} />
        <View style={styles.info}>
          <Text style={styles.name}>
            {DEMO_PROFILE.name}, {DEMO_PROFILE.age}
          </Text>
          <Text style={styles.bio}>{DEMO_PROFILE.bio}</Text>
          <View style={styles.personalityBox}>
            <Text style={styles.personalityLabel}>How Lyra sees them</Text>
            <Text style={styles.personalityText}>
              {DEMO_PROFILE.personality}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.passButton}
          onPress={() => router.back()}
        >
          <Text style={styles.passText}>Pass</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.approveButton}
          onPress={() => router.replace(`/(app)/radar/${id}`)}
        >
          <Text style={styles.approveText}>Let's meet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    justifyContent: 'center',
  },
  header: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#1A1A2E',
    borderRadius: 24,
    overflow: 'hidden',
    width: width - 48,
    alignSelf: 'center',
  },
  photo: {
    width: '100%',
    height: 350,
    backgroundColor: '#252542',
  },
  info: { padding: 20 },
  name: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
  bio: { color: '#BBBBCC', fontSize: 16, marginTop: 8, lineHeight: 22 },
  personalityBox: {
    backgroundColor: '#252542',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  personalityLabel: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  personalityText: { color: '#D0D0E0', fontSize: 15, lineHeight: 22 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  passButton: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  passText: { color: '#888899', fontSize: 18, fontWeight: '600' },
  approveButton: {
    flex: 2,
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  approveText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
});
