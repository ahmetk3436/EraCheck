import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../lib/cn';
import { hapticSelection } from '../lib/haptics';

interface ErrorStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title?: string;
  message?: string;
  retryText?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  className?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  icon = 'cloud-offline',
  title = 'Something went wrong',
  message = 'Tap to retry',
  retryText = 'Try Again',
  onRetry,
  onGoBack,
  className,
}) => {
  const handleRetry = () => {
    hapticSelection();
    onRetry?.();
  };

  const handleGoBack = () => {
    hapticSelection();
    onGoBack?.();
  };

  return (
    <View className={cn('flex-1 items-center justify-center px-6', className)}>
      <View className="w-20 h-20 rounded-full bg-red-500/10 items-center justify-center mb-4">
        <Ionicons name={icon} size={40} color="#ef4444" />
      </View>
      <Text className="text-xl font-semibold text-white text-center mb-2">
        {title}
      </Text>
      <Text className="text-sm text-gray-400 text-center mb-6">
        {message}
      </Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {onGoBack && (
          <Pressable
            onPress={handleGoBack}
            className="bg-gray-800 border border-gray-700 rounded-xl px-6 py-3 active:opacity-70"
          >
            <Text className="text-gray-300 font-medium">Go Back</Text>
          </Pressable>
        )}
        {onRetry && (
          <Pressable
            onPress={handleRetry}
            className="bg-red-500/20 border border-red-500/30 rounded-xl px-6 py-3 active:opacity-70"
          >
            <Text className="text-red-400 font-medium">{retryText}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

export default ErrorState;
