import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>Lyra</Text>
        <Text style={styles.tagline}>Meet the person, not the profile.</Text>
        <Text style={styles.subtitle}>
          AI-powered compatibility. Proximity-based meetings. No swiping.
        </Text>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.appleButton}
          onPress={() => router.replace('/(app)/home')}
        >
          <Text style={styles.appleButtonText}>Sign in with Apple</Text>
        </TouchableOpacity>

        <Text style={styles.terms}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
    justifyContent: 'space-between',
    paddingTop: 120,
    paddingBottom: 60,
  },
  hero: { alignItems: 'center', paddingHorizontal: 32 },
  logo: { color: '#FFFFFF', fontSize: 56, fontWeight: '800', letterSpacing: -1 },
  tagline: { color: '#8B5CF6', fontSize: 18, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  subtitle: { color: '#777788', fontSize: 15, marginTop: 12, textAlign: 'center', lineHeight: 22 },
  bottom: { alignItems: 'center', paddingHorizontal: 32 },
  appleButton: {
    width: '100%',
    height: 56,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appleButtonText: { color: '#000000', fontSize: 18, fontWeight: '600' },
  terms: { color: '#555566', fontSize: 12, textAlign: 'center', marginTop: 20, lineHeight: 18 },
});
