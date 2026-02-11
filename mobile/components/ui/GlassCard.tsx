import React from 'react';
import { View, Pressable, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../../lib/cn';

interface GlassCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'glass' | 'solid' | 'gradient';
  gradientColors?: readonly [string, string];
  className?: string;
  style?: ViewStyle;
  blurIntensity?: number;
  tint?: 'light' | 'dark' | 'default';
}

export default function GlassCard({
  children,
  onPress,
  variant = 'glass',
  gradientColors = ['#6366F1', '#EC4899'],
  className,
  style,
  blurIntensity = 40,
  tint = 'dark',
}: GlassCardProps) {
  const cardContent = (
    <View
      className={cn('rounded-3xl overflow-hidden', className)}
      style={style}
    >
      {variant === 'glass' && (
        <>
          <View className="absolute inset-0 bg-white/10" />
          <BlurView intensity={blurIntensity} tint={tint} className="absolute inset-0" />
          <View className="absolute inset-0 border border-white/20 rounded-3xl" />
        </>
      )}

      {variant === 'gradient' && (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="absolute inset-0"
        />
      )}

      <View className="relative">{children}</View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} className="shadow-lg">
        {cardContent}
      </Pressable>
    );
  }

  return <View className="shadow-lg">{cardContent}</View>;
}
