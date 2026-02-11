import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  View,
  type PressableProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../../lib/cn';
import { hapticLight } from '../../lib/haptics';

interface ButtonProps extends PressableProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  gradientColors?: string[];
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles = {
  primary: 'bg-primary-600 active:bg-primary-700',
  secondary: 'bg-gray-600 active:bg-gray-700',
  outline: 'border-2 border-primary-600 bg-transparent active:bg-primary-50',
  destructive: 'bg-red-600 active:bg-red-700',
  gradient: '', // Handled separately with LinearGradient
};

const variantTextStyles = {
  primary: 'text-white',
  secondary: 'text-white',
  outline: 'text-primary-600',
  destructive: 'text-white',
  gradient: 'text-white',
};

const sizeStyles = {
  sm: 'px-3 py-2',
  md: 'px-5 py-3',
  lg: 'px-7 py-4',
};

const sizeTextStyles = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
};

const sizeIconStyles = {
  sm: 16,
  md: 20,
  lg: 24,
};

export default function Button({
  title,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  gradientColors = ['#6366F1', '#EC4899'],
  icon,
  fullWidth = false,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  const handlePressIn = () => {
    hapticLight();
  };

  const buttonContent = (
    <>
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'outline' ? '#2563eb' : '#ffffff'}
          size="small"
        />
      ) : (
        <View className={cn('flex-row items-center justify-center', icon && 'gap-2')}>
          {icon}
          <Text
            className={cn(
              'font-semibold',
              variantTextStyles[variant],
              sizeTextStyles[size]
            )}
          >
            {title}
          </Text>
        </View>
      )}
    </>
  );

  if (variant === 'gradient') {
    return (
      <Pressable
        onPressIn={handlePressIn}
        disabled={isDisabled}
        className={cn('rounded-xl overflow-hidden', sizeStyles[size], fullWidth && 'w-full')}
        style={[style, isDisabled && { opacity: 0.5 }]}
        {...props}
      >
        <LinearGradient
          colors={gradientColors as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="items-center justify-center px-5 py-3"
        >
          {buttonContent}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPressIn={handlePressIn}
      className={cn(
        'items-center justify-center rounded-xl',
        variantStyles[variant],
        sizeStyles[size],
        isDisabled && 'opacity-50',
        fullWidth && 'w-full'
      )}
      disabled={isDisabled}
      style={style}
      {...props}
    >
      {buttonContent}
    </Pressable>
  );
}
