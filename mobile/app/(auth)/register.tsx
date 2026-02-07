import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import AppleSignInButton from '../../components/ui/AppleSignInButton';
import { hapticLight } from '../../lib/haptics';

export default function RegisterScreen() {
  const { register } = useAuth();
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
      // AuthContext.register saves tokens and sets user, which triggers auth guard redirect
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Registration failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
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
            Create your account
          </Text>
          <Text className="text-sm text-gray-500 mt-1 text-center">
            Join thousands discovering their aesthetic era
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

        <View className="mb-4">
          <Input
            label="Password"
            placeholder="Min. 8 characters"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="newPassword"
          />
        </View>

        <View className="mb-6">
          <Input
            label="Confirm Password"
            placeholder="Repeat your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            textContentType="newPassword"
          />
        </View>

        <Button
          title="Create Account"
          onPress={handleRegister}
          isLoading={isLoading}
          size="lg"
        />

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
      </View>
    </KeyboardAvoidingView>
  );
}
