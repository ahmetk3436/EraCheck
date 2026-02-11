import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticLight } from '../../lib/haptics';

interface StreakBadgeProps {
  currentStreak: number;
  longestStreak: number;
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
  showMilestone?: boolean;
}

const MILESTONES = [3, 7, 14, 21, 30, 50, 100];

const BADGE_COLORS: Record<number, { colors: readonly [string, string]; icon: string; label: string }> = {
  0: { colors: ['#f97316', '#ea580c'] as const, icon: 'flame', label: 'Day Streak' },
  3: { colors: ['#f59e0b', '#d97706'] as const, icon: 'flame', label: 'Silver Streak' },
  7: { colors: ['#eab308', '#ca8a04'] as const, icon: 'flame', label: 'Gold Streak' },
  14: { colors: ['#ffffff', '#d1d5db'] as const, icon: 'diamond', label: 'White Hot' },
  21: { colors: ['#ec4899', '#be185d'] as const, icon: 'rainy', label: 'Rainbow Fire' },
  30: { colors: ['#8b5cf6', '#7c3aed'] as const, icon: 'sparkles', label: 'Cosmic Flame' },
  50: { colors: ['#06b6d4', '#0891b2'] as const, icon: 'planet', label: 'Celestial' },
  100: { colors: ['#fbbf24', '#f59e0b'] as const, icon: 'trophy', label: 'Legendary' },
};

export default function StreakBadge({
  currentStreak,
  longestStreak,
  size = 'md',
  onPress,
  showMilestone = false,
}: StreakBadgeProps) {
  const getMilestone = (streak: number) => {
    for (let i = MILESTONES.length - 1; i >= 0; i--) {
      if (streak >= MILESTONES[i]) {
        return MILESTONES[i];
      }
    }
    return 0;
  };

  const milestone = getMilestone(currentStreak);
  const badgeInfo = BADGE_COLORS[milestone];

  const sizeStyles = {
    sm: { padding: 12, icon: 24, text: 'text-lg' },
    md: { padding: 20, icon: 32, text: 'text-2xl' },
    lg: { padding: 24, icon: 40, text: 'text-3xl' },
  };

  const currentSize = sizeStyles[size];

  return (
    <Pressable
      onPress={() => {
        onPress?.();
        hapticLight();
      }}
      className="shadow-lg"
    >
      <LinearGradient
        colors={badgeInfo.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="rounded-2xl"
      >
        <View
          className="flex-row items-center"
          style={{ padding: currentSize.padding }}
        >
          <View
            className="bg-white/20 rounded-full items-center justify-center mr-3"
            style={{ width: currentSize.icon + 16, height: currentSize.icon + 16 }}
          >
            <Ionicons name={badgeInfo.icon as any} size={currentSize.icon} color="#fff" />
          </View>

          <View className="flex-1">
            <Text className={cn('text-white font-bold', currentSize.text)}>
              {currentStreak} Day Streak
            </Text>
            <Text className="text-white/80 text-sm">
              Longest: {longestStreak} days
            </Text>
          </View>

          {milestone > 0 && showMilestone && (
            <View className="bg-white/20 rounded-full px-2 py-1 ml-2">
              <Text className="text-white text-xs font-bold">{badgeInfo.label}</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
