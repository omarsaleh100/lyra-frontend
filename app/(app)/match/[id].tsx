import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Animated,
  Pressable,
  Alert,
} from 'react-native';
import Svg, {
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../../lib/supabase';

const { width, height } = Dimensions.get('window');

const DEMO_PROFILE = {
  name: 'Sam',
  age: 26,
  bio: 'I like coffee, reading, diving, and walks in the world.',
  matchReason:
    'Sam loves to stay in when it rains and is obsessed with books, just like you! You should ask her about her favorite book.',
  photo: 'https://i.pravatar.cc/300?img=5',
};

const isDemoId = (id: string) => id.startsWith('demo-');

async function respondToMatch(matchId: string, action: 'accept' | 'pass'): Promise<{ status: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await fetch(
    `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/respond-match`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({ matchId, action }),
    },
  );

  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Failed to respond');
  return result;
}

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [acting, setActing] = useState(false);

  // Gradient glow intensities
  const pinkGlow = useRef(new Animated.Value(0.12)).current;
  const grayGlow = useRef(new Animated.Value(0.12)).current;

  const handleMeet = async () => {
    if (acting) return;
    setActing(true);
    try {
      if (id && isDemoId(id)) {
        router.replace(`/(app)/radar/${id}`);
        return;
      }
      const result = await respondToMatch(id!, 'accept');
      if (result.status === 'confirmed') {
        // Both accepted — go to radar
        router.replace(`/(app)/radar/${id}`);
      } else {
        // approved — waiting for the other person
        Alert.alert('Nice!', "They'll be notified. Hang tight!");
        router.back();
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setActing(false);
    }
  };

  const handlePass = async () => {
    if (acting) return;
    setActing(true);
    try {
      if (id && !isDemoId(id)) {
        await respondToMatch(id, 'pass');
      }
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setActing(false);
    }
  };

  const handleMeetPressIn = () => {
    Animated.parallel([
      Animated.timing(pinkGlow, { toValue: 0.4, duration: 200, useNativeDriver: false }),
      Animated.timing(grayGlow, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start();
  };

  const handlePassPressIn = () => {
    Animated.parallel([
      Animated.timing(grayGlow, { toValue: 0.35, duration: 200, useNativeDriver: false }),
      Animated.timing(pinkGlow, { toValue: 0, duration: 200, useNativeDriver: false }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.timing(pinkGlow, { toValue: 0.12, duration: 300, useNativeDriver: false }),
      Animated.timing(grayGlow, { toValue: 0.12, duration: 300, useNativeDriver: false }),
    ]).start();
  };

  return (
    <View style={styles.container}>
      {/* Left edge gradient — gray */}
      <Animated.View style={[styles.edgeGradient, styles.edgeLeft, { opacity: grayGlow }]} pointerEvents="none">
        <Svg width={120} height={height}>
          <Defs>
            <SvgLinearGradient id="grayEdge" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#AAAAAA" stopOpacity="1" />
              <Stop offset="1" stopColor="#AAAAAA" stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>
          <Rect x="0" y="0" width={120} height={height} fill="url(#grayEdge)" />
        </Svg>
      </Animated.View>

      {/* Right edge gradient — pink */}
      <Animated.View style={[styles.edgeGradient, styles.edgeRight, { opacity: pinkGlow }]} pointerEvents="none">
        <Svg width={120} height={height}>
          <Defs>
            <SvgLinearGradient id="pinkEdge" x1="1" y1="0" x2="0" y2="0">
              <Stop offset="0" stopColor="#FF00DD" stopOpacity="1" />
              <Stop offset="1" stopColor="#FF00DD" stopOpacity="0" />
            </SvgLinearGradient>
          </Defs>
          <Rect x="0" y="0" width={120} height={height} fill="url(#pinkEdge)" />
        </Svg>
      </Animated.View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.header}>Someone compatible is near!</Text>

        <View style={styles.photoContainer}>
          <Image source={{ uri: DEMO_PROFILE.photo }} style={styles.photo} />
        </View>

        <Text style={styles.name}>
          {DEMO_PROFILE.name}, {DEMO_PROFILE.age}
        </Text>
        <Text style={styles.bio}>{DEMO_PROFILE.bio}</Text>

        <View style={styles.reasonBox}>
          <Text style={styles.reasonLabel}>Lyra thinks you're a match because...</Text>
          <Text style={styles.reasonText}>{DEMO_PROFILE.matchReason}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          onPressIn={handlePassPressIn}
          onPressOut={handlePressOut}
          onPress={handlePass}
          disabled={acting}
          style={[styles.actionButton, acting && { opacity: 0.5 }]}
        >
          <Text style={styles.passText}>Let's not</Text>
        </Pressable>

        <Pressable
          onPressIn={handleMeetPressIn}
          onPressOut={handlePressOut}
          onPress={handleMeet}
          disabled={acting}
          style={[styles.actionButton, acting && { opacity: 0.5 }]}
        >
          <Text style={styles.meetText}>Let's meet!</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  edgeGradient: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 120,
    zIndex: 1,
  },
  edgeLeft: {
    left: 0,
  },
  edgeRight: {
    right: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    zIndex: 2,
  },
  header: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  photoContainer: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  photo: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#111111',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  bio: {
    color: '#777777',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  reasonBox: {
    marginTop: 36,
    paddingTop: 24,
    borderTopWidth: 0.5,
    borderTopColor: '#1A1A1A',
  },
  reasonLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  reasonText: {
    color: '#AAAAAA',
    fontSize: 15,
    lineHeight: 23,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 50,
    zIndex: 2,
  },
  actionButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  passText: {
    color: '#555555',
    fontSize: 17,
    fontWeight: '500',
  },
  meetText: {
    color: '#FF00DD',
    fontSize: 17,
    fontWeight: '600',
  },
});
