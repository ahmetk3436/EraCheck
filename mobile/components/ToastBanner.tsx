import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../lib/cn';

interface ToastBannerProps {
  visible: boolean;
  message: string;
  type?: 'error' | 'success' | 'warning';
  onDismiss?: () => void;
  duration?: number;
}

const ToastBanner: React.FC<ToastBannerProps> = ({
  visible,
  message,
  type = 'error',
  onDismiss,
  duration = 3000,
}) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onDismiss?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onDismiss]);

  if (!visible) return null;

  const bgColor = {
    error: 'bg-red-900/50',
    success: 'bg-green-900/50',
    warning: 'bg-yellow-900/50',
  }[type];

  const textColor = {
    error: 'text-red-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
  }[type];

  const iconColor = {
    error: '#f87171',
    success: '#4ade80',
    warning: '#facc15',
  }[type];

  const iconName = {
    error: 'alert-circle',
    success: 'checkmark-circle',
    warning: 'warning',
  }[type] as keyof typeof Ionicons.glyphMap;

  return (
    <View className={cn(
      'absolute top-0 left-0 right-0 z-50 px-4 py-3 flex-row items-center',
      bgColor
    )}>
      <Ionicons name={iconName} size={20} color={iconColor} />
      <Text className={cn('ml-2 text-sm font-medium', textColor)}>
        {message}
      </Text>
    </View>
  );
};

export default ToastBanner;
