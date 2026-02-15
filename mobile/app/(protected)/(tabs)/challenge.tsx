import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ReanimatedAnimated, { FadeIn, FadeOut } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticSuccess, hapticError, hapticSelection, hapticWarning } from '../../../lib/haptics';
import { useNetworkStatus } from '../../../lib/network';
import { withRetry } from '../../../lib/retry';
import api from '../../../lib/api';
import Skeleton from '../../../components/Skeleton';
import ErrorState from '../../../components/ErrorState';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface StreakBadge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  milestone: number;
  color: string;
}

interface ChallengeHistoryItem {
  id: string;
  date: string;
  challenge_date?: string;
  era: string;
  eraTitle: string;
  eraColor: string;
  prompt?: string;
  response: string;
}

interface Streak {
  current_streak: number;
  longest_streak: number;
}

interface Badge {
  name: string;
  emoji: string;
  required: number;
  unlocked: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const STREAK_BADGES: StreakBadge[] = [
  {
    id: 'streak-3',
    name: 'Getting Started',
    description: 'Complete 3 daily challenges in a row',
    emoji: '\u{1F525}',
    milestone: 3,
    color: '#f97316',
  },
  {
    id: 'streak-7',
    name: 'Week Warrior',
    description: 'Complete 7 daily challenges in a row',
    emoji: '\u{26A1}',
    milestone: 7,
    color: '#eab308',
  },
  {
    id: 'streak-14',
    name: 'Fortnight Fighter',
    description: 'Complete 14 daily challenges in a row',
    emoji: '\u{1F48E}',
    milestone: 14,
    color: '#06b6d4',
  },
  {
    id: 'streak-21',
    name: 'Habit Hero',
    description: 'Complete 21 daily challenges in a row',
    emoji: '\u{1F3C6}',
    milestone: 21,
    color: '#8b5cf6',
  },
  {
    id: 'streak-30',
    name: 'Monthly Master',
    description: 'Complete 30 daily challenges in a row',
    emoji: '\u{1F451}',
    milestone: 30,
    color: '#ec4899',
  },
  {
    id: 'streak-50',
    name: 'Legendary Streak',
    description: 'Complete 50 daily challenges in a row',
    emoji: '\u{1F31F}',
    milestone: 50,
    color: '#f59e0b',
  },
];

const ERA_PROFILES: Record<string, { title: string; color: string }> = {
  'victorian': { title: 'Victorian Era', color: '#8b5a2b' },
  'roaring-twenties': { title: 'Roaring Twenties', color: '#ffd700' },
  'renaissance': { title: 'Renaissance', color: '#8b4513' },
  'medieval': { title: 'Medieval Times', color: '#4a5568' },
  'ancient-rome': { title: 'Ancient Rome', color: '#9c4221' },
  'ancient-egypt': { title: 'Ancient Egypt', color: '#d69e2e' },
  'futuristic': { title: 'Futuristic', color: '#00d4ff' },
  'prehistoric': { title: 'Prehistoric', color: '#553c9a' },
};

// ============================================
// SKELETON
// ============================================

const ChallengeSkeleton: React.FC = () => (
  <View className="p-6">
    <View className="mb-6">
      <Skeleton className="w-48 h-8 mb-2" />
      <Skeleton className="w-40 h-5" />
    </View>
    <Skeleton className="w-full h-20 rounded-2xl mb-6" />
    <View className="flex-row flex-wrap gap-3 mb-6">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} className="w-[48%]">
          <Skeleton className="w-full h-28 rounded-2xl" />
        </View>
      ))}
    </View>
    <Skeleton className="w-full h-40 rounded-2xl mb-4" />
    <Skeleton className="w-full h-14 rounded-2xl" />
  </View>
);

// ============================================
// MAIN COMPONENT
// ============================================

export default function ChallengeScreen() {
  // Network & Retry
  const { isOnline, isChecking, checkNow } = useNetworkStatus();

  // State
  const [challenge, setChallenge] = useState<any>(null);
  const [streakData, setStreakData] = useState<Streak | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [history, setHistory] = useState<ChallengeHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState<StreakBadge | null>(null);
  const [celebratedMilestones, setCelebratedMilestones] = useState<string[]>([]);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Animation refs
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ============================================
  // FUNCTIONS
  // ============================================

  const fetchChallengeData = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const [challengeRes, streakRes] = await Promise.all([
        api.get('/challenges/daily'),
        api.get('/challenges/streak'),
      ]);

      const challengeData = challengeRes.data.challenge || challengeRes.data;
      setChallenge(challengeData);

      const streak = streakRes.data.streak || streakRes.data;
      setStreakData(streak);
      setBadges(streakRes.data.badges || []);

      const hasResponded = challengeData.response && challengeData.response !== '';
      setChallengeCompleted(hasResponded);

      if (hasResponded) {
        setResponse(challengeData.response);
      }

      // Fetch challenge history
      try {
        const historyRes = await api.get('/challenges/history?limit=5');
        setHistory(historyRes.data.challenges || []);
      } catch {
        // History fetch is optional
      }

      // Load celebrated milestones from AsyncStorage
      const stored = await AsyncStorage.getItem('celebratedMilestones');
      if (stored) {
        setCelebratedMilestones(JSON.parse(stored));
      }
    } catch (err) {
      console.error('Failed to fetch challenge:', err);
      hapticError();
      setError("Failed to load today's challenge");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateCountdown = useCallback((): void => {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const remaining = midnight.getTime() - now.getTime();

    if (remaining <= 0) {
      setCountdown({ hours: 0, minutes: 0, seconds: 0 });
      fetchChallengeData();
      return;
    }

    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    setCountdown({ hours, minutes, seconds });
  }, [fetchChallengeData]);

  const formatCountdown = (time: { hours: number; minutes: number; seconds: number }): string => {
    const pad = (n: number): string => n.toString().padStart(2, '0');
    return `${pad(time.hours)}:${pad(time.minutes)}:${pad(time.seconds)}`;
  };

  const handleSubmit = async (): Promise<void> => {
    if (!response.trim()) {
      hapticWarning();
      return;
    }

    try {
      setIsSubmitting(true);
      hapticSelection();

      await api.post('/challenges/submit', {
        response: response.trim(),
      });

      hapticSuccess();
      setChallengeCompleted(true);

      // Reload streak data to get updated streak count
      const streakRes = await api.get('/challenges/streak');
      const newStreak = streakRes.data.streak || streakRes.data;
      const newStreakCount = newStreak.current_streak || 0;
      setStreakData(newStreak);
      setBadges(streakRes.data.badges || []);

      // Check for new milestone
      const milestone = STREAK_BADGES.find(
        (b) => b.milestone === newStreakCount && !celebratedMilestones.includes(b.id)
      );

      if (milestone) {
        setCurrentMilestone(milestone);
        setShowMilestone(true);

        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }).start();

        const updated = [...celebratedMilestones, milestone.id];
        setCelebratedMilestones(updated);
        await AsyncStorage.setItem('celebratedMilestones', JSON.stringify(updated));
      }

      // Refresh full data
      fetchChallengeData();
    } catch (err) {
      console.error('Failed to submit:', err);
      hapticError();
    } finally {
      setIsSubmitting(false);
    }
  };

  const dismissMilestone = (): void => {
    hapticSelection();
    Animated.timing(scaleAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
      easing: Easing.ease,
    }).start(() => {
      setShowMilestone(false);
      setCurrentMilestone(null);
    });
  };

  const toggleHistoryExpand = (id: string): void => {
    hapticSelection();
    setExpandedHistoryIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getCharCounterColor = (length: number): string => {
    const percentage = (length / 500) * 100;
    if (percentage >= 95) return 'text-red-400';
    if (percentage >= 80) return 'text-orange-400';
    return 'text-gray-500';
  };

  const isBadgeUnlocked = (badge: StreakBadge, streak: number): boolean => {
    return streak >= badge.milestone;
  };

  const getBadgeProgress = (badge: StreakBadge, streak: number): { current: number; target: number; percentage: number } => {
    const current = Math.min(streak, badge.milestone);
    const target = badge.milestone;
    const percentage = Math.min((streak / badge.milestone) * 100, 100);
    return { current, target, percentage };
  };

  const getNextBadge = (streak: number): StreakBadge | undefined => {
    return STREAK_BADGES.find((b) => streak < b.milestone);
  };

  const getEraInfo = (era: string): { title: string; color: string } => {
    return ERA_PROFILES[era] || { title: era, color: '#6b7280' };
  };

  const handleRetry = () => {
    hapticSelection();
    fetchChallengeData();
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(null);

    if (!isOnline) {
      setRefreshError('No internet connection. Please connect to view challenges.');
      setRefreshing(false);
      hapticWarning();
      return;
    }

    try {
      const result = await withRetry(
        async () => {
          const [challengeRes, streakRes] = await Promise.all([
            api.get('/challenges/daily'),
            api.get('/challenges/streak'),
          ]);
          return { challengeRes, streakRes };
        },
        { maxRetries: 3, initialDelayMs: 1000 }
      );

      if (result.success && result.data) {
        const challengeData = result.data.challengeRes.data.challenge || result.data.challengeRes.data;
        setChallenge(challengeData);

        const streak = result.data.streakRes.data.streak || result.data.streakRes.data;
        setStreakData(streak);
        setBadges(result.data.streakRes.data.badges || []);

        const hasResponded = challengeData.response && challengeData.response !== '';
        setChallengeCompleted(hasResponded);
        if (hasResponded) {
          setResponse(challengeData.response);
        }

        // Refresh history
        try {
          const historyRes = await api.get('/challenges/history?limit=5');
          setHistory(historyRes.data.challenges || []);
        } catch {
          // History fetch is optional
        }

        setRetryCount(0);
        hapticSuccess();
      } else {
        setRetryCount(prev => prev + 1);
        setRefreshError('Failed to load challenge. Please try again.');
        hapticError();
      }
    } catch (err) {
      setRetryCount(prev => prev + 1);
      setRefreshError('An error occurred. Pull down to retry.');
      hapticError();
    } finally {
      setRefreshing(false);
    }
  }, [isOnline]);

  const handleManualRetry = useCallback(async () => {
    setIsRetrying(true);
    setRefreshError(null);

    await checkNow();
    await onRefresh();

    setIsRetrying(false);
  }, [checkNow, onRefresh]);

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    fetchChallengeData();
  }, [fetchChallengeData]);

  useEffect(() => {
    if (!challengeCompleted) return;

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [challengeCompleted, updateCountdown]);

  useEffect(() => {
    const streak = streakData?.current_streak || 0;
    if (streak < 50) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      ).start();
    }
  }, [streakData, pulseAnim]);

  // Auto-dismiss error after 3 seconds if retryCount < 3
  useEffect(() => {
    if (refreshError && retryCount < 3) {
      const timer = setTimeout(() => {
        setRefreshError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [refreshError, retryCount]);

  // ============================================
  // LOADING STATE
  // ============================================

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
        <ChallengeSkeleton />
      </SafeAreaView>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
        <ErrorState
          icon="help-circle-outline"
          title="Challenge Unavailable"
          message="We couldn't load today's challenge"
          retryText="Try Again"
          onRetry={handleRetry}
        />
      </SafeAreaView>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  const streak = streakData?.current_streak || 0;
  const nextBadge = getNextBadge(streak);

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
      <ScrollView
        className="flex-1 px-6 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ec4899"
          />
        }
      >
        {/* Offline Banner */}
        {!isOnline && (
          <View className="bg-red-900/50 border border-red-700 rounded-xl mt-2 mb-2 p-3 flex-row items-center gap-2">
            <Ionicons name="cloud-offline" size={20} color="#f87171" />
            <Text className="text-red-400 text-sm flex-1">
              You're offline. Challenges require internet connection.
            </Text>
          </View>
        )}

        {/* Refresh Error Banner */}
        {refreshError && (
          <ReanimatedAnimated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            className="bg-red-900/30 border border-red-800 rounded-xl p-3 mb-2 mt-2"
          >
            <Text className="text-red-400 text-sm text-center">
              Failed to load challenge. Pull down to try again.
            </Text>
          </ReanimatedAnimated.View>
        )}

        {/* Manual Retry Button */}
        {retryCount >= 3 && refreshError && (
          <Pressable
            onPress={handleManualRetry}
            className="bg-purple-600 rounded-xl py-3 px-6 mt-2 mb-2 flex-row items-center justify-center gap-2 active:opacity-80"
          >
            {isRetrying ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="refresh" size={18} color="#ffffff" />
                <Text className="text-white font-semibold">Retry Now</Text>
              </>
            )}
          </Pressable>
        )}

        {/* Header Section */}
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xl font-bold text-white">Daily Challenge</Text>
          <View className="bg-pink-500/20 px-3 py-1 rounded-full flex-row items-center gap-1">
            <Ionicons name="flame" size={16} color="#ec4899" />
            <Text className="text-pink-400 font-semibold">{streak} day streak</Text>
          </View>
        </View>
        <Text className="text-gray-400 text-sm mb-6">
          Complete daily challenges to earn badges and discover your era
        </Text>

        {/* Countdown Timer Section */}
        {challengeCompleted && (
          <View className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
            <View className="flex-row items-center justify-center gap-2 mb-2">
              <Ionicons name="timer" size={20} color="#f472b6" />
              <Text className="text-gray-400 text-sm">Next challenge in</Text>
            </View>
            <Text className="text-2xl font-bold text-pink-400 text-center tracking-wider"
              style={{ fontVariant: ['tabular-nums'] }}
            >
              {formatCountdown(countdown)}
            </Text>
          </View>
        )}

        {/* Challenge Prompt Card */}
        <LinearGradient
          colors={['rgba(88,28,135,0.5)', 'rgba(131,24,67,0.5)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="rounded-3xl p-6 mb-6 border border-purple-500/20"
        >
          <View className="flex-row items-center gap-2 mb-3">
            <Ionicons name="help-circle" size={20} color="#a855f7" />
            <Text className="text-purple-300 font-semibold">Today's Prompt</Text>
          </View>
          <Text className="text-white text-lg leading-7">
            {challenge?.prompt || 'What would your ideal day look like in your favorite historical era?'}
          </Text>
        </LinearGradient>

        {/* Response Input Section */}
        {!challengeCompleted && (
          <View className="mb-6">
            <Text className="text-gray-300 font-semibold mb-2">Your Response</Text>
            <TextInput
              className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-white text-base"
              style={{ minHeight: 120 }}
              placeholder="Share your thoughts..."
              placeholderTextColor="#6b7280"
              multiline
              maxLength={500}
              value={response}
              onChangeText={setResponse}
              textAlignVertical="top"
            />
            <View className="flex-row justify-between items-center mt-2">
              <Text className={`${getCharCounterColor(response.length)} text-xs`}>
                {response.length}/500
              </Text>
            </View>

            <Pressable
              onPress={handleSubmit}
              disabled={isSubmitting || !response.trim()}
              className="mt-4"
            >
              <LinearGradient
                colors={response.trim() ? ['#ec4899', '#a855f7'] : ['#374151', '#374151']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-2xl py-4"
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text className="text-white font-bold text-center text-lg">
                    Submit Response
                  </Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        )}

        {/* Completed Confirmation */}
        {challengeCompleted && (
          <View className="flex-row items-center justify-center mb-6 bg-green-500/10 rounded-2xl p-3">
            <Ionicons name="checkmark-circle" size={20} color="#10b981" />
            <Text className="text-green-500 font-medium ml-2">
              Response submitted!
            </Text>
          </View>
        )}

        {/* Badges Section */}
        <Text className="text-lg font-bold text-white mb-4">Your Badges</Text>
        <View className="flex-row flex-wrap gap-3 mb-6">
          {STREAK_BADGES.map((badge) => {
            const unlocked = isBadgeUnlocked(badge, streak);
            const progress = getBadgeProgress(badge, streak);
            const isNext = nextBadge?.id === badge.id;

            return (
              <Animated.View
                key={badge.id}
                style={isNext ? { transform: [{ scale: pulseAnim }] } : undefined}
                className={`w-[48%] bg-gray-900 rounded-2xl p-4 border ${
                  unlocked ? 'border-purple-500/30' : isNext ? 'border-pink-500/50' : 'border-gray-800'
                } ${!unlocked ? 'opacity-50' : ''}`}
              >
                <View className="flex-row items-center gap-3">
                  <View className="relative">
                    <Text className="text-4xl" style={unlocked ? {} : { opacity: 0.35 }}>
                      {badge.emoji}
                    </Text>
                    {!unlocked && (
                      <View className="absolute inset-0 items-center justify-center">
                        <Ionicons name="lock-closed" size={14} color="#9ca3af" />
                      </View>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold text-sm">{badge.name}</Text>
                    <Text className="text-gray-400 text-xs" numberOfLines={1}>
                      {badge.description}
                    </Text>
                  </View>
                </View>

                {/* Progress Bar */}
                <View className="bg-gray-800 rounded-full h-2 mt-3 overflow-hidden">
                  <View
                    className="rounded-full h-2"
                    style={{
                      width: `${progress.percentage}%`,
                      backgroundColor: badge.color,
                    }}
                  />
                </View>
                <Text className="text-gray-500 text-xs mt-1">
                  {progress.current}/{progress.target} days
                </Text>
              </Animated.View>
            );
          })}
        </View>

        {/* Challenge History Section */}
        {history.length > 0 && (
          <>
            <Text className="text-lg font-bold text-white mb-4">Challenge History</Text>
            {history.map((item) => {
              const eraInfo = getEraInfo(item.era || '');
              const isExpanded = expandedHistoryIds.includes(item.id);
              const displayResponse = item.response || item.prompt || '';
              const shouldTruncate = displayResponse.length > 100;
              const displayText = !isExpanded && shouldTruncate
                ? `${displayResponse.substring(0, 100)}...`
                : displayResponse;
              const dateStr = item.date || item.challenge_date || '';
              const formattedDate = dateStr
                ? new Date(dateStr).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : '';

              return (
                <Pressable
                  key={item.id}
                  onPress={() => shouldTruncate && toggleHistoryExpand(item.id)}
                  className="bg-gray-900 rounded-2xl p-4 mb-3 border border-gray-800"
                >
                  <View className="flex-row items-center gap-3 mb-2">
                    <View
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: eraInfo.color }}
                    />
                    <View className="flex-1">
                      <Text className="text-white font-semibold">{eraInfo.title}</Text>
                      <Text className="text-gray-500 text-xs">{formattedDate}</Text>
                    </View>
                    {shouldTruncate && (
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color="#9ca3af"
                      />
                    )}
                  </View>
                  <Text className="text-gray-300 text-sm leading-5">{displayText}</Text>
                </Pressable>
              );
            })}
          </>
        )}

        {/* Bottom Spacing */}
        <View className="h-6" />
      </ScrollView>

      {/* Milestone Celebration Modal */}
      <Modal
        visible={showMilestone}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View className="flex-1 bg-black/70 items-center justify-center p-6">
          <Animated.View
            style={{
              transform: [{ scale: scaleAnim }],
              opacity: scaleAnim,
            }}
            className="w-full max-w-sm"
          >
            <LinearGradient
              colors={['#831843', '#581c87', '#1e1b4b']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-3xl p-1"
            >
              <View className="bg-gray-900 rounded-3xl p-8 items-center">
                <Text className="text-6xl mb-4">{currentMilestone?.emoji}</Text>
                <Text className="text-2xl font-bold text-white mb-2 text-center">
                  Achievement Unlocked!
                </Text>
                <Text className="text-pink-400 font-semibold text-lg mb-2">
                  {currentMilestone?.name}
                </Text>
                <Text className="text-gray-400 text-center mb-6">
                  {currentMilestone?.description}
                </Text>
                <Pressable onPress={dismissMilestone} className="w-full">
                  <LinearGradient
                    colors={['#ec4899', '#a855f7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="rounded-2xl px-8 py-4"
                  >
                    <Text className="text-white font-bold text-center text-lg">
                      Continue
                    </Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
