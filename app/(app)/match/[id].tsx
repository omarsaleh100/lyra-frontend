import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Animated,
  Pressable,
  Alert,
  ActivityIndicator,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
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

const PHOTO_SIZE = 210;

const DEMO_PROFILE = {
  name: 'Sam',
  age: 26,
  bio: 'I like coffee, reading, diving, and walks in the world.',
  matchReason:
    'Sam loves to stay in when it rains and is obsessed with books, just like you! You should ask her about her favorite book.',
  photos: ['https://i.pravatar.cc/300?img=5'],
};

const isDemoId = (id: string) => id.startsWith('demo-');

interface MatchProfile {
  name: string;
  age: number;
  bio: string;
  matchReason: string;
  photos: string[];
}

async function fetchMatchProfile(matchId: string): Promise<MatchProfile> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new Error('Not authenticated');

  // Get my internal user ID
  const { data: me } = await supabase
    .from('users')
    .select('id')
    .eq('auth_id', authUser.id)
    .single();

  if (!me) throw new Error('User row not found');

  // Fetch the match record
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('user_a, user_b')
    .eq('id', matchId)
    .single();

  if (matchError || !match) throw new Error('Match not found');

  // Determine the other user (user_a/user_b store internal users.id)
  const otherUserId = match.user_a === me.id ? match.user_b : match.user_a;

  // Fetch user data and profile data in parallel (by internal id)
  const [userResult, profileResult] = await Promise.all([
    supabase.from('users').select('name, age, photo_url, photo_urls').eq('id', otherUserId).single(),
    supabase.from('profiles').select('summary').eq('user_id', otherUserId).single(),
  ]);

  if (userResult.error || !userResult.data) throw new Error('User not found');

  const userData = userResult.data;
  const profileData = profileResult.data;

  // Build photos array: prefer photo_urls, fall back to single photo_url
  const photos: string[] = userData.photo_urls?.length
    ? userData.photo_urls
    : userData.photo_url
      ? [userData.photo_url]
      : [];

  return {
    name: userData.name || 'Someone',
    age: userData.age || 0,
    bio: '',
    matchReason: profileData?.summary || '',
    photos,
  };
}

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
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MatchProfile>(DEMO_PROFILE);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const handlePhotoScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / PHOTO_SIZE);
    setActivePhotoIndex(index);
  };

  // Gradient glow intensities
  const pinkGlow = useRef(new Animated.Value(0.12)).current;
  const grayGlow = useRef(new Animated.Value(0.12)).current;

  useEffect(() => {
    if (!id || isDemoId(id)) {
      setProfile(DEMO_PROFILE);
      setLoading(false);
      return;
    }

    fetchMatchProfile(id)
      .then(setProfile)
      .catch((err) => {
        Alert.alert('Match fetch failed', err.message);
        setProfile(DEMO_PROFILE);
      })
      .finally(() => setLoading(false));
  }, [id]);

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
        router.replace(`/(app)/radar/${id}`);
      } else {
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

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#FF00DD" />
      </View>
    );
  }

  const initials = profile.name.charAt(0).toUpperCase();

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
          {profile.photos.length > 0 ? (
            <View style={styles.photoClip}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handlePhotoScroll}
              >
                {profile.photos.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={styles.photo} />
                ))}
              </ScrollView>
            </View>
          ) : (
            <View style={[styles.photo, styles.initialsContainer]}>
              <Text style={styles.initialsText}>{initials}</Text>
            </View>
          )}
          {profile.photos.length > 1 && (
            <View style={styles.dots}>
              {profile.photos.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === activePhotoIndex && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </View>

        <Text style={styles.name}>
          {profile.name}{profile.age ? `, ${profile.age}` : ''}
        </Text>
        {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

        {profile.matchReason ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Human thinks you're a match because...</Text>
            <Text style={styles.reasonText}>{profile.matchReason}</Text>
          </View>
        ) : null}
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
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'center',
    marginBottom: 16,
  },
  photoClip: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
    overflow: 'hidden',
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
    backgroundColor: '#111111',
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#333333',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
  },
  initialsContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
  },
  initialsText: {
    color: '#555555',
    fontSize: 64,
    fontWeight: '700',
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
