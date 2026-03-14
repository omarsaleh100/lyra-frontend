import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';

const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Other'];
const ORIENTATION_OPTIONS = ['Everyone', 'Men', 'Women'];

export default function OnboardingScreen() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [orientation, setOrientation] = useState('');

  const canContinue = name.trim() && age && gender && orientation;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Tell us about you</Text>
        <Text style={styles.subheading}>This info helps Lyra find your person.</Text>

        {/* Photo placeholder */}
        <View style={styles.photoBox}>
          <Text style={styles.photoPlaceholder}>+ Add Photo</Text>
        </View>

        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#555"
          autoCapitalize="words"
        />

        <Text style={styles.label}>Age</Text>
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          placeholder="18+"
          placeholderTextColor="#555"
          keyboardType="number-pad"
          maxLength={2}
        />

        <Text style={styles.label}>Gender</Text>
        <View style={styles.chipRow}>
          {GENDER_OPTIONS.map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.chip, gender === g && styles.chipActive]}
              onPress={() => setGender(g)}
            >
              <Text style={[styles.chipText, gender === g && styles.chipTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Show me</Text>
        <View style={styles.chipRow}>
          {ORIENTATION_OPTIONS.map((o) => (
            <TouchableOpacity
              key={o}
              style={[styles.chip, orientation === o && styles.chipActive]}
              onPress={() => setOrientation(o)}
            >
              <Text style={[styles.chipText, orientation === o && styles.chipTextActive]}>{o}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, !canContinue && styles.buttonDisabled]}
          onPress={() => router.replace('/(app)/interview')}
          disabled={!canContinue}
        >
          <Text style={styles.primaryButtonText}>Next</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0F' },
  scrollContent: { paddingTop: 80, paddingBottom: 40, paddingHorizontal: 24 },
  heading: { color: '#FFFFFF', fontSize: 32, fontWeight: '800' },
  subheading: { color: '#777788', fontSize: 16, marginTop: 8, marginBottom: 28 },
  photoBox: {
    width: 120, height: 160, borderRadius: 16, backgroundColor: '#1A1A2E',
    justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 28,
  },
  photoPlaceholder: { color: '#8B5CF6', fontSize: 16, fontWeight: '600' },
  label: { color: '#AAAABB', fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#1A1A2E', color: '#FFFFFF', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: '#1A1A2E', borderRadius: 20, paddingHorizontal: 18,
    paddingVertical: 10, borderWidth: 1.5, borderColor: 'transparent',
  },
  chipActive: { borderColor: '#8B5CF6', backgroundColor: '#1E1040' },
  chipText: { color: '#999', fontSize: 15, fontWeight: '500' },
  chipTextActive: { color: '#8B5CF6' },
  primaryButton: {
    backgroundColor: '#8B5CF6', borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginTop: 32,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  buttonDisabled: { opacity: 0.4 },
});
