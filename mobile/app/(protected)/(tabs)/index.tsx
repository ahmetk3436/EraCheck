import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  withRepeat,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../contexts/AuthContext';
import { useSubscription } from '../../../contexts/SubscriptionContext';
import api from '../../../lib/api';
import { hapticSuccess, hapticError, hapticLight, hapticSelection, hapticWarning } from '../../../lib/haptics';
import { isGuestMode, getRemainingQuizzes } from '../../../lib/guest';
import { useNetworkStatus } from '../../../lib/network';
import { withRetry } from '../../../lib/retry';
import Skeleton from '../../../components/Skeleton';
import ErrorState from '../../../components/ErrorState';
import GlassCard from '../../../components/ui/GlassCard';
import StreakBadge from '../../../components/ui/StreakBadge';
import UsageBadge from '../../../components/ui/UsageBadge';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const GUEST_LIMIT = 3;

interface Streak {
  current_streak: number;
  longest_streak: number;
}

interface EraResult {
  id: string;
  era_title: string;
  era_emoji: string;
  era_color: string;
  created_at: string;
}

// Era gradient mappings
const ERA_GRADIENTS: Record<string, readonly [string, string]> = {
  'renaissance': ['#8b5cf6', '#6366f1'],
  'victorian': ['#ec4899', '#be185d'],
  'roaring-twenties': ['#f59e0b', '#d97706'],
  'mid-century': ['#22c55e', '#16a34a'],
  'seventies': ['#f97316', '#ea580c'],
  'eighties': ['#ec4899', '#8b5cf6'],
  'nineties': ['#06b6d4', '#0891b2'],
  'y2k': ['#a855f7', '#7c3aed'],
  'modern': ['#3b82f6', '#1d4ed8'],
  'digital': ['#10b981', '#059669'],
};

const ERA_EMOJIS: Record<string, string> = {
  'renaissance': '🎨',
  'victorian': '👑',
  'roaring-twenties': '🎭',
  'mid-century': '📺',
  'seventies': '🌻',
  'eighties': '📼',
  'nineties': '💾',
  'y2k': '💿',
  'modern': '📱',
  'digital': '🌐',
};

const QuizHomeSkeleton: React.FC = () => (
  <View className="p-6">
    <View className="mb-8">
      <Skeleton className="w-40 h-10 mb-2" />
      <Skeleton className="w-56 h-5" />
    </View>
    <Skeleton className="w-full h-24 rounded-2xl mb-4" />
    <Skeleton className="w-full h-32 rounded-2xl mb-4" />
    <Skeleton className="w-full h-28 rounded-2xl mb-6" />
    <Skeleton className="w-full h-20 rounded-xl mb-3" />
    <View className="flex-row gap-3">
      <Skeleton className="flex-1 h-28 rounded-xl" />
      <Skeleton className="flex-1 h-28 rounded-xl" />
    </View>
  </View>
);

interface ConfettiPieceProps {
  delay: number;
  startX: number;
  color: string;
  size: number;
}

const ConfettiPiece: React.FC<ConfettiPieceProps> = ({ delay, startX, color, size }) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withSequence(
        withTiming(-SCREEN_HEIGHT * 0.7, { duration: 1200, easing: Easing.out(Easing.quad) }),
        withTiming(-SCREEN_HEIGHT * 0.9, { duration: 300 })
      )
    );
    translateX.value = withDelay(delay, withTiming(startX, { duration: 1200 }));
    opacity.value = withDelay(delay + 800, withTiming(0, { duration: 400 }));
    scale.value = withDelay(delay, withSpring(1, { damping: 8 }));
    rotation.value = withDelay(delay, withTiming(360 * 3, { duration: 1200 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: SCREEN_WIDTH / 2 - size / 2,
          bottom: SCREEN_HEIGHT * 0.3,
        },
        animatedStyle,
      ]}
    />
  );
};

export default function QuizHomeScreen() {
  const { user, isGuest, guestUsageCount, canUseFeature, isAuthenticated } = useAuth();
  const { isSubscribed } = useSubscription();

  const { isOnline, isChecking, checkNow } = useNetworkStatus();

  const [streak, setStreak] = useState<Streak | null>(null);
  const [latestResult, setLatestResult] = useState<EraResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [guestRemaining, setGuestRemaining] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasQuizToday, setHasQuizToday] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  // Animation values
  const flameScale = useSharedValue(1.0);
  const glowOpacity = useSharedValue(0.3);

  // Computed values
  const currentStreak = streak?.current_streak || 0;
  const longestStreak = streak?.longest_streak || 0;
  const showStreakWarning = currentStreak > 0 && !hasQuizToday;

  // Animated styles
  const flameAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  useEffect(() => {
    loadData();
  }, []);

  // Check if we should show celebration (after quiz completion)
  useEffect(() => {
    const checkCelebration = async () => {
      const justCompleted = await AsyncStorage.getItem('quiz_just_completed');
      if (justCompleted === 'true') {
        await AsyncStorage.removeItem('quiz_just_completed');
        setShowCelebration(true);
        hapticSuccess();
        setTimeout(() => {
          setShowCelebration(false);
        }, 1500);
      }
    };
    checkCelebration();
  }, []);

  // Setup animations
  useEffect(() => {
    if (currentStreak > 0) {
      flameScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 750 }),
          withTiming(1.0, { duration: 750 })
        ),
        -1,
        false
      );
    }

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      false
    );
  }, [currentStreak]);

  const loadData = useCallback(async () => {
    try {
      setError(null);

      // Check guest mode remaining
      const guest = await isGuestMode();
      if (guest) {
        const rem = await getRemainingQuizzes();
        setGuestRemaining(rem);
      }

      if (isGuest && !isAuthenticated) {
        setLoading(false);
        return;
      }

      const [streakRes, resultsRes] = await Promise.all([
        api.get('/challenges/streak'),
        api.get('/era/results'),
      ]);

      // Extract streak from envelope
      const streakData = streakRes.data.streak || streakRes.data;
      setStreak(streakData);

      // Extract results from envelope
      const results = resultsRes.data.results || resultsRes.data;
      if (results && results.length > 0) {
        setLatestResult(results[0]);

        // Check if the latest result is from today
        const latestDate = new Date(results[0].created_at).toDateString();
        const today = new Date().toDateString();
        setHasQuizToday(latestDate === today);
      }

      hapticSuccess();
    } catch (err: any) {
      console.error('Failed to load data:', err);
      hapticError();
      setError('Failed to load quiz data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [isGuest, isAuthenticated]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(null);

    if (!isOnline) {
      setRefreshError('No internet connection');
      setRefreshing(false);
      hapticError();
      return;
    }

    try {
      const result = await withRetry(
        async () => {
          const [streakRes, resultsRes] = await Promise.all([
            api.get('/challenges/streak'),
            api.get('/era/results'),
          ]);
          return { streakRes, resultsRes };
        },
        { maxRetries: 3, initialDelayMs: 1000 }
      );

      if (result.success && result.data) {
        const streakData = result.data.streakRes.data.streak || result.data.streakRes.data;
        setStreak(streakData);

        const results = result.data.resultsRes.data.results || result.data.resultsRes.data;
        if (results && results.length > 0) {
          setLatestResult(results[0]);
          const latestDate = new Date(results[0].created_at).toDateString();
          const today = new Date().toDateString();
          setHasQuizToday(latestDate === today);
        }

        setRetryCount(0);
        hapticSuccess();
      } else {
        setRetryCount(prev => prev + 1);
        setRefreshError('Failed to load data. Please try again.');
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

  // Auto-dismiss error after 3 seconds if retryCount < 3
  useEffect(() => {
    if (refreshError && retryCount < 3) {
      const timer = setTimeout(() => {
        setRefreshError(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [refreshError, retryCount]);

  const handleRetry = () => {
    hapticSelection();
    setLoading(true);
    loadData();
  };

  const handleStartQuiz = () => {
    if (!canUseFeature()) {
      Alert.alert(
        'Free Uses Exhausted',
        'You have used all 3 free tries. Create an account to continue!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Up', onPress: () => router.push('/(auth)/register') },
        ]
      );
      return;
    }
    hapticSelection();
    router.push('/(protected)/quiz');
  };

  const handleViewResult = () => {
    if (latestResult) {
      hapticSelection();
      router.push(`/(protected)/results/${latestResult.id}`);
    }
  };

  const getUserName = (): string => {
    if (user?.email) {
      const namePart = user.email.split('@')[0];
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return 'there';
  };

  const getEraGradient = (era: string): readonly [string, string] => {
    // Try to match era key from the title or color
    const key = era.toLowerCase().replace(/\s+/g, '-');
    for (const [k, v] of Object.entries(ERA_GRADIENTS)) {
      if (key.includes(k) || k.includes(key)) return v;
    }
    return ['#ec4899', '#f43f5e'];
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#0f0f1a]" edges={['top']}>
        <QuizHomeSkeleton />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-[#0f0f1a]" edges={['top']}>
        <ErrorState
          icon="cloud-offline"
          title="Something went wrong"
          message="We couldn't load your quiz data"
          retryText="Try Again"
          onRetry={handleRetry}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0f0f1a]" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ec4899"
          />
        }
      >
        <View className="px-6 pt-6">

          {/* === WELCOME HEADER SECTION === */}
          <View className="flex-row justify-between items-center mb-6">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-white">
                Hey {getUserName()}! ✨
              </Text>
              <Text className="text-base text-gray-400 mt-1">
                Ready to discover your era?
              </Text>
            </View>
            {isGuest && !isAuthenticated && (
              <UsageBadge
                used={guestUsageCount}
                limit={GUEST_LIMIT}
                type="guest"
                size="sm"
                onPress={() => router.push('/(auth)/register')}
              />
            )}
          </View>

          {/* Offline Banner */}
          {!isOnline && (
            <View className="bg-red-900/50 border border-red-700 rounded-xl mt-2 mb-2 p-3 flex-row items-center gap-2">
              <Ionicons name="cloud-offline" size={20} color="#f87171" />
              <Text className="text-red-400 text-sm flex-1">
                You're offline. Some features may be unavailable.
              </Text>
            </View>
          )}

          {/* Refresh Error Banner */}
          {refreshError && (
            <Animated.View
              entering={FadeIn.duration(300)}
              exiting={FadeOut.duration(300)}
              className="bg-red-900/30 border border-red-800 rounded-xl p-3 mb-2 mt-2"
            >
              <Text className="text-red-400 text-sm text-center">
                Failed to refresh. Pull down to try again.
              </Text>
            </Animated.View>
          )}

          {/* Manual Retry Button */}
          {retryCount >= 3 && refreshError && (
            <Pressable
              onPress={handleManualRetry}
              className="bg-purple-600 rounded-xl py-3 px-6 mt-2 mb-2 flex-row items-center justify-center gap-2"
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

          {/* === STREAK WIDGET SECTION === */}
          <GlassCard variant="glass" className="mb-4 p-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                {currentStreak > 0 ? (
                  <Animated.View style={flameAnimatedStyle}>
                    <Ionicons name="flame" size={32} color="#f97316" />
                  </Animated.View>
                ) : (
                  <Ionicons name="flame-outline" size={32} color="#6b7280" />
                )}
                <View className="ml-3">
                  <Text className="text-3xl font-bold text-white">{currentStreak}</Text>
                  <Text className="text-sm text-gray-400">day streak</Text>
                </View>
              </View>
              {currentStreak > 0 && (
                <View className="bg-orange-500/20 rounded-full px-4 py-2">
                  <Text className="text-base font-semibold text-orange-400">
                    🔥 Best: {longestStreak}
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-sm text-gray-400 mt-3 text-center">
              {currentStreak > 0 ? 'Keep your streak alive! 🔥' : 'Start a streak today!'}
            </Text>
          </GlassCard>

          {/* === STREAK WARNING BANNER === */}
          {showStreakWarning && (
            <View
              className="rounded-xl p-4 mb-4 flex-row items-center"
              style={{ backgroundColor: 'rgba(120, 53, 15, 0.3)', borderWidth: 1, borderColor: '#c2410c' }}
            >
              <Ionicons name="warning" size={20} color="#f97316" />
              <Text className="text-sm ml-3 flex-1" style={{ color: '#fed7aa' }}>
                Don't lose your {currentStreak}-day streak! Take a quiz today.
              </Text>
            </View>
          )}

          {/* === LATEST RESULT CARD === */}
          {latestResult ? (
            <Pressable onPress={handleViewResult} className="mb-4">
              <LinearGradient
                colors={getEraGradient(latestResult.era_title)}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                className="rounded-2xl p-5 overflow-hidden"
              >
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center flex-1">
                    <Text className="text-4xl">{latestResult.era_emoji}</Text>
                    <View className="ml-4 flex-1">
                      <Text className="text-lg font-bold text-white">
                        {latestResult.era_title}
                      </Text>
                      <Text className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                        Your latest result
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="white" />
                </View>
                <Text className="text-sm mt-3" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  View Details →
                </Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable onPress={handleStartQuiz} className="mb-4">
              <GlassCard variant="glass" className="p-5">
                <View className="flex-row items-center justify-center">
                  <Ionicons name="sparkles" size={24} color="#ec4899" />
                  <Text className="text-base text-gray-300 ml-2">
                    Take your first quiz!
                  </Text>
                </View>
              </GlassCard>
            </Pressable>
          )}

          {/* === START QUIZ CTA BUTTON === */}
          <Pressable onPress={handleStartQuiz} className="mb-6">
            <LinearGradient
              colors={['#A855F7', '#EC4899']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              className="rounded-2xl py-5 px-6"
              style={{
                shadowColor: '#A855F7',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.4,
                shadowRadius: 16,
                elevation: 10,
              }}
            >
              <View className="flex-row items-center justify-center">
                <Ionicons name="sparkles" size={26} color="white" />
                <Text className="text-xl font-bold text-white ml-3">
                  Discover Your Era
                </Text>
              </View>
              <Text className="text-sm text-center mt-2" style={{ color: 'rgba(255,255,255,0.7)' }}>
                15 questions  ·  2 min  ·  Free
              </Text>
            </LinearGradient>
          </Pressable>

          {/* === QUICK STATS === */}
          {latestResult && (
            <View className="flex-row gap-3 mb-6">
              <GlassCard variant="glass" className="flex-1 p-4 items-center">
                <Text className="text-2xl font-black text-white">{currentStreak}</Text>
                <Text className="text-xs text-gray-400 mt-1">day streak</Text>
              </GlassCard>
              <GlassCard variant="glass" className="flex-1 p-4 items-center">
                <Text className="text-2xl font-black text-pink-400">{longestStreak}</Text>
                <Text className="text-xs text-gray-400 mt-1">best streak</Text>
              </GlassCard>
              <GlassCard variant="glass" className="flex-1 p-4 items-center">
                <Ionicons name="calendar" size={24} color="#a855f7" />
                <Text className="text-xs text-gray-400 mt-1">play daily</Text>
              </GlassCard>
            </View>
          )}

        </View>
      </ScrollView>

      {/* Celebration Overlay */}
      {showCelebration && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.2)',
          }}
          pointerEvents="none"
        >
          {[
            { color: '#ec4899', delay: 0, startX: -100, size: 20 },
            { color: '#a855f7', delay: 100, startX: -30, size: 16 },
            { color: '#f43f5e', delay: 200, startX: 40, size: 24 },
            { color: '#fbbf24', delay: 300, startX: 100, size: 18 },
          ].map((piece, index) => (
            <ConfettiPiece
              key={index}
              color={piece.color}
              delay={piece.delay}
              startX={piece.startX}
              size={piece.size}
            />
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}
