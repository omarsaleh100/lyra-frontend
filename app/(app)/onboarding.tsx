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
import Voice from '@react-native-voice/voice';
import * as Speech from 'expo-speech';
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
  const [transcript, setTranscript] = useState('');
  const [done, setDone] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [profile, setProfile] = useState<LyraProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const messagesRef = useRef<Message[]>([]);
  const speechBufferRef = useRef('');

  // Speak a sentence immediately, queuing behind any in-progress speech
  const speakChunk = useCallback((text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    Speech.speak(cleaned, { language: 'en-US', _isQueued: true } as any);
  }, []);

  // Called on each streamed chunk — accumulate and speak sentence by sentence
  const flushSpeechBuffer = useCallback((chunk: string, final = false) => {
    speechBufferRef.current += chunk;
    const sentenceEnd = /[.!?]/;

    let buf = speechBufferRef.current;
    let match;
    // Keep pulling out complete sentences and speaking them
    while ((match = buf.search(sentenceEnd)) !== -1) {
      const sentence = buf.slice(0, match + 1);
      buf = buf.slice(match + 1);
      speakChunk(sentence);
    }
    speechBufferRef.current = buf;

    // On final chunk, speak whatever's left in the buffer
    if (final && buf.trim()) {
      speakChunk(buf);
      speechBufferRef.current = '';
    }
  }, [speakChunk]);

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

  useEffect(() => { startIdle(); }, [startIdle]);

  // Wire up Voice recognition
  useEffect(() => {
    Voice.onSpeechStart = () => {
      setListening(true);
      setTranscript('');
      startListeningAnim();
    };

    Voice.onSpeechPartialResults = (e: any) => {
      if (e.value?.[0]) setTranscript(e.value[0]);
    };

    Voice.onSpeechResults = async (e: any) => {
      const text = e.value?.[0];
      setListening(false);
      setTranscript('');
      if (!text) return;
      await animateTextOut();
      sendMessage(text);
    };

    Voice.onSpeechError = () => {
      setListening(false);
      setTranscript('');
      startIdle();
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      Speech.stop();
    };
  }, [startListeningAnim, startIdle, animateTextOut, sendMessage]);

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
      messagesRef.current.push({ role: 'user', content: userMessage });
    }

    setSpeaking(true);
    startSpeaking();
    setDisplayText('');
    animateTextIn();
    speechBufferRef.current = '';
    Speech.stop();

    let fullResponse = '';

    try {
      fullResponse = await streamInterview(
        messagesRef.current,
        (chunk) => {
          // Strip <profile> tags from display text
          setDisplayText((prev) => {
            const updated = prev + chunk;
            const cleaned = updated.replace(/<profile>[\s\S]*$/, '').trim();
            return cleaned;
          });
          // Speak chunk unless it's inside a <profile> block
          if (!chunk.includes('<profile>') && !fullResponse.includes('<profile>')) {
            flushSpeechBuffer(chunk);
          }
        },
      );
      // Flush any remaining buffer after stream ends
      flushSpeechBuffer('', true);

      messagesRef.current.push({ role: 'assistant', content: fullResponse });

      // Check if interview is complete
      if (containsProfile(fullResponse)) {
        const parsed = parseProfile(fullResponse);
        if (parsed) {
          setProfile(parsed);
          setDone(true);
          // Show the summary instead of the raw text
          setDisplayText(parsed.summary);
        }
      }
    } catch (err: any) {
      setDisplayText('Something went wrong. Tap to try again.');
    } finally {
      setSpeaking(false);
      startIdle();
    }
  }, [startSpeaking, startIdle, animateTextIn]);

  // Start the interview on mount
  useEffect(() => {
    sendMessage();
  }, []);

  const handleMicPress = async () => {
    if (speaking) return;

    if (listening) {
      await Voice.stop();
      return;
    }

    // Stop Lyra mid-sentence if still talking
    Speech.stop();
    speechBufferRef.current = '';

    try {
      await Voice.start('en-US');
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

      // Get the user's internal ID
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
      <Text style={styles.title}>Lyra</Text>

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
      </View>

      {/* Text area */}
      <View style={styles.textArea}>
        <Animated.Text
          style={[
            styles.questionText,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }],
            },
          ]}
        >
          {listening ? (transcript || '...') : displayText}
        </Animated.Text>

        {/* Top fade overlay */}
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

        {/* Bottom fade overlay */}
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

      {/* Bottom — mic, "That's me!", or continue */}
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

  // Orb
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

  // Text
  textArea: {
    height: 90,
    width: width,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  questionText: {
    color: '#AAAAAA',
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

  // Bottom
  bottomArea: {
    paddingBottom: 60,
    alignItems: 'center',
  },
  micButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  micSpeaking: {
    opacity: 0.3,
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
