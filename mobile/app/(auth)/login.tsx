import React, { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, Pressable, TouchableOpacity, ActivityIndicator, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import AppleSignInButton from '../../components/ui/AppleSignInButton';
import { hapticLight } from '../../lib/haptics';

export default function LoginScreen() {
  const { login, continueAsGuest } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    console.log('[LOGIN] handleLogin called, email:', email, 'password length:', password.length);
    setError('');
    hapticLight();
    if (!email || !password) {
      const msg = 'Please fill in all fields';
      console.log('[LOGIN] validation failed:', msg);
      setError(msg);
      return;
    }

    setIsLoading(true);
    try {
      console.log('[LOGIN] calling login API...');
      await login(email, password);
      console.log('[LOGIN] success!');
      router.replace('/(protected)/(tabs)');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
      console.log('[LOGIN] error:', msg, 'status:', err.response?.status);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestMode = async () => {
    hapticLight();
    await continueAsGuest();
    router.replace('/(protected)/(tabs)');
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
              Welcome back
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

          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-300 mb-2">Password</Text>
            <TextInput
              className="rounded-xl px-4 py-3.5 text-base text-white"
              style={{ backgroundColor: '#1c1c2e', borderWidth: 1, borderColor: '#3f3f5a' }}
              placeholder="Your password"
              placeholderTextColor="#6b7280"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
          </View>

          <Pressable
            onPress={handleLogin}
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
                <Text className="text-white text-lg font-bold">Sign In</Text>
              )}
            </LinearGradient>
          </Pressable>

          {/* Sign in with Apple (Guideline 4.8) */}
          <AppleSignInButton onError={(msg) => setError(msg)} />

          {/* Try Without Account */}
          <Pressable
            onPress={handleGuestMode}
            className="mt-4 items-center rounded-xl border border-gray-700 py-3.5"
          >
            <Text className="text-base font-medium text-gray-400">
              Try Without Account
            </Text>
          </Pressable>

          <View className="mt-6 flex-row items-center justify-center">
            <Text className="text-gray-400">Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <Text className="font-semibold" style={{ color: '#ec4899' }}>Sign Up</Text>
            </Link>
          </View>

          {/* Skip for now */}
          <TouchableOpacity
            onPress={handleGuestMode}
            className="items-center py-2 mt-4"
          >
            <Text className="text-gray-500 text-sm">Skip for now</Text>
          </TouchableOpacity>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
