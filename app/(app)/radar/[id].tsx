import React, { useEffect, useRef, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Circle,
  Polygon,
  Line,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import { joinRadarChannel, haversineDistance } from '../../../lib/radar';
import { useSmoothedDistance } from '../../../hooks/useSmoothedDistance';
import { supabase } from '../../../lib/supabase';

const { width, height } = Dimensions.get('window');
const RADAR_SIZE = width - 80;
const CENTER = RADAR_SIZE / 2;
const MAX_R = RADAR_SIZE / 2 - 12;

const GREEN = '#22C55E';
const CONFETTI_COLORS = ['#FF00DD', '#22C55E', '#F59E0B', '#4466FF', '#FFFFFF', '#FF4D8D'];
const CONFETTI_COUNT = 60;

// Demo mode flag — falls back to simulation if no match ID
const isDemoId = (id: string) => id.startsWith('demo-');

function ConfettiParticle({ delay, color, startX }: { delay: number; color: string; startX: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const drift = useMemo(() => (Math.random() - 0.5) * 160, []);
  const duration = useMemo(() => 2000 + Math.random() * 1500, []);

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(translateY, { toValue: -(height + 100), duration, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: drift, duration, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.delay(duration - 700),
          Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
        Animated.timing(rotate, { toValue: 1, duration, useNativeDriver: true }),
      ]),
    ]).start();
  }, [delay, drift, duration, translateY, translateX, opacity, rotate]);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${360 + Math.random() * 720}deg`] });
  const w = 6 + Math.random() * 6;
  const h = w * (1 + Math.random() * 2);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        bottom: -20,
        left: startX,
        width: w,
        height: h,
        borderRadius: 2,
        backgroundColor: color,
        opacity,
        transform: [{ translateY }, { translateX }, { rotate: spin }],
      }}
    />
  );
}

function ConfettiOverlay() {
  const particles = useMemo(() =>
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      delay: Math.random() * 600,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      startX: Math.random() * width,
    })),
  []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p) => (
        <ConfettiParticle key={p.id} delay={p.delay} color={p.color} startX={p.startX} />
      ))}
    </View>
  );
}

export default function RadarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [distance, setDistance] = useState(88);
  const [bearing, setBearing] = useState(0);
  const [celebration, setCelebration] = useState(false);
  const startTime = useRef(Date.now());
  const myLocation = useRef<{ lat: number; lon: number } | null>(null);
  const celebrationRef = useRef(false);
  const { push: smoothDistance } = useSmoothedDistance(5);

  // Pulse ring animation
  const pulseScale = useRef(new Animated.Value(0.2)).current;
  const pulseOpacity = useRef(new Animated.Value(0.6)).current;

  // Arrow glow
  const arrowGlow = useRef(new Animated.Value(0.5)).current;

  // Celebration
  const celebScale = useRef(new Animated.Value(0)).current;
  const celebOpacity = useRef(new Animated.Value(0)).current;

  // Pulse ring loop
  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.timing(pulseScale, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulseScale, pulseOpacity]);

  // Arrow glow loop
  useEffect(() => {
    const duration = distance > 40 ? 1200 : distance > 15 ? 600 : 300;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(arrowGlow, { toValue: 1, duration: duration / 2, useNativeDriver: true }),
        Animated.timing(arrowGlow, { toValue: 0.4, duration: duration / 2, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [distance, arrowGlow]);

  // Real radar via Broadcast channel, or demo simulation
  useEffect(() => {
    if (isDemoId(id || '')) {
      // Demo mode — simulate distance decreasing
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime.current;
        const progress = Math.min(elapsed / 25000, 1);
        const newDist = 88 * (1 - progress);
        setDistance(Math.max(0, newDist));

        setBearing((prev) => {
          const drift = (Math.random() - 0.5) * 8;
          return (prev + drift + 360) % 360;
        });

        if (newDist < 3 && !celebrationRef.current) {
          triggerCelebration();
          clearInterval(interval);
        }
      }, 200);

      return () => clearInterval(interval);
    }

    // Real mode — GPS + Broadcast channel
    const radar = joinRadarChannel(id!, (peerLat, peerLon) => {
      if (!myLocation.current) return;

      const rawDist = haversineDistance(
        myLocation.current.lat, myLocation.current.lon,
        peerLat, peerLon,
      );
      const smoothed = smoothDistance(rawDist);
      setDistance(smoothed);

      // Calculate bearing to peer
      const dLon = ((peerLon - myLocation.current.lon) * Math.PI) / 180;
      const lat1 = (myLocation.current.lat * Math.PI) / 180;
      const lat2 = (peerLat * Math.PI) / 180;
      const y = Math.sin(dLon) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
      const bearingDeg = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
      setBearing(bearingDeg);

      if (smoothed < 3 && !celebrationRef.current) {
        triggerCelebration();
      }
    });

    // Send own location every 2 seconds
    const locationInterval = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        myLocation.current = { lat: loc.coords.latitude, lon: loc.coords.longitude };
        radar.sendLocation(loc.coords.latitude, loc.coords.longitude);
      } catch {
        // GPS may not be available
      }
    }, 2000);

    return () => {
      clearInterval(locationInterval);
      radar.leave();
    };
  }, [id]);

  const triggerCelebration = async () => {
    celebrationRef.current = true;
    setCelebration(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 200);
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 400);

    Animated.parallel([
      Animated.spring(celebScale, { toValue: 1, useNativeDriver: true }),
      Animated.timing(celebOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    // Mark the match as "met" — fire and forget
    if (id && !isDemoId(id)) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await fetch(
            `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/respond-match`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
              },
              body: JSON.stringify({ matchId: id, action: 'met' }),
            },
          );
        }
      } catch {
        // Non-critical — don't interrupt the celebration
      }
    }
  };

  const dotDist = (distance / 100) * MAX_R * 0.75;
  const bearingRad = (bearing * Math.PI) / 180;
  const dotX = CENTER + Math.sin(bearingRad) * dotDist;
  const dotY = CENTER - Math.cos(bearingRad) * dotDist;

  const arrowLen = 50;
  const arrowWidth = 18;
  const arrowDist = 55;
  const ax = CENTER + Math.sin(bearingRad) * arrowDist;
  const ay = CENTER - Math.cos(bearingRad) * arrowDist;
  const tipX = ax + Math.sin(bearingRad) * arrowLen;
  const tipY = ay - Math.cos(bearingRad) * arrowLen;
  const leftRad = bearingRad - Math.PI / 2;
  const lx = ax + Math.sin(leftRad) * arrowWidth / 2;
  const ly = ay - Math.cos(leftRad) * arrowWidth / 2;
  const rx = ax - Math.sin(leftRad) * arrowWidth / 2;
  const ry = ay + Math.cos(leftRad) * arrowWidth / 2;

  const distText = distance < 1 ? '< 1m' : `${Math.round(distance)}m`;
  const color = distance > 40 ? GREEN : distance > 15 ? '#F59E0B' : '#FF00DD';

  return (
    <View style={styles.container}>
      {celebration && (
        <>
          <Animated.View
            style={[styles.celebOverlay, { opacity: celebOpacity, transform: [{ scale: celebScale }] }]}
          >
            <Text style={styles.celebEmoji}>✨</Text>
            <Text style={styles.celebTitle}>You Found Each Other!</Text>
            <Text style={styles.celebSub}>Say hi!</Text>
          </Animated.View>
          <ConfettiOverlay />
        </>
      )}

      <Text style={styles.headerText}>Walking to your match</Text>

      <View style={styles.radarOuter}>
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseScale }],
              opacity: pulseOpacity,
              borderColor: color,
            },
          ]}
        />

        <Svg width={RADAR_SIZE} height={RADAR_SIZE} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}>
          {[0.25, 0.5, 0.75, 1.0].map((s) => (
            <Circle
              key={s}
              cx={CENTER}
              cy={CENTER}
              r={MAX_R * s}
              stroke={color}
              strokeOpacity={0.12}
              strokeWidth={1}
              fill="none"
            />
          ))}

          <Line x1={CENTER} y1={12} x2={CENTER} y2={RADAR_SIZE - 12} stroke={color} strokeOpacity={0.06} strokeWidth={1} />
          <Line x1={12} y1={CENTER} x2={RADAR_SIZE - 12} y2={CENTER} stroke={color} strokeOpacity={0.06} strokeWidth={1} />

          <Defs>
            <RadialGradient id="centerGlow" cx="50%" cy="50%" rx="15%" ry="15%">
              <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={color} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={CENTER} cy={CENTER} r={MAX_R * 0.15} fill="url(#centerGlow)" />
          <Circle cx={CENTER} cy={CENTER} r={5} fill={color} />

          {distance > 3 && (
            <Polygon
              points={`${tipX},${tipY} ${lx},${ly} ${rx},${ry}`}
              fill={color}
              opacity={0.9}
            />
          )}

          {distance > 3 && (
            <>
              <Circle cx={dotX} cy={dotY} r={10} fill={color} fillOpacity={0.15} />
              <Circle cx={dotX} cy={dotY} r={5} fill={color} />
            </>
          )}
        </Svg>
      </View>

      <Animated.Text style={[styles.distance, { color, opacity: arrowGlow }]}>
        {distText}
      </Animated.Text>

      <Text style={[styles.hint, { color }]}>
        {distance > 40
          ? 'Follow the arrow'
          : distance > 10
            ? 'Getting closer...'
            : "Look around! you're almost there"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    position: 'absolute',
    top: 70,
  },
  radarOuter: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: RADAR_SIZE * 0.8,
    height: RADAR_SIZE * 0.8,
    borderRadius: RADAR_SIZE * 0.4,
    borderWidth: 2,
  },
  distance: {
    fontSize: 60,
    fontWeight: '800',
    marginTop: 24,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontSize: 14,
    marginTop: 12,
    opacity: 0.6,
  },
  celebOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  celebEmoji: { fontSize: 64, marginBottom: 16 },
  celebTitle: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', textAlign: 'center' },
  celebSub: { color: '#888888', fontSize: 18, marginTop: 8 },
});
