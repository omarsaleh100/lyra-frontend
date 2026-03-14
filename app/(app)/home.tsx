import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

const DEMO_MATCH = {
  id: 'demo-match-1',
  name: 'Alex',
  age: 26,
  bio: 'Coffee addict, trail runner, aspiring novelist.',
  personality:
    'Warm and intellectually curious. Loves deep conversations about philosophy and art. Introverted but lights up around people she trusts.',
};

export default function HomeScreen() {
  const [demoActive, setDemoActive] = useState(false);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pulse animations using built-in Animated
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createPulse = (anim: Animated.Value, delay: number) => {
      const loop = Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          delay,
        }),
      );
      loop.start();
      return loop;
    };

    const l1 = createPulse(pulse1, 0);
    const l2 = createPulse(pulse2, 666);
    const l3 = createPulse(pulse3, 1333);

    return () => { l1.stop(); l2.stop(); l3.stop(); };
  }, [pulse1, pulse2, pulse3]);

  const makePulseStyle = (anim: Animated.Value) => ({
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.3, 3],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 0],
    }),
  });

  const handleLogoTap = () => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 2000);

    if (tapCount.current >= 5) {
      tapCount.current = 0;
      setDemoActive(true);

      // Fire demo match after 3 seconds
      setTimeout(() => {
        router.push(`/(app)/match/${DEMO_MATCH.id}`);
      }, 3000);
    }
  };

  return (
    <View style={styles.container}>
      {/* Pulse rings */}
      <View style={styles.pulseContainer}>
        <Animated.View style={[styles.pulseRing, makePulseStyle(pulse1)]} />
        <Animated.View style={[styles.pulseRing, makePulseStyle(pulse2)]} />
        <Animated.View style={[styles.pulseRing, makePulseStyle(pulse3)]} />
        <View style={styles.centerDot} />
      </View>

      {/* Logo — 5-tap to trigger demo */}
      <TouchableWithoutFeedback onPress={handleLogoTap}>
        <Text style={styles.logo}>Lyra</Text>
      </TouchableWithoutFeedback>

      <Text style={styles.statusText}>
        {demoActive
          ? 'Match incoming...'
          : 'Looking for someone compatible near you...'}
      </Text>

      <Text style={styles.hint}>
        {demoActive
          ? ''
          : 'Tap the logo 5 times for demo mode'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
    marginBottom: 16,
  },
  pulseContainer: {
    width: width * 0.6,
    height: width * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  pulseRing: {
    position: 'absolute',
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: width * 0.1,
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  centerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#8B5CF6',
  },
  statusText: {
    color: '#CCCCDD',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  hint: {
    color: '#555566',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
  },
});
