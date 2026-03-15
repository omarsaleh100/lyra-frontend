import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
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
  const [thinking, setThinking] = useState(false);
  const [done, setDone] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const [inputText, setInputText] = useState('');
  const [profile, setProfile] = useState<LyraProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const messagesRef = useRef<Message[]>([]);
  const profileDetectedRef = useRef(false);

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

  const startThinking = useCallback(() => {
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

    setThinking(true);
    profileDetectedRef.current = false;
    startThinking();
    setDisplayText('');
    animateTextIn();

    let fullResponse = '';

    try {
      fullResponse = await streamInterview(
        messagesRef.current,
        (chunk) => {
          if (!profileDetectedRef.current) {
            fullResponse += chunk;
            if (fullResponse.includes('<profile>')) {
              profileDetectedRef.current = true;
            }
          }
          setDisplayText((prev) => {
            const updated = prev + chunk;
            const cleaned = updated.replace(/<profile>[\s\S]*$/, '').trim();
            return cleaned;
          });
        },
      );

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
      setThinking(false);
      startIdle();
    }
  }, [startThinking, startIdle, animateTextIn]);

  // Start the interview on mount
  useEffect(() => {
    sendMessage('Hi');
  }, []);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || thinking) return;
    setInputText('');
    await animateTextOut();
    sendMessage(text);
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
      </View>

      {/* Human's text */}
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
          {displayText}
        </Animated.Text>

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

      {/* Bottom — input or "That's me!" */}
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
          <View style={styles.inputRow}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Type your answer..."
              placeholderTextColor="#666666"
              editable={!thinking}
              onSubmitEditing={handleSend}
              returnKeyType="send"
              multiline={false}
            />
            <TouchableOpacity
              style={[styles.sendButton, (thinking || !inputText.trim()) && { opacity: 0.3 }]}
              onPress={handleSend}
              disabled={thinking || !inputText.trim()}
            >
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
                  fill="#FFFFFF"
                />
              </Svg>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
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
  bottomArea: {
    paddingBottom: 40,
    paddingHorizontal: 20,
    width: '100%',
    alignItems: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  textInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#1A1A1A',
    borderRadius: 24,
    paddingHorizontal: 20,
    color: '#FFFFFF',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#333333',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF00DD',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
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
