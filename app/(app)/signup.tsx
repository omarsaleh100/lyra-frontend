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

export default function SignupScreen() {
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
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Profile</Text>

        {/* Photo upload — 4 vertical rectangles */}
        <View style={styles.photoRow}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={styles.photoSlot}>
              {i === 0 && <Text style={styles.photoPlus}>+</Text>}
            </View>
          ))}
        </View>
        <Text style={styles.photoHint}>Add photos that best represent you</Text>

        {/* Name */}
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#444"
          autoCapitalize="words"
        />

        {/* Age */}
        <Text style={styles.label}>Age</Text>
        <TextInput
          style={styles.input}
          value={age}
          onChangeText={setAge}
          placeholder="18+"
          placeholderTextColor="#444"
          keyboardType="number-pad"
          maxLength={2}
        />

        {/* Gender */}
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

        {/* Orientation */}
        <Text style={styles.label}>Want to meet</Text>
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
          style={[styles.confirmButton, !canContinue && styles.buttonDisabled]}
          onPress={() => router.replace('/(app)/home')}
          disabled={!canContinue}
        >
          <Text style={styles.confirmText}>Confirm</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  scrollContent: { paddingTop: 70, paddingBottom: 40, paddingHorizontal: 24 },
  heading: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  photoSlot: {
    flex: 1,
    aspectRatio: 0.7,
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222222',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlus: {
    color: '#555555',
    fontSize: 28,
    fontWeight: '300',
  },
  photoHint: {
    color: '#555555',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  label: {
    color: '#888888',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 18,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#111111',
    color: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#111111',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#222222',
  },
  chipActive: {
    borderColor: '#FFFFFF',
    backgroundColor: '#1A1A1A',
  },
  chipText: {
    color: '#666666',
    fontSize: 15,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  confirmButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 44,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 36,
  },
  confirmText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.3,
  },
});
