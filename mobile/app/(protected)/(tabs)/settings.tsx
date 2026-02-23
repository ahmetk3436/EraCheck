import React, { useState, useEffect, useCallback } from 'react';
import SupportTicketModal from '../../../components/ui/SupportTicketModal';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useSubscription } from '../../../contexts/SubscriptionContext';
import api from '../../../lib/api';
import Modal from '../../../components/ui/Modal';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { hapticSuccess, hapticError, hapticLight, hapticWarning, hapticSelection } from '../../../lib/haptics';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080/api';

interface FavoriteEraProfile {
  key: string;
  title: string;
  emoji: string;
  color: string;
  description: string;
  music_taste: string;
  style_traits: string;
}

interface EraStats {
  quizzes_taken: number;
  total_shares: number;
  current_streak: number;
  longest_streak: number;
  favorite_era: string;
  favorite_era_profile?: FavoriteEraProfile;
}

export default function SettingsScreen() {
  const { user, logout, deleteAccount, isGuest, isAuthenticated } = useAuth();
  const { isSubscribed, handleRestore } = useSubscription();
  const [stats, setStats] = useState<EraStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Legal modal state
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalContent, setLegalContent] = useState('');
  const [legalTitle, setLegalTitle] = useState('');
  const [legalLoading, setLegalLoading] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  const isAppleUser = user?.isAppleUser || false;

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    if (isGuest && !isAuthenticated) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/era/stats');
      // Extract from envelope
      const statsData = data.stats || data;
      setStats(statsData);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
      hapticError();
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    hapticLight();
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            hapticSuccess();
          } catch (error) {
            hapticError();
            Alert.alert('Error', 'Failed to sign out');
          }
        },
      },
    ]);
  };

  const handleDeletePress = useCallback(() => {
    hapticWarning();
    setDeletePassword('');
    setDeleteError('');
    setShowDeleteModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    hapticSelection();
    setShowDeleteModal(false);
    setDeletePassword('');
    setDeleteError('');
    setDeleteLoading(false);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    hapticSelection();
    setDeleteError('');

    // For non-Apple users, validate password
    if (!isAppleUser) {
      if (!deletePassword.trim()) {
        setDeleteError('Password is required');
        hapticError();
        return;
      }
      if (deletePassword.length < 6) {
        setDeleteError('Password must be at least 6 characters');
        hapticError();
        return;
      }
    }

    setDeleteLoading(true);

    try {
      await deleteAccount(isAppleUser ? '' : deletePassword);
      hapticSuccess();
      setShowDeleteModal(false);
      router.replace('/(auth)/login');
    } catch (error: any) {
      hapticError();
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        setDeleteError('Incorrect password. Please try again.');
      } else if (error?.message?.includes('Network Error')) {
        setDeleteError('No internet connection. Please check your network.');
      } else {
        setDeleteError('Failed to delete account. Please try again.');
      }
    } finally {
      setDeleteLoading(false);
    }
  }, [deletePassword, isAppleUser, deleteAccount]);

  const openLegalPage = useCallback(async (type: 'privacy' | 'terms') => {
    hapticLight();

    const title = type === 'privacy' ? 'Privacy Policy' : 'Terms of Service';
    setLegalTitle(title);
    setShowLegalModal(true);
    setLegalLoading(true);
    setLegalContent('');

    try {
      const response = await api.get(`/legal/${type}`, {
        responseType: 'text',
        headers: { 'Accept': 'text/html' },
      });

      const htmlContent = typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data);

      // Strip HTML tags for plain text display
      const plainText = htmlContent
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/h[1-6]>/gi, '\n\n')
        .replace(/<li>/gi, '• ')
        .replace(/<\/li>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();

      setLegalContent(plainText);
    } catch (error) {
      // Fallback: open in external browser
      const url = `${API_BASE_URL}/legal/${type}`;
      try {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        }
      } catch (linkError) {
        Alert.alert('Error', 'Unable to open legal page. Please try again later.');
      }
      setShowLegalModal(false);
    } finally {
      setLegalLoading(false);
    }
  }, []);

  const closeLegalModal = useCallback(() => {
    hapticLight();
    setShowLegalModal(false);
    setLegalContent('');
    setLegalTitle('');
  }, []);

  const handleRestorePurchases = async () => {
    hapticLight();
    try {
      const restored = await handleRestore();
      if (restored) {
        hapticSuccess();
        Alert.alert('Success', 'Your purchases have been restored!');
      } else {
        Alert.alert('Not Found', 'No previous purchases found.');
      }
    } catch {
      hapticError();
      Alert.alert('Error', 'Failed to restore purchases.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
      <ScrollView className="flex-1" contentContainerClassName="p-6">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-3xl font-bold text-white mb-2">
            Settings
          </Text>
          {user && (
            <Text className="text-gray-400">{user.email}</Text>
          )}
        </View>

        {/* Guest CTA Card */}
        {isGuest && !isAuthenticated && (
          <View
            className="rounded-2xl p-6 mb-6"
            style={{ backgroundColor: '#111827', borderWidth: 1, borderColor: 'rgba(236,72,153,0.3)' }}
          >
            <View className="flex-row items-center mb-3">
              <Ionicons name="sparkles" size={24} color="#ec4899" />
              <Text className="text-white text-lg font-bold ml-2">
                Unlock Full Access
              </Text>
            </View>
            <Text className="text-gray-400 text-sm mb-4">
              Create a free account to save your results, track your streaks, and unlock unlimited quizzes.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(auth)/register')}
              className="rounded-xl py-3 items-center"
              style={{ backgroundColor: '#ec4899' }}
            >
              <Text className="text-white font-semibold text-base">
                Sign Up Free
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Premium Upsell */}
        {isAuthenticated && !isSubscribed && (
          <TouchableOpacity
            onPress={() => router.push('/(protected)/paywall')}
            className="rounded-2xl p-5 mb-6 shadow-md"
            style={{ backgroundColor: '#ec4899' }}
          >
            <View className="flex-row items-center">
              <Ionicons name="diamond-outline" size={28} color="#fff" />
              <View className="ml-3 flex-1">
                <Text className="text-white font-bold text-lg">
                  Upgrade to Premium
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)' }} className="text-sm">
                  Unlimited quizzes, exclusive eras, no ads
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </View>
          </TouchableOpacity>
        )}

        {/* Stats Card */}
        {loading ? (
          <View className="bg-gray-900 border border-gray-800 rounded-2xl p-6 items-center mb-6">
            <ActivityIndicator size="large" color="#ec4899" />
          </View>
        ) : stats ? (
          <View className="rounded-2xl p-6 mb-6 shadow-lg" style={{ backgroundColor: '#9333ea' }}>
            <Text className="text-white text-xl font-bold mb-4">
              Your Era Stats
            </Text>

            <View>
              <View className="flex-row items-center justify-between mb-3">
                <Text style={{ color: 'rgba(255,255,255,0.9)' }}>Total Quizzes</Text>
                <Text className="text-white font-bold text-lg">
                  {stats.quizzes_taken}
                </Text>
              </View>

              <View className="flex-row items-center justify-between mb-3">
                <Text style={{ color: 'rgba(255,255,255,0.9)' }}>Total Shares</Text>
                <Text className="text-white font-bold text-lg">
                  {stats.total_shares}
                </Text>
              </View>

              <View className="flex-row items-center justify-between mb-3">
                <Text style={{ color: 'rgba(255,255,255,0.9)' }}>Current Streak</Text>
                <View className="flex-row items-center">
                  <Ionicons name="flame" size={20} color="#fff" />
                  <Text className="text-white font-bold text-lg ml-1">
                    {stats.current_streak}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between mb-3">
                <Text style={{ color: 'rgba(255,255,255,0.9)' }}>Longest Streak</Text>
                <Text className="text-white font-bold text-lg">
                  {stats.longest_streak} days
                </Text>
              </View>

              {stats.favorite_era_profile && (
                <View className="mt-3 pt-3" style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.9)' }} className="mb-2">
                    Favorite Era
                  </Text>
                  <View className="flex-row items-center">
                    <Text className="text-4xl mr-3">
                      {stats.favorite_era_profile.emoji}
                    </Text>
                    <Text className="text-white font-bold text-lg">
                      {stats.favorite_era_profile.title}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        ) : null}

        {/* Account Section */}
        {isAuthenticated && (
          <View className="mb-6">
            <Text className="text-gray-400 text-sm font-semibold uppercase mb-3">
              Account
            </Text>

            <TouchableOpacity
              onPress={handleRestorePurchases}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-3 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <Ionicons name="refresh-outline" size={24} color="#ec4899" />
                <Text className="text-white font-medium ml-3">
                  Restore Purchases
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => openLegalPage('privacy')}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-3 flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <Ionicons name="shield-checkmark-outline" size={24} color="#ec4899" />
                <Text className="text-white font-medium ml-3">
                  Privacy Policy
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            </TouchableOpacity>
          </View>
        )}

        {/* About Section */}
        <View className="mb-6">
          <Text className="text-gray-400 text-sm font-semibold uppercase mb-3">
            About
          </Text>

          <TouchableOpacity
            onPress={() => openLegalPage('terms')}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-3 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <Ionicons name="document-text-outline" size={24} color="#ec4899" />
              <Text className="text-white font-medium ml-3">
                Terms of Service
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { hapticSelection(); setShowSupport(true); }}
            className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-3 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <Ionicons name="chatbubble-ellipses-outline" size={24} color="#ec4899" />
              <Text className="text-white font-medium ml-3">
                Contact Support
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>

        {/* Actions Section */}
        {isAuthenticated && (
          <View className="mb-6">
            <Text className="text-gray-400 text-sm font-semibold uppercase mb-3">
              Actions
            </Text>

            <TouchableOpacity
              onPress={handleLogout}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-3 flex-row items-center"
            >
              <Ionicons name="log-out-outline" size={24} color="#ef4444" />
              <Text className="text-red-500 font-medium ml-3">Sign Out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleDeletePress}
              disabled={deleting}
              className="bg-gray-900 rounded-xl p-4 flex-row items-center"
              style={{ borderWidth: 1, borderColor: '#7f1d1d' }}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
              )}
              <Text className="text-red-500 font-medium ml-3">
                Delete Account
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* App Info */}
        <View className="items-center mt-6">
          <Text className="text-gray-500 text-sm">EraCheck v1.0.0</Text>
          <Text className="text-gray-600 text-xs mt-1">
            Made with love for Gen Z
          </Text>
        </View>
      </ScrollView>

      <SupportTicketModal visible={showSupport} onClose={() => setShowSupport(false)} appId="eracheck" userEmail={user?.email} />

      {/* Legal Document Modal */}
      <Modal
        visible={showLegalModal}
        onClose={closeLegalModal}
        title={legalTitle}
        size="lg"
      >
        {legalLoading ? (
          <View className="items-center py-10">
            <ActivityIndicator size="large" color="#ec4899" />
            <Text className="mt-4 text-gray-400">Loading...</Text>
          </View>
        ) : (
          <Text className="text-base text-gray-300 leading-6">
            {legalContent}
          </Text>
        )}
      </Modal>

      {/* Delete Account Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        onClose={handleCloseModal}
        showCloseButton={false}
        dismissOnBackdropPress={!deleteLoading}
      >
        {/* Warning Icon */}
        <View className="items-center mb-4">
          <View
            className="w-16 h-16 rounded-full items-center justify-center"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
          >
            <Ionicons name="warning" size={32} color="#EF4444" />
          </View>
        </View>

        {/* Title */}
        <Text className="text-2xl font-bold text-white text-center mb-2">
          Delete Account
        </Text>

        {/* Description */}
        <Text className="text-base text-gray-400 text-center mb-6">
          This action cannot be undone. All your data will be permanently deleted.
        </Text>

        {/* Password Input (only for non-Apple users) */}
        {!isAppleUser && (
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-300 mb-2">
              Enter your password to confirm
            </Text>
            <Input
              placeholder="Password"
              secureTextEntry
              showPasswordToggle
              value={deletePassword}
              onChangeText={setDeletePassword}
              error={deleteError}
            />
          </View>
        )}

        {/* Error for Apple users */}
        {isAppleUser && deleteError ? (
          <View className="mb-4">
            <Text className="text-sm text-red-500 text-center">{deleteError}</Text>
          </View>
        ) : null}

        {/* Buttons */}
        <View className="flex-row gap-3 mt-2">
          <View className="flex-1">
            <Button
              title="Cancel"
              variant="outline"
              onPress={handleCloseModal}
              disabled={deleteLoading}
              fullWidth
            />
          </View>
          <View className="flex-1">
            <Button
              title="Delete"
              variant="destructive"
              onPress={handleConfirmDelete}
              isLoading={deleteLoading}
              fullWidth
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
