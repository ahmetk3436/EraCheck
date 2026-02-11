import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../../lib/cn';
import { hapticSelection } from '../../lib/haptics';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  showCharCount?: boolean;
  maxLength?: number;
  showPasswordToggle?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: React.ReactNode;
}

export default function Input({
  label,
  error,
  showCharCount = false,
  maxLength,
  showPasswordToggle = false,
  leftIcon,
  rightIcon,
  className,
  value,
  ...props
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = props.secureTextEntry && showPasswordToggle;

  const handleFocus = () => {
    setIsFocused(true);
    hapticSelection();
    props.onFocus?.(undefined as any);
  };

  const handleBlur = () => {
    setIsFocused(false);
    props.onBlur?.(undefined as any);
  };

  return (
    <View className="w-full">
      {label && (
        <View className="mb-1.5 flex-row items-center justify-between">
          <Text className="text-sm font-medium text-gray-300">
            {label}
          </Text>
          {showCharCount && maxLength && (
            <Text className={cn(
              'text-xs',
              (value?.length || 0) > maxLength * 0.9
                ? 'text-red-400'
                : 'text-gray-500'
            )}>
              {(value?.length || 0).toString()} / {maxLength.toString()}
            </Text>
          )}
        </View>
      )}

      <View className="relative">
        {leftIcon && (
          <View className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
            <Ionicons
              name={leftIcon}
              size={20}
              color={error ? '#ef4444' : isFocused ? '#ec4899' : '#9ca3af'}
            />
          </View>
        )}

        <TextInput
          className={cn(
            'w-full rounded-xl border bg-white px-4 py-3 text-base text-gray-900',
            isFocused
              ? 'border-pink-500 ring-2 ring-pink-500/20'
              : 'border-gray-700',
            error && 'border-red-500',
            leftIcon && 'pl-12',
            (rightIcon || isPassword) && 'pr-12',
            className
          )}
          placeholderTextColor="#9ca3af"
          value={value}
          onFocus={handleFocus}
          onBlur={handleBlur}
          maxLength={maxLength}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />

        {(rightIcon || isPassword) && (
          <TouchableOpacity
            onPress={() => {
              if (isPassword) {
                setShowPassword(!showPassword);
                hapticSelection();
              }
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
            disabled={!isPassword}
          >
            {isPassword ? (
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#9ca3af"
              />
            ) : (
              rightIcon
            )}
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View className="mt-1.5 flex-row items-center gap-1">
          <Ionicons name="alert-circle" size={14} color="#ef4444" />
          <Text className="text-sm text-red-500">{error}</Text>
        </View>
      )}
    </View>
  );
}
