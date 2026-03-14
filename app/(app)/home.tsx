import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Circle, Ellipse } from 'react-native-svg';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');
const ORB_SIZE = 220;

export default function HomeScreen() {
  const [demoActive, setDemoActive] = useState(false);
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Orb breathing
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbGlowScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(orbScale, { toValue: 1.06, duration: 3000, useNativeDriver: true }),
          Animated.timing(orbScale, { toValue: 0.96, duration: 3000, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(orbGlowScale, { toValue: 1.12, duration: 3500, useNativeDriver: true }),
          Animated.timing(orbGlowScale, { toValue: 0.92, duration: 3500, useNativeDriver: true }),
        ]),
      ]),
    ).start();
  }, [orbScale, orbGlowScale]);

  const handleTap = () => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => { tapCount.current = 0; }, 2000);

    if (tapCount.current >= 5) {
      tapCount.current = 0;
      setDemoActive(true);
      setTimeout(() => {
        router.push('/(app)/match/demo-match-1');
      }, 3000);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={handleTap}>
      <View style={styles.container}>
        {/* Blue orb — same structure as onboarding but blue */}
        <View style={styles.orbWrapper}>
          <Animated.View
            style={[
              styles.orbGlow,
              { transform: [{ scale: orbGlowScale }] },
            ]}
          >
            <Svg width={ORB_SIZE * 2} height={ORB_SIZE * 2}>
              <Defs>
                <RadialGradient id="blueOuterGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                  <Stop offset="0%" stopColor="#0033FF" stopOpacity="0.35" />
                  <Stop offset="40%" stopColor="#0033FF" stopOpacity="0.12" />
                  <Stop offset="100%" stopColor="#0033FF" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Ellipse cx={ORB_SIZE} cy={ORB_SIZE} rx={ORB_SIZE} ry={ORB_SIZE} fill="url(#blueOuterGlow)" />
            </Svg>
          </Animated.View>

          <Animated.View
            style={[
              styles.orbCore,
              { transform: [{ scale: orbScale }] },
            ]}
          >
            <Svg width={ORB_SIZE} height={ORB_SIZE}>
              <Defs>
                <RadialGradient id="blueCoreGrad" cx="50%" cy="45%" rx="50%" ry="50%">
                  <Stop offset="0%" stopColor="#4466FF" stopOpacity="1" />
                  <Stop offset="30%" stopColor="#0033FF" stopOpacity="0.9" />
                  <Stop offset="60%" stopColor="#0022AA" stopOpacity="0.45" />
                  <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
                </RadialGradient>
              </Defs>
              <Circle cx={ORB_SIZE / 2} cy={ORB_SIZE / 2} r={ORB_SIZE / 2} fill="url(#blueCoreGrad)" />
            </Svg>
          </Animated.View>
        </View>

        {/* Status text below orb */}
        <Text style={styles.searchText}>
          {demoActive ? 'Match incoming...' : 'Looking for someone compatible near you'}
        </Text>

        <Text style={styles.hint}>Tap 5x for demo</Text>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  orbWrapper: {
    width: ORB_SIZE * 2,
    height: ORB_SIZE * 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -20,
  },
  orbGlow: {
    position: 'absolute',
    width: ORB_SIZE * 2,
    height: ORB_SIZE * 2,
  },
  orbCore: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
  },
  searchText: {
    color: '#666666',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 40,
  },
  hint: {
    position: 'absolute',
    bottom: 50,
    color: '#222222',
    fontSize: 12,
  },
});
