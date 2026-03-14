import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const BOT_QUESTIONS = [
  "Hey! I'm Lyra. I'd love to get to know you. What's something you're passionate about that most people wouldn't guess?",
  "That's really interesting! If you could have dinner with anyone, living or dead, who would it be and why?",
  "Love that answer. What does a perfect Sunday look like for you?",
  "Nice! What's something you're looking for in a connection with someone?",
  "Last one — what's the most spontaneous thing you've ever done?",
];

const MOCK_PROFILE = {
  name: 'You',
  age: 25,
  personality:
    'Creative and thoughtful with a dry sense of humor. Values deep conversations over small talk. Adventurous spirit with a cozy side.',
};

export default function InterviewScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [typing, setTyping] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Send first question on mount
  useEffect(() => {
    simulateBotMessage(BOT_QUESTIONS[0]);
  }, []);

  const simulateBotMessage = (text: string) => {
    setTyping(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: 'assistant', content: text }]);
      setTyping(false);
    }, 1200);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || typing) return;

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: text },
    ];
    setMessages(newMessages);
    setInput('');

    const nextIndex = questionIndex + 1;
    setQuestionIndex(nextIndex);

    if (nextIndex < BOT_QUESTIONS.length) {
      simulateBotMessage(BOT_QUESTIONS[nextIndex]);
    } else {
      // Interview done — show profile
      setTyping(true);
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content:
              "Thanks for sharing all of that! I think I have a good sense of who you are. Here's how I see you:",
          },
        ]);
        setTyping(false);
        setTimeout(() => setShowProfile(true), 800);
      }, 1500);
    }
  };

  if (showProfile) {
    return (
      <View style={styles.container}>
        <View style={styles.profileHeader}>
          <Text style={styles.profileTitle}>This is how Lyra sees you</Text>
          <Text style={styles.profileSubtitle}>Does this feel right?</Text>
        </View>
        <View style={styles.profileCard}>
          <View style={styles.personalityBox}>
            <Text style={styles.personalityLabel}>Your personality</Text>
            <Text style={styles.personalityText}>{MOCK_PROFILE.personality}</Text>
          </View>
        </View>
        <View style={styles.profileActions}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => setShowProfile(false)}
          >
            <Text style={styles.secondaryButtonText}>Back to chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.replace('/(app)/home')}
          >
            <Text style={styles.primaryButtonText}>That's me!</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Progress */}
      <View style={styles.progressContainer}>
        <Text style={styles.progressText}>
          Getting to know you... {Math.min(questionIndex + 1, BOT_QUESTIONS.length)}/{BOT_QUESTIONS.length}
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${((questionIndex + 1) / BOT_QUESTIONS.length) * 100}%` },
            ]}
          />
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={({ item }) => (
          <View style={[styles.bubbleRow, item.role === 'user' && styles.bubbleRowUser]}>
            <View
              style={[
                styles.bubble,
                item.role === 'user' ? styles.bubbleUser : styles.bubbleBot,
              ]}
            >
              <Text style={[styles.bubbleText, item.role === 'user' && styles.bubbleTextUser]}>
                {item.content}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.messageList}
        ListFooterComponent={
          typing ? (
            <View style={styles.bubbleRow}>
              <View style={[styles.bubble, styles.bubbleBot]}>
                <Text style={styles.dots}>• • •</Text>
              </View>
            </View>
          ) : null
        }
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Type your answer..."
          placeholderTextColor="#555"
          multiline
          maxLength={500}
          editable={!typing}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || typing) && styles.sendDisabled]}
          onPress={handleSend}
          disabled={!input.trim() || typing}
        >
          <Text style={styles.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  progressContainer: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 12 },
  progressText: { color: '#8B5CF6', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  progressBar: { height: 4, backgroundColor: '#1A1A2E', borderRadius: 2 },
  progressFill: { height: '100%', backgroundColor: '#8B5CF6', borderRadius: 2 },
  messageList: { paddingVertical: 12 },
  bubbleRow: { flexDirection: 'row', marginVertical: 4, marginHorizontal: 16 },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  bubbleUser: { backgroundColor: '#8B5CF6', borderBottomRightRadius: 4 },
  bubbleBot: { backgroundColor: '#1E1E2E', borderBottomLeftRadius: 4 },
  bubbleText: { color: '#E0E0E0', fontSize: 16, lineHeight: 22 },
  bubbleTextUser: { color: '#FFFFFF' },
  dots: { color: '#888', fontSize: 18, letterSpacing: 2 },
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 12,
    paddingVertical: 12, paddingBottom: 36, borderTopWidth: 1, borderTopColor: '#1A1A2E',
  },
  textInput: {
    flex: 1, backgroundColor: '#1A1A2E', color: '#FFFFFF', borderRadius: 20,
    paddingHorizontal: 18, paddingVertical: 12, fontSize: 16, maxHeight: 100,
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#8B5CF6',
    justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  profileHeader: { paddingTop: 80, paddingHorizontal: 24, paddingBottom: 16, alignItems: 'center' },
  profileTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800' },
  profileSubtitle: { color: '#777788', fontSize: 16, marginTop: 6 },
  profileCard: { marginHorizontal: 24, marginTop: 16 },
  personalityBox: { backgroundColor: '#1A1A2E', borderRadius: 20, padding: 24 },
  personalityLabel: {
    color: '#8B5CF6', fontSize: 12, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8,
  },
  personalityText: { color: '#D0D0E0', fontSize: 17, lineHeight: 26 },
  profileActions: {
    flexDirection: 'row', justifyContent: 'center', gap: 12,
    paddingHorizontal: 24, paddingTop: 24,
  },
  primaryButton: { backgroundColor: '#8B5CF6', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 28 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  secondaryButton: { backgroundColor: '#1A1A2E', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 28 },
  secondaryButtonText: { color: '#AAAACC', fontSize: 16, fontWeight: '600' },
});
