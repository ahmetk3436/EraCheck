import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticLight } from '../../lib/haptics';
import GlassCard from './GlassCard';

interface FeatureCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
  gradientColors?: readonly [string, string];
  onPress?: () => void;
  disabled?: boolean;
  badge?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: { padding: 16, icon: 20, title: 'text-base', desc: 'text-xs' },
  md: { padding: 20, icon: 24, title: 'text-lg', desc: 'text-sm' },
  lg: { padding: 24, icon: 28, title: 'text-xl', desc: 'text-base' },
};

export default function FeatureCard({
  icon,
  title,
  description,
  color,
  gradientColors,
  onPress,
  disabled = false,
  badge,
  size = 'md',
}: FeatureCardProps) {
  const currentSize = sizeStyles[size];

  const cardContent = (
    <View className="relative">
      {/* Icon Container */}
      <View
        className="rounded-2xl items-center justify-center mb-3"
        style={{
          backgroundColor: `${color}20`,
          width: currentSize.icon + 32,
          height: currentSize.icon + 32,
        }}
      >
        <Ionicons name={icon} size={currentSize.icon} color={color} />
      </View>

      {/* Badge */}
      {badge && (
        <View className="absolute top-0 right-0 bg-pink-500 rounded-full px-2 py-0.5">
          <Text className="text-white text-xs font-bold">{badge}</Text>
        </View>
      )}

      {/* Title */}
      <Text className={cn('text-white font-bold mb-1', currentSize.title)}>
        {title}
      </Text>

      {/* Description */}
      <Text className={cn('text-gray-400', currentSize.desc)}>
        {description}
      </Text>
    </View>
  );

  if (gradientColors) {
    return (
      <Pressable
        onPress={() => {
          if (!disabled) {
            onPress?.();
            hapticLight();
          }
        }}
        className={disabled ? 'opacity-50' : ''}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-2xl"
          style={{ padding: currentSize.padding }}
        >
          {cardContent}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <GlassCard
      onPress={() => {
        if (!disabled) {
          onPress?.();
          hapticLight();
        }
      }}
      variant="glass"
      className={disabled ? 'opacity-50' : ''}
      style={{ padding: currentSize.padding }}
    >
      {cardContent}
    </GlassCard>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
