import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  Pressable,
  ScrollView,
  Platform,
  type ModalProps as RNModalProps,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { cn } from '../../lib/cn';
import { hapticLight } from '../../lib/haptics';

interface ModalProps extends Omit<RNModalProps, 'visible'> {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  showCloseButton?: boolean;
  dismissOnBackdropPress?: boolean;
  swipeToDismiss?: boolean;
}

const sizeStyles = {
  sm: 'w-11/12 max-w-sm',
  md: 'w-11/12 max-w-md',
  lg: 'w-11/12 max-w-lg',
  full: 'w-full h-full',
};

export default function Modal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  showCloseButton = true,
  dismissOnBackdropPress = true,
  swipeToDismiss = true,
  ...props
}: ModalProps) {
  const handleBackdropPress = () => {
    if (dismissOnBackdropPress) {
      hapticLight();
      onClose();
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
      {...props}
    >
      {/* Backdrop with blur */}
      <Pressable
        className="flex-1"
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
        }}
        onPress={handleBackdropPress}
      >
        <BlurView intensity={20} tint="dark" className="absolute inset-0" />
      </Pressable>

      {/* Modal Content */}
      <Pressable
        className={cn(
          'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
          sizeStyles[size]
        )}
        onPress={() => {}}
        style={{ maxHeight: '85%' }}
      >
        <View
          className={cn(
            'rounded-3xl overflow-hidden shadow-2xl',
            Platform.select({
              ios: 'bg-gray-900/95 backdrop-blur-xl',
              android: 'bg-gray-900',
            })
          )}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <View className="flex-row items-center justify-between border-b border-gray-800 px-6 py-4">
              <View className="flex-1">
                {title && (
                  <Text className="text-xl font-bold text-white">
                    {title}
                  </Text>
                )}
                {subtitle && (
                  <Text className="mt-1 text-sm text-gray-400">
                    {subtitle}
                  </Text>
                )}
              </View>

              {showCloseButton && (
                <Pressable
                  onPress={() => {
                    hapticLight();
                    onClose();
                  }}
                  className="ml-4 h-8 w-8 items-center justify-center rounded-full bg-gray-800"
                >
                  <Ionicons name="close" size={20} color="#fff" />
                </Pressable>
              )}
            </View>
          )}

          {/* Content */}
          <ScrollView
            className={cn(
              'px-6',
              title ? 'py-4' : 'py-6',
              subtitle && !title && 'pt-4 pb-6'
            )}
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </Pressable>
    </RNModal>
  );
}
