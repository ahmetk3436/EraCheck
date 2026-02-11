import React, { useState } from 'react';
import { Platform, View, Text, Pressable, ActivityIndicator } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { hapticError, hapticLight } from '../../lib/haptics';

interface AppleSignInButtonProps {
  onError?: (error: string) => void;
  variant?: 'dark' | 'light' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const variantStyles = {
  dark: 'bg-black border-black',
  light: 'bg-white border-gray-200',
  outline: 'bg-transparent border-gray-400',
};

const textStyles = {
  dark: 'text-white',
  light: 'text-black',
  outline: 'text-gray-700',
};

export default function AppleSignInButton({
  onError,
  variant = 'dark',
  size = 'md',
  fullWidth = false,
}: AppleSignInButtonProps) {
  const { loginWithApple } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleAppleSignIn = async () => {
    hapticLight();
    setIsLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token received from Apple');
      }

      const fullName = credential.fullName
        ? `${credential.fullName.givenName || ''} ${credential.fullName.familyName || ''}`.trim()
        : undefined;

      await loginWithApple(
        credential.identityToken,
        credential.authorizationCode || '',
        fullName,
        credential.email || undefined
      );
    } catch (err: any) {
      if (err.code === 'ERR_REQUEST_CANCELED') {
        return; // User cancelled
      }
      hapticError();
      onError?.(err.message || 'Apple Sign In failed');
    } finally {
      setIsLoading(false);
    }
  };

  // For Android, show a fallback button
  if (Platform.OS !== 'ios') {
    return null;
  }

  const sizeStyles = {
    sm: 'py-2.5 px-4',
    md: 'py-3.5 px-5',
    lg: 'py-4 px-6',
  };

  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <View className="mt-4">
      <View className="mb-4 flex-row items-center">
        <View className="h-px flex-1 bg-gray-700" />
        <Text className="mx-4 text-sm text-gray-500 font-medium">or</Text>
        <View className="h-px flex-1 bg-gray-700" />
      </View>

      <Pressable
        className={cn(
          'flex-row items-center justify-center rounded-xl border-2',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          isLoading && 'opacity-70'
        )}
        onPress={handleAppleSignIn}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={variant === 'dark' ? '#ffffff' : '#000000'}
          />
        ) : (
          <>
            <Text
              className={cn(
                'mr-2 text-xl font-semibold',
                textStyles[variant]
              )}
              style={{ fontFamily: Platform.OS === 'ios' ? 'SF Pro Display' : undefined }}
            >
              {'\uF8FF'}
            </Text>
            <Text
              className={cn(
                'font-semibold',
                textSizeStyles[size],
                textStyles[variant]
              )}
            >
              Sign in with Apple
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
