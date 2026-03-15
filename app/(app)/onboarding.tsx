import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import Svg, {
  Defs,
  RadialGradient,
  Stop,
  Circle,
  Ellipse,
  Rect,
  LinearGradient as SvgLinearGradient,
  Path,
} from 'react-native-svg';
import { router } from 'expo-router';
import { streamInterview, Message } from '../../lib/interview';
import { containsProfile, parseProfile, LyraProfile } from '../../lib/profileParser';
import { saveProfile } from '../../lib/embedding';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const ORB_SIZE = 220;

export default function OnboardingScreen() {
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [done, setDone] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [profile, setProfile] = useState<LyraProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const messagesRef = useRef<Message[]>([]);
  const speechBufferRef = useRef('');
  const audioQueueRef = useRef<string[]>([]);   // sentences waiting to be spoken
  const isPlayingRef = useRef(false);            // whether audio is currently playing
  const currentSoundRef = useRef<Audio.Sound | null>(null);
  const streamActiveRef = useRef(false);         // true while LLM stream is producing chunks
  const profileDetectedRef = useRef(false);      // true once <profile> tag seen in response

  // Configure audio to play even in silent mode
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true });
  }, []);

  // Play the next sentence in the queue via OpenAI TTS
  const playNext = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return;
    const sentence = audioQueueRef.current.shift()!;
    isPlayingRef.current = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/tts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token ?? ''}`,
            'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ text: sentence }),
        },
      );
      const { audio } = await res.json();
      if (!audio) throw new Error('no audio');

      const path = `${FileSystem.cacheDirectory}lyra_tts_${Date.now()}.mp3`;
      await FileSystem.writeAsStringAsync(path, audio, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const player = createAudioPlayer(path);
      currentPlayerRef.current = player;

      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          isPlayingRef.current = false;
          currentSoundRef.current = null;
          await sound.unloadAsync();
          await FileSystem.deleteAsync(path, { idempotent: true });
          // Check both gates: queue drained AND stream finished
          if (audioQueueRef.current.length > 0) {
            playNext();
          } else if (!streamActiveRef.current) {
            setSpeaking(false);
            startIdle();
          }
          // else: queue empty but stream still active — stay in speaking state,
          // flushSpeechBuffer will call playNext when next sentence arrives
        }
      });

      player.play();
    } catch {
      isPlayingRef.current = false;
      if (audioQueueRef.current.length > 0) {
        playNext();
      } else if (!streamActiveRef.current) {
        setSpeaking(false);
        startIdle();
      }
    }
  }, []);

  // Stop all audio and clear the queue
  const stopAudio = useCallback(async () => {
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    if (currentPlayerRef.current) {
      currentPlayerRef.current.pause();
      currentPlayerRef.current.release();
      currentPlayerRef.current = null;
    }
  }, []);

  // Accumulate streamed chunks and send to TTS in natural phrases
  const pendingSentencesRef = useRef('');
  const MIN_TTS_LENGTH = 60;

  const flushSpeechBuffer = useCallback((chunk: string, final = false) => {
    speechBufferRef.current += chunk;

    let buf = speechBufferRef.current;
    let match;
    while ((match = buf.search(/[.!?]/)) !== -1) {
      const sentence = buf.slice(0, match + 1).trim();
      buf = buf.slice(match + 1);
      if (sentence) {
        pendingSentencesRef.current += (pendingSentencesRef.current ? ' ' : '') + sentence;
        if (pendingSentencesRef.current.length >= MIN_TTS_LENGTH) {
          audioQueueRef.current.push(pendingSentencesRef.current);
          pendingSentencesRef.current = '';
          playNext();
        }
      }
    }
    speechBufferRef.current = buf;

    if (final) {
      if (buf.trim()) {
        pendingSentencesRef.current += (pendingSentencesRef.current ? ' ' : '') + buf.trim();
      }
      if (pendingSentencesRef.current) {
        audioQueueRef.current.push(pendingSentencesRef.current);
        pendingSentencesRef.current = '';
      }
      speechBufferRef.current = '';
      playNext();
    }
  }, [playNext]);

  // Text fade
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(-20)).current;

  // Orb
  const orbScale = useRef(new Animated.Value(1)).current;
  const orbGlowScale = useRef(new Animated.Value(1)).current;
  const activeAnim = useRef<Animated.CompositeAnimation | null>(null);

  const startIdle = useCallback(() => {
    activeAnim.current?.stop();
    activeAnim.current = Animated.loop(
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
    );
    activeAnim.current.start();
  }, [orbScale, orbGlowScale]);

  const startSpeaking = useCallback(() => {
    activeAnim.current?.stop();
    activeAnim.current = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(orbScale, { toValue: 1.18, duration: 280, useNativeDriver: true }),
          Animated.timing(orbScale, { toValue: 0.93, duration: 320, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(orbGlowScale, { toValue: 1.3, duration: 280, useNativeDriver: true }),
          Animated.timing(orbGlowScale, { toValue: 1.0, duration: 320, useNativeDriver: true }),
        ]),
      ]),
    );
    activeAnim.current.start();
  }, [orbScale, orbGlowScale]);

  const startListeningAnim = useCallback(() => {
    activeAnim.current?.stop();
    activeAnim.current = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(orbScale, { toValue: 1.1, duration: 600, useNativeDriver: true }),
          Animated.timing(orbScale, { toValue: 0.95, duration: 600, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(orbGlowScale, { toValue: 1.18, duration: 600, useNativeDriver: true }),
          Animated.timing(orbGlowScale, { toValue: 1.0, duration: 600, useNativeDriver: true }),
        ]),
      ]),
    );
    activeAnim.current.start();
  }, [orbScale, orbGlowScale]);

  // Listening rings — 3 concentric expanding circles
  const ring1Scale = useRef(new Animated.Value(0)).current;
  const ring1Opacity = useRef(new Animated.Value(0)).current;
  const ring2Scale = useRef(new Animated.Value(0)).current;
  const ring2Opacity = useRef(new Animated.Value(0)).current;
  const ring3Scale = useRef(new Animated.Value(0)).current;
  const ring3Opacity = useRef(new Animated.Value(0)).current;
  const ringAnim = useRef<Animated.CompositeAnimation | null>(null);

  const startRings = useCallback(() => {
    const createRing = (scale: Animated.Value, opacity: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scale, { toValue: 1.8, duration: 1500, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0, duration: 1500, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scale, { toValue: 0.8, duration: 0, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0.5, duration: 0, useNativeDriver: true }),
          ]),
        ]),
      );
    ringAnim.current = Animated.parallel([
      createRing(ring1Scale, ring1Opacity, 0),
      createRing(ring2Scale, ring2Opacity, 500),
      createRing(ring3Scale, ring3Opacity, 1000),
    ]);
    // Set initial state
    ring1Scale.setValue(0.8); ring1Opacity.setValue(0.5);
    ring2Scale.setValue(0.8); ring2Opacity.setValue(0.5);
    ring3Scale.setValue(0.8); ring3Opacity.setValue(0.5);
    ringAnim.current.start();
  }, [ring1Scale, ring1Opacity, ring2Scale, ring2Opacity, ring3Scale, ring3Opacity]);

  const stopRings = useCallback(() => {
    ringAnim.current?.stop();
    ring1Opacity.setValue(0);
    ring2Opacity.setValue(0);
    ring3Opacity.setValue(0);
  }, [ring1Opacity, ring2Opacity, ring3Opacity]);

  useEffect(() => { startIdle(); }, [startIdle]);

  const animateTextIn = useCallback(() => {
    textOpacity.setValue(0);
    textTranslateY.setValue(-20);
    Animated.parallel([
      Animated.timing(textOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(textTranslateY, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [textOpacity, textTranslateY]);

  const animateTextOut = useCallback(() => {
    return new Promise<void>((resolve) => {
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(textTranslateY, { toValue: 20, duration: 250, useNativeDriver: true }),
      ]).start(() => resolve());
    });
  }, [textOpacity, textTranslateY]);

  // Send a message to the interview and stream the response
  const sendMessage = useCallback(async (userMessage?: string) => {
    if (userMessage) {
      const endPhrases = ['end the convo', 'end convo', 'end the conversation', 'stop', 'done', 'finish', 'that\'s it', 'thats it', 'i\'m done', 'im done'];
      const lower = userMessage.toLowerCase().trim();
      if (endPhrases.some((p) => lower.includes(p))) {
        messagesRef.current.push({
          role: 'user',
          content: userMessage + '\n\n[The user wants to end the interview. Immediately generate their <profile> summary now based on everything discussed so far. Do not ask any more questions.]',
        });
      } else {
        messagesRef.current.push({ role: 'user', content: userMessage });
      }
    }

    setSpeaking(true);
    streamActiveRef.current = true;
    profileDetectedRef.current = false;
    startSpeaking();
    setTranscript('');
    setDisplayText('');
    animateTextIn();
    speechBufferRef.current = '';
    pendingSentencesRef.current = '';
    stopAudio();

    let fullResponse = '';

    try {
      fullResponse = await streamInterview(
        messagesRef.current,
        (chunk) => {
          // Detect <profile> tag — check accumulated buffer too in case tag splits across chunks
          if (!profileDetectedRef.current) {
            fullResponse += chunk;
            if (fullResponse.includes('<profile>')) {
              profileDetectedRef.current = true;
            }
          }
          // Strip <profile> tags from display text
          setDisplayText((prev) => {
            const updated = prev + chunk;
            const cleaned = updated.replace(/<profile>[\s\S]*$/, '').trim();
            return cleaned;
          });
          // Speak chunk unless profile has been detected
          if (!profileDetectedRef.current) {
            flushSpeechBuffer(chunk);
          }
        },
      );
      flushSpeechBuffer('', true);

      messagesRef.current.push({ role: 'assistant', content: fullResponse });

      if (containsProfile(fullResponse)) {
        const parsed = parseProfile(fullResponse);
        if (parsed) {
          setProfile(parsed);
          setDone(true);
          setDisplayText(parsed.summary);
        }
      }
    } catch (err: any) {
      console.error('Interview error:', err);
      setDisplayText(err.message || 'Something went wrong. Tap to try again.');
    } finally {
      streamActiveRef.current = false;
      // Only go idle if audio has already drained — otherwise playNext handles it
      if (!isPlayingRef.current && audioQueueRef.current.length === 0) {
        setSpeaking(false);
        startIdle();
      }
    }
  }, [startSpeaking, startIdle, animateTextIn, flushSpeechBuffer, stopAudio]);

  // Speech recognition events
  useSpeechRecognitionEvent('start', () => {
    setListening(true);
    startListeningAnim();
    startRings();
  });

  useSpeechRecognitionEvent('result', (e) => {
    const text = e.results?.[0]?.transcript;
    if (text) {
      finalTranscriptRef.current += (finalTranscriptRef.current ? ' ' : '') + text;
      setTranscript(finalTranscriptRef.current);
    }
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    stopRings();
    if (!text) return;
    await animateTextOut();
    sendMessage(text);
  });

  useSpeechRecognitionEvent('error', () => {
    setListening(false);
    stopRings();
    startIdle();
  });

  useEffect(() => {
    return () => {
      ExpoSpeechRecognitionModule.stop();
      stopAudio();
    };
  }, [stopAudio]);

  // Start the interview on mount — seed with a greeting so Claude has at least one message
  useEffect(() => {
    sendMessage('Hi');
  }, []);

  const handleMicPress = async () => {
    if (speaking) return;

    if (listening) {
      ExpoSpeechRecognitionModule.stop();
      return;
    }

    await stopAudio();
    speechBufferRef.current = '';

    try {
      const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission denied', 'Microphone and speech recognition access is required.');
        return;
      }
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: true,
        continuous: true,
      });
    } catch {
      Alert.alert('Error', 'Could not start voice recognition. Please try again.');
    }
  };

  const handleThatsMe = async () => {
    if (!profile || saving) return;
    setSaving(true);

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', authUser.id)
        .single();

      if (userError || !userData) throw userError || new Error('User not found');

      await saveProfile(userData.id, profile, messagesRef.current);

      router.replace('/(app)/home');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Title */}
      <Text style={styles.title}>Human</Text>

      {/* Orb — centered */}
      <View style={styles.orbArea}>
        <Animated.View
          style={[
            styles.orbGlow,
            { transform: [{ scale: orbGlowScale }] },
          ]}
        >
          <Svg width={ORB_SIZE * 2} height={ORB_SIZE * 2}>
            <Defs>
              <RadialGradient id="outerGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#FF00DD" stopOpacity="0.4" />
                <Stop offset="35%" stopColor="#FF00DD" stopOpacity="0.15" />
                <Stop offset="100%" stopColor="#FF00DD" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Ellipse cx={ORB_SIZE} cy={ORB_SIZE} rx={ORB_SIZE} ry={ORB_SIZE} fill="url(#outerGlow)" />
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
              <RadialGradient id="coreGrad" cx="50%" cy="45%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#FF66EE" stopOpacity="1" />
                <Stop offset="30%" stopColor="#FF00DD" stopOpacity="0.9" />
                <Stop offset="60%" stopColor="#CC00AA" stopOpacity="0.45" />
                <Stop offset="100%" stopColor="#880077" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Circle cx={ORB_SIZE / 2} cy={ORB_SIZE / 2} r={ORB_SIZE / 2} fill="url(#coreGrad)" />
          </Svg>
        </Animated.View>

        {/* Listening rings — expand outward when recording */}
        {[
          { scale: ring1Scale, opacity: ring1Opacity },
          { scale: ring2Scale, opacity: ring2Opacity },
          { scale: ring3Scale, opacity: ring3Opacity },
        ].map((ring, i) => (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={[
              styles.listeningRing,
              {
                opacity: ring.opacity,
                transform: [{ scale: ring.scale }],
              },
            ]}
          />
        ))}
      </View>

      {/* Human's text */}
      <View style={styles.textArea}>
        {listening ? (
          <Text style={styles.listeningText}>Listening...</Text>
        ) : (
          <Animated.Text
            style={[
              styles.questionText,
              {
                opacity: textOpacity,
                transform: [{ translateY: textTranslateY }],
              },
            ]}
          >
            {displayText}
          </Animated.Text>
        )}

        <View style={styles.fadeTop} pointerEvents="none">
          <Svg width={width} height={30}>
            <Defs>
              <SvgLinearGradient id="ft" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000000" stopOpacity="1" />
                <Stop offset="1" stopColor="#000000" stopOpacity="0" />
              </SvgLinearGradient>
            </Defs>
            <Rect x="0" y="0" width={width} height={30} fill="url(#ft)" />
          </Svg>
        </View>

        <View style={styles.fadeBottom} pointerEvents="none">
          <Svg width={width} height={30}>
            <Defs>
              <SvgLinearGradient id="fb" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000000" stopOpacity="0" />
                <Stop offset="1" stopColor="#000000" stopOpacity="1" />
              </SvgLinearGradient>
            </Defs>
            <Rect x="0" y="0" width={width} height={30} fill="url(#fb)" />
          </Svg>
        </View>
      </View>

      {/* User's speech transcript */}
      {listening && transcript ? (
        <View style={styles.transcriptArea}>
          <Text style={styles.transcriptLabel}>You</Text>
          <Text style={styles.transcriptText}>{transcript}</Text>
        </View>
      ) : null}

      {/* Bottom — mic or "That's me!" */}
      <View style={styles.bottomArea}>
        {done ? (
          <TouchableOpacity
            style={[styles.continueButton, saving && { opacity: 0.5 }]}
            onPress={handleThatsMe}
            disabled={saving}
          >
            <Text style={styles.continueText}>
              {saving ? 'Saving...' : "That's me!"}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.micButton, speaking && styles.micSpeaking, listening && styles.micListening]}
            onPress={handleMicPress}
            disabled={speaking}
            activeOpacity={0.7}
          >
            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z"
                fill="#FFFFFF"
              />
              <Path
                d="M17 12C17 14.76 14.76 17 12 17C9.24 17 7 14.76 7 12H5C5 15.53 7.61 18.43 11 18.92V22H13V18.92C16.39 18.43 19 15.53 19 12H17Z"
                fill="#FFFFFF"
              />
            </Svg>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 70,
  },
  orbArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  textArea: {
    height: 120,
    width: width,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 44,
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
  },
  transcriptArea: {
    width: width,
    paddingHorizontal: 44,
    paddingVertical: 12,
  },
  transcriptLabel: {
    color: '#FF00DD',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    textAlign: 'center',
  },
  transcriptText: {
    color: '#AAAAAA',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  bottomArea: {
    paddingBottom: 60,
    alignItems: 'center',
  },
  listeningRing: {
    position: 'absolute',
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    borderWidth: 1.5,
    borderColor: '#FF00DD',
  },
  listeningText: {
    color: '#FF00DD',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 2,
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#1A1A1A',
    borderWidth: 1.5,
    borderColor: '#444444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micSpeaking: {
    opacity: 0.4,
  },
  micListening: {
    backgroundColor: '#FF00DD',
    borderColor: '#FF00DD',
  },
  continueButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 44,
  },
  continueText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
});
