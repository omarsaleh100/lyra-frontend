import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from '../../lib/supabase';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);

  const handleAppleSignIn = async () => {
    if (loading) return;
    setLoading(true);

    try {
      // Generate nonce for security
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
      );

      // Apple Sign-In
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error('No identity token received from Apple');
      }

      // Sign in with Supabase using Apple's identity token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) throw error;

      // Create user row if this is a first login (Apple only provides name once)
      const authUser = data.user;
      const fullName = credential.fullName;
      const displayName = fullName
        ? [fullName.givenName, fullName.familyName].filter(Boolean).join(' ')
        : undefined;

      if (displayName) {
        // First login — upsert with real name
        const { error: upsertError } = await supabase
          .from('users')
          .upsert(
            { auth_id: authUser.id, name: displayName },
            { onConflict: 'auth_id' },
          );
        if (upsertError) throw upsertError;
      } else {
        // Returning login — ensure row exists but don't overwrite their name
        const { data: existing } = await supabase
          .from('users')
          .select('id')
          .eq('auth_id', authUser.id)
          .single();
        if (!existing) {
          // Auth exists but no users row (edge case) — create with placeholder
          const { error: insertError } = await supabase
            .from('users')
            .insert({ auth_id: authUser.id, name: 'User' });
          if (insertError) throw insertError;
        }
      }

      // Let index.tsx decide where to route (signup, onboarding, or home)
      router.replace('/');
    } catch (err: any) {
      if (err.code === 'ERR_REQUEST_CANCELED') {
        // User cancelled — do nothing
      } else {
        Alert.alert('Sign In Error', err.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Lyra</Text>
        <Text style={styles.subtitle}>Find your person</Text>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={[styles.appleButton, loading && { opacity: 0.5 }]}
          onPress={handleAppleSignIn}
          disabled={loading}
        >
          <Text style={styles.appleButtonText}>
            {loading ? 'Signing in...' : ' Continue with Apple'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
  appleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 44,
    paddingVertical: 16,
    alignItems: 'center',
  },
  appleButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
});
