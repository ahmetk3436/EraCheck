import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticLight } from '../../lib/haptics';

interface UsageBadgeProps {
  used: number;
  limit: number;
  type?: 'guest' | 'free' | 'premium';
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function UsageBadge({
  used,
  limit,
  type = 'guest',
  onPress,
  size = 'md',
}: UsageBadgeProps) {
  const percentage = (used / limit) * 100;
  const remaining = Math.max(0, limit - used);

  const getTypeInfo = () => {
    switch (type) {
      case 'guest':
        return {
          icon: 'person-outline',
          label: 'Guest Mode',
          colors: ['#d97706', '#b45309'] as const,
          textColor: '#d97706',
          bgColor: '#292524',
        };
      case 'free':
        return {
          icon: 'accessibility-outline',
          label: 'Free Tier',
          colors: ['#6366F1', '#4F46E5'] as const,
          textColor: '#6366F1',
          bgColor: '#1e1b4b',
        };
      case 'premium':
        return {
          icon: 'diamond',
          label: 'Premium',
          colors: ['#EC4899', '#BE185D'] as const,
          textColor: '#EC4899',
          bgColor: '#831843',
        };
    }
  };

  const sizeStyles = {
    sm: { padding: 12, icon: 18, text: 'text-sm' },
    md: { padding: 16, icon: 20, text: 'text-base' },
    lg: { padding: 20, icon: 24, text: 'text-lg' },
  };

  const currentSize = sizeStyles[size];
  const typeInfo = getTypeInfo();

  const getProgressColor = () => {
    if (percentage >= 90) return '#ef4444'; // Red
    if (percentage >= 70) return '#f59e0b'; // Orange
    return '#10b981'; // Green
  };

  return (
    <Pressable
      onPress={() => {
        onPress?.();
        hapticLight();
      }}
    >
      <LinearGradient
        colors={typeInfo.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        className="rounded-2xl"
      >
        <View
          className="flex-row items-center"
          style={{ padding: currentSize.padding }}
        >
          {/* Icon */}
          <View
            className="bg-white/20 rounded-full items-center justify-center mr-3"
            style={{ width: currentSize.icon + 20, height: currentSize.icon + 20 }}
          >
            <Ionicons name={typeInfo.icon as any} size={currentSize.icon} color="#fff" />
          </View>

          {/* Content */}
          <View className="flex-1">
            <View className="flex-row items-center justify-between mb-1">
              <Text className={cn('text-white font-bold', currentSize.text)}>
                {typeInfo.label}
              </Text>

              {type === 'premium' ? (
                <Text className="text-white text-sm font-semibold">Unlimited</Text>
              ) : (
                <Text className={cn('text-white/80 font-semibold', currentSize.text)}>
                  {remaining} left
                </Text>
              )}
            </View>

            {/* Progress Bar (for non-premium) */}
            {type !== 'premium' && (
              <View className="bg-white/20 rounded-full h-1.5 overflow-hidden mt-1">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, percentage)}%`,
                    backgroundColor: getProgressColor(),
                  }}
                />
              </View>
            )}
          </View>

          {/* Arrow for onPress */}
          {onPress && (
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
