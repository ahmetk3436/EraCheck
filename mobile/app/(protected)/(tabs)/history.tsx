import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  FlatList,
  Image,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut, FadeInUp } from 'react-native-reanimated';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
import { hapticError, hapticLight, hapticSelection, hapticSuccess, hapticWarning } from '../../../lib/haptics';
import { useNetworkStatus } from '../../../lib/network';
import { withRetry } from '../../../lib/retry';
import Skeleton from '../../../components/Skeleton';
import ErrorState from '../../../components/ErrorState';
import ToastBanner from '../../../components/ToastBanner';

interface EraResult {
  id: string;
  era_title: string;
  era_emoji: string;
  era_color: string;
  era_description: string;
  share_count: number;
  created_at: string;
}

interface ChallengeHistoryItem {
  id: string;
  challenge_date?: string;
  photo_url?: string;
  user_answer?: string;
  is_correct?: boolean;
  correct_decade?: string;
}

type HistoryTab = 'challenges' | 'quizzes';

const HistorySkeleton: React.FC = () => (
  <View className="flex-1">
    <View className="px-6 py-4 border-b border-gray-800">
      <Skeleton className="w-28 h-8 mb-2" />
      <Skeleton className="w-16 h-4" />
    </View>
    <View className="p-6">
      <View className="flex-row gap-3 mb-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="w-20 h-20 rounded-xl" />
        ))}
      </View>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="w-full h-20 rounded-xl mb-3" />
      ))}
    </View>
  </View>
);

export default function HistoryScreen() {
  const { isAuthenticated, isGuest } = useAuth();
  const { isOnline, checkNow } = useNetworkStatus();

  const [eraResults, setEraResults] = useState<EraResult[]>([]);
  const [challenges, setChallenges] = useState<ChallengeHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<HistoryTab>('challenges');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isGuest && !isAuthenticated) {
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
        setRefreshError(null);
        if (!isOnline) {
          setRefreshError('No internet connection.');
          setRefreshing(false);
          hapticWarning();
          return;
        }
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch both in parallel
      const [eraRes, challengeRes] = await Promise.all([
        api.get('/era/results').catch(() => ({ data: { results: [] } })),
        api.get('/challenges/history?limit=30').catch(() => ({ data: { challenges: [] } })),
      ]);

      const eraData = eraRes.data.results || eraRes.data || [];
      setEraResults(Array.isArray(eraData) ? eraData : []);

      const challengeData = challengeRes.data.challenges || challengeRes.data || [];
      setChallenges(Array.isArray(challengeData) ? challengeData : []);

      if (isRefresh) {
        setRetryCount(0);
        hapticSuccess();
      }
    } catch (err: any) {
      console.error('Failed to load history:', err);
      if (isRefresh) {
        setRetryCount((prev) => prev + 1);
        setRefreshError('Failed to load. Pull down to retry.');
        hapticError();
      } else {
        setError('Failed to load your history');
        hapticError();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isOnline, isGuest, isAuthenticated]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (refreshError && retryCount < 3) {
      const timer = setTimeout(() => setRefreshError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [refreshError, retryCount]);

  const handleManualRetry = useCallback(async () => {
    setIsRetrying(true);
    setRefreshError(null);
    await checkNow();
    await loadData(true);
    setIsRetrying(false);
  }, [checkNow, loadData]);

  const handleRetry = () => {
    hapticSelection();
    loadData();
  };

  const handleResultPress = (id: string) => {
    hapticLight();
    router.push(`/(protected)/results/${id}`);
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
        <HistorySkeleton />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
        <ErrorState
          icon="time-outline"
          title="No History Found"
          message="We couldn't load your history"
          retryText="Try Again"
          onRetry={handleRetry}
        />
      </SafeAreaView>
    );
  }

  if (isGuest && !isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="lock-closed-outline" size={64} color="#6366f1" />
          <Text className="text-xl font-bold text-white mt-6">Sign In Required</Text>
          <Text className="text-gray-500 text-center mt-2">
            Create an account to save and view your history
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/register')}
            className="rounded-2xl px-8 py-4 mt-8"
            style={{ backgroundColor: '#ec4899' }}
          >
            <Text className="text-white font-bold text-lg">Sign Up Free</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Stats
  const totalChallenges = challenges.length;
  const correctChallenges = challenges.filter((c) => c.is_correct).length;
  const accuracy = totalChallenges > 0 ? Math.round((correctChallenges / totalChallenges) * 100) : 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
      {/* Offline Banner */}
      {!isOnline && (
        <View className="bg-red-900/50 border border-red-700 rounded-xl mx-4 mt-2 p-3 flex-row items-center gap-2">
          <Ionicons name="cloud-offline" size={20} color="#f87171" />
          <Text className="text-red-400 text-sm flex-1">You're offline.</Text>
        </View>
      )}

      {refreshError && (
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
          className="bg-red-900/30 border border-red-800 rounded-xl mx-4 p-3 mb-2 mt-2"
        >
          <Text className="text-red-400 text-sm text-center">Failed to refresh. Pull down to retry.</Text>
        </Animated.View>
      )}

      {retryCount >= 3 && refreshError && (
        <Pressable
          onPress={handleManualRetry}
          className="bg-purple-600 rounded-xl py-3 px-6 mx-4 mt-2 flex-row items-center justify-center gap-2 active:opacity-80"
        >
          {isRetrying ? <ActivityIndicator color="#fff" size="small" /> : (
            <><Ionicons name="refresh" size={18} color="#fff" /><Text className="text-white font-semibold">Retry Now</Text></>
          )}
        </Pressable>
      )}

      {/* Header */}
      <View className="px-6 py-4">
        <Text className="text-2xl font-bold text-white" style={{ fontFamily: 'PlayfairDisplay_700Bold' }}>History</Text>
        {totalChallenges > 0 && (
          <View className="flex-row items-center gap-3 mt-2">
            <Text className="text-gray-400 text-sm">{totalChallenges} challenges</Text>
            <View className="bg-green-500/20 px-2 py-0.5 rounded-full">
              <Text className="text-green-400 text-xs font-semibold">{accuracy}% accuracy</Text>
            </View>
          </View>
        )}
      </View>

      {/* Tab switcher */}
      <View className="flex-row mx-6 mb-4 bg-gray-900 rounded-xl p-1">
        <Pressable
          onPress={() => { hapticSelection(); setActiveTab('challenges'); }}
          className="flex-1 py-2.5 rounded-lg items-center"
          style={{ backgroundColor: activeTab === 'challenges' ? '#1f2937' : 'transparent' }}
        >
          <Text className={`text-sm font-semibold ${activeTab === 'challenges' ? 'text-white' : 'text-gray-500'}`}>
            Daily Photos
          </Text>
        </Pressable>
        <Pressable
          onPress={() => { hapticSelection(); setActiveTab('quizzes'); }}
          className="flex-1 py-2.5 rounded-lg items-center"
          style={{ backgroundColor: activeTab === 'quizzes' ? '#1f2937' : 'transparent' }}
        >
          <Text className={`text-sm font-semibold ${activeTab === 'quizzes' ? 'text-white' : 'text-gray-500'}`}>
            Era Quizzes
          </Text>
        </Pressable>
      </View>

      {/* ─── Challenge Photo Grid ─── */}
      {activeTab === 'challenges' && (
        challenges.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="camera-outline" size={64} color="#374151" />
            <Text className="text-lg font-bold text-white mt-4">No Challenges Yet</Text>
            <Text className="text-gray-500 text-center mt-2">
              Play the daily challenge to build your photo history
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(protected)/(tabs)/challenge')}
              className="rounded-2xl px-8 py-4 mt-6"
              style={{ backgroundColor: '#C4912A' }}
            >
              <Text className="text-white font-bold text-base">Play Today's Challenge</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={challenges}
            numColumns={3}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
            columnWrapperStyle={{ gap: 6 }}
            ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#C4912A" />
            }
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInUp.delay(index * 30).duration(200)} style={{ flex: 1 }}>
                <Pressable
                  onPress={() => hapticLight()}
                  className="rounded-xl overflow-hidden"
                  style={{ aspectRatio: 1 }}
                >
                  {item.photo_url ? (
                    <Image
                      source={{ uri: item.photo_url }}
                      style={{ width: '100%', height: '100%' }}
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="flex-1 bg-gray-800 items-center justify-center">
                      <Ionicons name="image-outline" size={24} color="#4b5563" />
                    </View>
                  )}
                  {/* Correct/Wrong overlay */}
                  <View
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      paddingVertical: 4,
                      paddingHorizontal: 6,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: item.is_correct
                        ? 'rgba(16,185,129,0.85)'
                        : 'rgba(239,68,68,0.85)',
                    }}
                  >
                    <Ionicons
                      name={item.is_correct ? 'checkmark' : 'close'}
                      size={14}
                      color="#fff"
                    />
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                      {item.correct_decade || ''}
                    </Text>
                  </View>
                </Pressable>
              </Animated.View>
            )}
          />
        )
      )}

      {/* ─── Era Quiz Results ─── */}
      {activeTab === 'quizzes' && (
        eraResults.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Ionicons name="sparkles-outline" size={64} color="#374151" />
            <Text className="text-lg font-bold text-white mt-4">No Eras Discovered Yet</Text>
            <Text className="text-gray-500 text-center mt-2">
              Take the personality quiz to find your aesthetic era
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(protected)/quiz')}
              className="rounded-2xl px-8 py-4 mt-6"
              style={{ backgroundColor: '#ec4899' }}
            >
              <Text className="text-white font-bold text-base">Take the Quiz</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={eraResults}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 24 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor="#a855f7" />
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleResultPress(item.id)}
                className="rounded-xl p-4 mb-3 flex-row items-center shadow-sm"
                style={{ backgroundColor: item.era_color }}
              >
                <Text className="text-5xl mr-4">{item.era_emoji}</Text>
                <View className="flex-1">
                  <Text className="text-white text-lg font-bold">{item.era_title}</Text>
                  {item.era_description && (
                    <Text style={{ color: 'rgba(255,255,255,0.8)' }} className="text-xs mt-1" numberOfLines={1}>
                      {item.era_description}
                    </Text>
                  )}
                  <Text style={{ color: 'rgba(255,255,255,0.9)' }} className="text-sm mt-1">
                    {new Date(item.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          />
        )
      )}
    </SafeAreaView>
  );
}
