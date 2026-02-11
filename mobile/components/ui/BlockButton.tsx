import React, { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { hapticSuccess, hapticError, hapticWarning, hapticLight } from '../../lib/haptics';
import Modal from './Modal';
import Button from './Button';

interface BlockButtonProps {
  userId: string;
  userName?: string;
  onBlocked?: () => void;
  size?: 'sm' | 'md';
  variant?: 'icon' | 'text' | 'both';
}

// Block button (Apple Guideline 1.2 — immediate content hiding)
export default function BlockButton({
  userId,
  userName = 'this user',
  onBlocked,
  size = 'sm',
  variant = 'both',
}: BlockButtonProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  const handleBlock = async () => {
    setIsBlocking(true);
    try {
      await api.post('/blocks', { blocked_id: userId });
      hapticSuccess();
      setShowConfirmModal(false);
      setShowSuccessModal(true);
      onBlocked?.();

      // Auto-hide success modal after 2 seconds
      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2000);
    } catch {
      hapticError();
      Alert.alert('Error', 'Failed to block user. Please try again.');
      setShowConfirmModal(false);
    } finally {
      setIsBlocking(false);
    }
  };

  const renderButton = () => {
    if (variant === 'icon') {
      return (
        <Pressable
          className="p-2 rounded-full active:bg-gray-800"
          onPress={() => {
            hapticLight();
            setShowConfirmModal(true);
          }}
        >
          <Ionicons name="ban-outline" size={size === 'sm' ? 16 : 20} color="#ef4444" />
        </Pressable>
      );
    }

    if (variant === 'text') {
      return (
        <Pressable
          className="px-3 py-1.5 rounded-lg active:bg-gray-800"
          onPress={() => {
            hapticLight();
            setShowConfirmModal(true);
          }}
        >
          <Text className="text-sm text-red-500 font-medium">Block</Text>
        </Pressable>
      );
    }

    // Default: both
    return (
      <Pressable
        className="flex-row items-center gap-1.5 p-2 rounded-lg active:bg-gray-800"
        onPress={() => {
          hapticLight();
          setShowConfirmModal(true);
        }}
      >
        <Ionicons name="ban-outline" size={size === 'sm' ? 16 : 18} color="#ef4444" />
        <Text className="text-sm text-red-500 font-medium">Block</Text>
      </Pressable>
    );
  };

  return (
    <>
      {renderButton()}

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        title="Block User"
        subtitle="Are you sure?"
        size="sm"
      >
        <View className="items-center py-4">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-red-500/20 mb-4">
            <Ionicons name="ban" size={36} color="#ef4444" />
          </View>

          <Text className="text-white text-center text-lg font-semibold mb-2">
            Block {userName}?
          </Text>

          <Text className="text-gray-400 text-center text-sm px-4">
            You won't see their content, and they won't see yours. You can unblock them
            anytime from Settings.
          </Text>
        </View>

        <View className="flex-row gap-3 mt-4">
          <View className="flex-1">
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setShowConfirmModal(false)}
              size="md"
            />
          </View>
          <View className="flex-1">
            <Button
              title="Block"
              variant="destructive"
              onPress={handleBlock}
              isLoading={isBlocking}
              size="md"
            />
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        size="sm"
        showCloseButton={false}
        dismissOnBackdropPress={false}
      >
        <View className="items-center py-6">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 mb-4">
            <Ionicons name="checkmark-circle" size={36} color="#10b981" />
          </View>

          <Text className="text-white text-center text-lg font-semibold mb-1">
            User Blocked
          </Text>

          <Text className="text-gray-400 text-center text-sm">
            You won't see content from {userName} anymore.
          </Text>
        </View>
      </Modal>
    </>
  );
}
