import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Pressable, TouchableOpacity } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import AppleSignInButton from '../../components/ui/AppleSignInButton';
import { hapticLight } from '../../lib/haptics';

export default function LoginScreen() {
  const { login, continueAsGuest } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    hapticLight();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Login failed. Please try again.'
      );
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
      className="flex-1 bg-gray-950"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-8">
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
          <View className="mb-4 rounded-lg bg-red-900/30 border border-red-800 p-3">
            <Text className="text-sm text-red-400">{error}</Text>
          </View>
        ) : null}

        <View className="mb-4">
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            textContentType="emailAddress"
          />
        </View>

        <View className="mb-6">
          <Input
            label="Password"
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
          />
        </View>

        <Button
          title="Sign In"
          onPress={handleLogin}
          isLoading={isLoading}
          size="lg"
        />

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
      </View>
    </KeyboardAvoidingView>
  );
}
