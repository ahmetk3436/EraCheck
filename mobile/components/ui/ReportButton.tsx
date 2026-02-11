import React, { useState } from 'react';
import { Alert, Pressable, Text, View, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { hapticSuccess, hapticError, hapticSelection } from '../../lib/haptics';
import Modal from './Modal';
import Input from './Input';
import Button from './Button';

interface ReportButtonProps {
  contentType: 'user' | 'post' | 'comment';
  contentId: string;
  size?: 'sm' | 'md';
  variant?: 'icon' | 'text' | 'both';
}

const REPORT_CATEGORIES = [
  { id: 'harassment', label: 'Harassment', icon: 'person-outline' as const },
  { id: 'hate', label: 'Hate Speech', icon: 'alert-circle-outline' as const },
  { id: 'spam', label: 'Spam or Misleading', icon: 'megaphone-outline' as const },
  { id: 'inappropriate', label: 'Inappropriate Content', icon: 'eye-off-outline' as const },
  { id: 'violence', label: 'Violence or Harmful', icon: 'warning-outline' as const },
  { id: 'impersonation', label: 'Impersonation', icon: 'person-remove-outline' as const },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' as const },
] as const;

// Report button (Apple Guideline 1.2 — every piece of UGC must have one)
export default function ReportButton({
  contentType,
  contentId,
  size = 'sm',
  variant = 'both',
}: ReportButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReport = async () => {
    if (!selectedCategory) {
      Alert.alert('Select a Category', 'Please select a category for your report.');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Add Details', 'Please provide more details about your report.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/reports', {
        content_type: contentType,
        content_id: contentId,
        category: selectedCategory,
        reason,
      });
      hapticSuccess();
      setShowModal(false);
      setSelectedCategory(null);
      setReason('');
      Alert.alert(
        'Report Submitted',
        'Thank you for helping keep our community safe. We will review this within 24 hours.'
      );
    } catch {
      hapticError();
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderButton = () => {
    if (variant === 'icon') {
      return (
        <Pressable
          className="p-2 rounded-full active:bg-gray-800"
          onPress={() => setShowModal(true)}
        >
          <Ionicons name="flag-outline" size={size === 'sm' ? 16 : 20} color="#ef4444" />
        </Pressable>
      );
    }

    if (variant === 'text') {
      return (
        <Pressable
          className="px-3 py-1.5 rounded-lg active:bg-gray-800"
          onPress={() => setShowModal(true)}
        >
          <Text className="text-sm text-red-500 font-medium">Report</Text>
        </Pressable>
      );
    }

    // Default: both
    return (
      <Pressable
        className="flex-row items-center gap-1.5 p-2 rounded-lg active:bg-gray-800"
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="flag-outline" size={size === 'sm' ? 16 : 18} color="#ef4444" />
        <Text className="text-sm text-red-500 font-medium">Report</Text>
      </Pressable>
    );
  };

  return (
    <>
      {renderButton()}

      <Modal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title="Report Content"
        subtitle="Help us keep EraCheck safe for everyone"
        size="md"
      >
        <ScrollView className="mb-4" showsVerticalScrollIndicator={false}>
          <Text className="text-gray-400 text-sm mb-4">
            Select a category and provide details about why you're reporting this{' '}
            {contentType}. Our team reviews all reports within 24 hours.
          </Text>

          {/* Category Chips */}
          <Text className="text-white font-medium mb-3">Category</Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {REPORT_CATEGORIES.map((category) => (
              <Pressable
                key={category.id}
                onPress={() => {
                  setSelectedCategory(category.id);
                  hapticSelection();
                }}
                className={cn(
                  'flex-row items-center gap-2 px-4 py-2.5 rounded-xl border-2',
                  selectedCategory === category.id
                    ? 'border-pink-500 bg-pink-500/20'
                    : 'border-gray-700 bg-gray-800'
                )}
              >
                <Ionicons
                  name={category.icon}
                  size={18}
                  color={selectedCategory === category.id ? '#ec4899' : '#9ca3af'}
                />
                <Text
                  className={cn(
                    'text-sm font-medium',
                    selectedCategory === category.id ? 'text-pink-500' : 'text-gray-300'
                  )}
                >
                  {category.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Reason Input */}
          <Input
            label="Additional Details"
            placeholder="Describe what happened..."
            value={reason}
            onChangeText={setReason}
            multiline
            numberOfLines={4}
            maxLength={500}
            showCharCount
            showPasswordToggle={false}
          />
        </ScrollView>

        {/* Actions */}
        <View className="flex-row gap-3 mt-2">
          <View className="flex-1">
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => setShowModal(false)}
              size="md"
            />
          </View>
          <View className="flex-1">
            <Button
              title="Submit Report"
              variant="destructive"
              onPress={handleReport}
              isLoading={isSubmitting}
              size="md"
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
