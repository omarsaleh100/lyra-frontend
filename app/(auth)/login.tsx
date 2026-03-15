import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (loading) return;
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      Alert.alert('Missing Email', 'Please enter your email.');
      return;
    }
    setLoading(true);

    try {
      // Dev shortcut: use a deterministic password so we can sign up / sign in
      // with just an email. Will be replaced with OTP later.
      const devPassword = `${trimmed}_lyra_dev_2026`;

      // Try signing in first (returning user)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password: devPassword,
      });

      if (!signInError) {
        // Returning user — let the smart router decide where to go
        router.replace('/');
        return;
      }

      // New user — sign up
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmed,
        password: devPassword,
      });
      if (signUpError) throw signUpError;

      if (!data.user) throw new Error('Sign up succeeded but no user returned');

      // New user — smart router will send them to signup
      router.replace('/');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Human</Text>
        <Text style={styles.subtitle}>Find your person</Text>
      </View>

      <View style={styles.bottom}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666666"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />

        <TouchableOpacity
          style={[styles.continueButton, loading && { opacity: 0.5 }]}
          onPress={handleContinue}
          disabled={loading}
        >
          <Text style={styles.continueButtonText}>
            {loading ? 'Please wait...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#666666',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  bottom: {
    paddingHorizontal: 24,
    paddingBottom: 50,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 44,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  continueButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 44,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
});
