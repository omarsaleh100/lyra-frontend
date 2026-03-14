import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.saved}>Personality Saved.</Text>
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity
          style={styles.appleButton}
          onPress={() => router.replace('/(app)/signup')}
        >
          <Text style={styles.appleButtonText}> Continue with Apple</Text>
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
  saved: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
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
