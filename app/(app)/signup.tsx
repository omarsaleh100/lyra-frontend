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
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';

const GENDER_OPTIONS = [
  { label: 'Male', value: 'man' },
  { label: 'Female', value: 'woman' },
  { label: 'Non-binary', value: 'nonbinary' },
];

const ORIENTATION_OPTIONS = [
  { label: 'Everyone', value: ['man', 'woman', 'nonbinary'] },
  { label: 'Men', value: ['man'] },
  { label: 'Women', value: ['woman'] },
];

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');           // stores the value, e.g. 'man'
  const [orientation, setOrientation] = useState('');   // stores the label, e.g. 'Everyone'
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null, null]);
  const [saving, setSaving] = useState(false);

  const canContinue = name.trim() && age && gender && orientation;

  const pickPhoto = async (index: number) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library in Settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    const updated = [...photos];
    updated[index] = result.assets[0].uri;
    setPhotos(updated);
  };

  const uploadPhoto = async (localUri: string, authId: string): Promise<string> => {
    const ext = localUri.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}.${ext}`;
    const filePath = `photos/${authId}/${fileName}`;

    // Read the file as blob
    const response = await fetch(localUri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();

    const { error } = await supabase.storage
      .from('profilepic')
      .upload(filePath, arrayBuffer, {
        contentType: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage.from('profilepic').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleConfirm = async () => {
    if (!canContinue || saving) return;
    setSaving(true);

    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        await supabase.auth.signOut();
        router.replace('/(auth)/login');
        return;
      }

      // Upload the first photo if one was selected
      let photoUrl: string | null = null;
      const firstPhoto = photos[0];
      if (firstPhoto) {
        photoUrl = await uploadPhoto(firstPhoto, authUser.id);
      }

      // Map orientation label to the actual array of gender values
      const showMeMap: Record<string, string[]> = {
        'Everyone': ['man', 'woman', 'nonbinary'],
        'Men': ['man'],
        'Women': ['woman'],
      };

      const upsertData: Record<string, any> = {
        auth_id: authUser.id,
        name: name.trim(),
        age: parseInt(age, 10),
        gender: [gender],
        show_me: showMeMap[orientation] || [],
      };

      if (photoUrl) {
        upsertData.photo_url = photoUrl;
      }

      const { error } = await supabase
        .from('users')
        .upsert(upsertData, { onConflict: 'auth_id' });

      if (error) throw error;

      router.replace('/(app)/onboarding');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

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
          {photos.map((uri, i) => (
            <TouchableOpacity key={i} style={styles.photoSlot} onPress={() => pickPhoto(i)} activeOpacity={0.7}>
              {uri ? (
                <Image source={{ uri }} style={styles.photoImage} />
              ) : (
                <Text style={styles.photoPlus}>+</Text>
              )}
            </TouchableOpacity>
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
              key={g.value}
              style={[styles.chip, gender === g.value && styles.chipActive]}
              onPress={() => setGender(g.value)}
            >
              <Text style={[styles.chipText, gender === g.value && styles.chipTextActive]}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Orientation */}
        <Text style={styles.label}>Want to meet</Text>
        <View style={styles.chipRow}>
          {ORIENTATION_OPTIONS.map((o) => (
            <TouchableOpacity
              key={o.label}
              style={[styles.chip, orientation === o.label && styles.chipActive]}
              onPress={() => setOrientation(o.label)}
            >
              <Text style={[styles.chipText, orientation === o.label && styles.chipTextActive]}>{o.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.confirmButton, (!canContinue || saving) && styles.buttonDisabled]}
          onPress={handleConfirm}
          disabled={!canContinue || saving}
        >
          {saving ? (
            <ActivityIndicator color="#000000" />
          ) : (
            <Text style={styles.confirmText}>Confirm</Text>
          )}
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
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 11,
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
