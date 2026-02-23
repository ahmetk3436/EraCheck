import React, { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, Alert, Pressable, ActivityIndicator, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import AppleSignInButton from '../../components/ui/AppleSignInButton';
import { hapticLight } from '../../lib/haptics';

export default function RegisterScreen() {
  const { register } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    setError('');
    hapticLight();

    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password);
      router.replace('/(protected)/(tabs)');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(msg);
      if (err.response?.status === 409) {
        Alert.alert('Email Already Registered', 'This email is already in use. Please sign in instead.', [
          { text: 'Sign In', onPress: () => router.replace('/(auth)/login') },
          { text: 'OK', style: 'cancel' },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#030712' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={insets.top}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 32, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Branded Header */}
          <View className="items-center mb-8">
            <Ionicons name="sparkles" size={48} color="#ec4899" />
            <Text className="text-3xl font-bold mt-4" style={{ color: '#ec4899' }}>
              EraCheck
            </Text>
            <Text className="text-lg text-gray-400 mt-2">
              Create your account
            </Text>
            <Text className="text-sm text-gray-500 mt-1 text-center">
              Join thousands discovering their aesthetic era
            </Text>
          </View>

          {error ? (
            <View className="mb-4 rounded-2xl p-4" style={{ backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: '#ef4444' }}>
              <Text className="text-sm font-medium" style={{ color: '#f87171' }}>{error}</Text>
            </View>
          ) : null}

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-300 mb-2">Email</Text>
            <TextInput
              className="rounded-xl px-4 py-3.5 text-base text-white"
              style={{ backgroundColor: '#1c1c2e', borderWidth: 1, borderColor: '#3f3f5a' }}
              placeholder="you@example.com"
              placeholderTextColor="#6b7280"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
            />
          </View>

          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-300 mb-2">Password</Text>
            <TextInput
              className="rounded-xl px-4 py-3.5 text-base text-white"
              style={{ backgroundColor: '#1c1c2e', borderWidth: 1, borderColor: '#3f3f5a' }}
              placeholder="Min. 8 characters"
              placeholderTextColor="#6b7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="newPassword"
              returnKeyType="next"
            />
          </View>

          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-300 mb-2">Confirm Password</Text>
            <TextInput
              className="rounded-xl px-4 py-3.5 text-base text-white"
              style={{ backgroundColor: '#1c1c2e', borderWidth: 1, borderColor: '#3f3f5a' }}
              placeholder="Repeat your password"
              placeholderTextColor="#6b7280"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={handleRegister}
            />
          </View>

          <Pressable
            onPress={handleRegister}
            disabled={isLoading}
            style={{ opacity: isLoading ? 0.6 : 1 }}
          >
            <LinearGradient
              colors={['#A855F7', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-xl py-4 items-center justify-center"
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text className="text-white text-lg font-bold">Create Account</Text>
              )}
            </LinearGradient>
          </Pressable>

          {/* Sign in with Apple (Guideline 4.8) */}
          <AppleSignInButton onError={(msg: string) => setError(msg)} />

          <View className="mt-6 flex-row items-center justify-center">
            <Text className="text-gray-400">Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <Text className="font-semibold" style={{ color: '#ec4899' }}>Sign In</Text>
            </Link>
          </View>

          <Text className="text-gray-500 text-xs text-center mt-4 px-4">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </Text>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
