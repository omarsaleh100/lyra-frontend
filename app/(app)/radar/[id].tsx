import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

const { width } = Dimensions.get('window');
const SIZE = width - 64;
const CENTER = SIZE / 2;
const MAX_RADIUS = SIZE / 2 - 8;

export default function RadarScreen() {
  const [distance, setDistance] = useState(100);
  const [celebration, setCelebration] = useState(false);
  const startTime = useRef(Date.now());

  // Sweep line rotation
  const rotation = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
    ).start();
  }, [rotation]);

  // Celebration scale animation
  const celebScale = useRef(new Animated.Value(0)).current;

  // Simulate distance decreasing over 20 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const progress = Math.min(elapsed / 20000, 1);
      const newDist = 100 * (1 - progress);
      setDistance(Math.max(0, newDist));

      if (newDist < 5 && !celebration) {
        setCelebration(true);
        clearInterval(interval);
        Animated.spring(celebScale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      }
    }, 200);

    return () => clearInterval(interval);
  }, [celebration, celebScale]);

  // Color based on distance
  const getColor = () => {
    if (distance > 50) return '#22C55E';
    if (distance > 20) return '#F59E0B';
    return '#EC4899';
  };

  const color = getColor();
  const dotOffset = (distance / 100) * MAX_RADIUS * 0.8;

  // Grid rings
  const rings = [0.25, 0.5, 0.75, 1].map((s) => (
    <Circle
      key={s}
      cx={CENTER}
      cy={CENTER}
      r={MAX_RADIUS * s}
      stroke={color}
      strokeOpacity={0.15}
      strokeWidth={1}
      fill="none"
    />
  ));

  return (
    <View style={styles.container}>
      {/* Celebration overlay */}
      {celebration && (
        <Animated.View
          style={[
            styles.celebrationOverlay,
            { transform: [{ scale: celebScale }] },
          ]}
        >
          <Text style={styles.celebEmoji}>✨</Text>
          <Text style={styles.celebTitle}>You Found Each Other!</Text>
          <Text style={styles.celebSub}>Say hi to Alex!</Text>
        </Animated.View>
      )}

      <View style={styles.header}>
        <Text style={styles.headerText}>Walking to Alex</Text>
      </View>

      {/* Radar */}
      <View style={styles.radarContainer}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {rings}

          {/* Crosshairs */}
          <Line x1={CENTER} y1={8} x2={CENTER} y2={SIZE - 8} stroke={color} strokeOpacity={0.1} strokeWidth={1} />
          <Line x1={8} y1={CENTER} x2={SIZE - 8} y2={CENTER} stroke={color} strokeOpacity={0.1} strokeWidth={1} />

          {/* Center dot (you) */}
          <Circle cx={CENTER} cy={CENTER} r={6} fill={color} />

          {/* Target dot (match) */}
          <Circle
            cx={CENTER}
            cy={CENTER - dotOffset}
            r={8}
            fill="#EC4899"
            stroke="#FFFFFF"
            strokeWidth={2}
          />
        </Svg>
      </View>

      {/* Distance readout */}
      <View style={styles.distanceBox}>
        <Text style={[styles.distanceNumber, { color }]}>
          {distance < 1 ? '< 1' : Math.round(distance).toString()}
        </Text>
        <Text style={styles.distanceUnit}>meters away</Text>
      </View>

      <Text style={styles.tip}>
        {distance > 50
          ? 'Start walking toward the dot on the radar'
          : distance > 10
            ? 'Getting closer! Keep going...'
            : "You're almost there! Look around..."}
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
    paddingHorizontal: 24,
  },
  header: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  headerText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  radarContainer: { alignItems: 'center', justifyContent: 'center' },
  distanceBox: { alignItems: 'center', marginTop: 32 },
  distanceNumber: {
    fontSize: 72,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  distanceUnit: { color: '#777788', fontSize: 16, marginTop: -4 },
  tip: {
    color: '#555566',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 20,
  },
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 15, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  celebEmoji: { fontSize: 64, marginBottom: 16 },
  celebTitle: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', textAlign: 'center' },
  celebSub: { color: '#D0D0E0', fontSize: 18, marginTop: 8 },
});
