import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../../contexts/AuthContext';
import { useSubscription } from '../../../contexts/SubscriptionContext';
import api from '../../../lib/api';
import { hapticSuccess, hapticError, hapticLight } from '../../../lib/haptics';

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
  const router = useRouter();
  const { user, logout, deleteAccount, isGuest, isAuthenticated } = useAuth();
  const { isSubscribed, handleRestore } = useSubscription();
  const [stats, setStats] = useState<EraStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

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

  const handleDeleteAccount = () => {
    hapticLight();
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
              hapticSuccess();
            } catch (error: any) {
              hapticError();
              Alert.alert('Error', 'Failed to delete account');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handlePrivacyPolicy = () => {
    hapticLight();
    Linking.openURL('https://example.com/privacy');
  };

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
              onPress={handlePrivacyPolicy}
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
            onPress={() => Linking.openURL('https://example.com/terms')}
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
              onPress={handleDeleteAccount}
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
    </SafeAreaView>
  );
}
