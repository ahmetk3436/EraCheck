import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  ActivityIndicator,
  Modal,
  RefreshControl,
  Share,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ReanimatedAnimated, { FadeIn, FadeOut } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticSuccess, hapticError, hapticSelection, hapticWarning } from '../../../lib/haptics';
import { useNetworkStatus } from '../../../lib/network';
import { withRetry } from '../../../lib/retry';
import { router } from 'expo-router';
import api from '../../../lib/api';
import { useAuth } from '../../../contexts/AuthContext';
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

interface ChallengeData {
  id: string;
  challenge_date: string;
  photo_url: string;
  options: string[];
  user_answer: string;
  is_correct: boolean;
  correct_decade?: string;
  fun_fact?: string;
}

interface ChallengeHistoryItem {
  id: string;
  challenge_date?: string;
  photo_url?: string;
  user_answer?: string;
  is_correct?: boolean;
  correct_decade?: string;
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Era-appropriate decade color mappings for option buttons
const DECADE_COLORS: Record<string, { bg: readonly [string, string]; border: string; text: string }> = {
  '1920s': { bg: ['#2d1605', '#5c3010'] as const, border: '#c8952a', text: '#f5d78a' },
  '1930s': { bg: ['#1a1508', '#3d3010'] as const, border: '#9b8b5a', text: '#e0c98a' },
  '1940s': { bg: ['#0b1a0b', '#1a3a1a'] as const, border: '#4d7c3f', text: '#a8d59f' },
  '1950s': { bg: ['#1c0808', '#3d1515'] as const, border: '#cc3333', text: '#ffaaaa' },
  '1960s': { bg: ['#1c1808', '#3d3510'] as const, border: '#d4b800', text: '#ffe566' },
  '1970s': { bg: ['#1c1008', '#3d2208'] as const, border: '#cc7700', text: '#ffcc44' },
  '1980s': { bg: ['#1c001c', '#380038'] as const, border: '#cc00cc', text: '#ff66ff' },
  '1990s': { bg: ['#001c1c', '#003838'] as const, border: '#006699', text: '#33ccff' },
  '2000s': { bg: ['#1c0012', '#380024'] as const, border: '#cc0066', text: '#ff66b3' },
  '2010s': { bg: ['#0c001c', '#1c0040'] as const, border: '#7c00cc', text: '#cc88ff' },
  '2020s': { bg: ['#001c1c', '#003838'] as const, border: '#009ab8', text: '#55ddff' },
};

const DEFAULT_DECADE = { bg: ['#1f2937', '#111827'] as const, border: '#6b7280', text: '#ffffff' };

const getDecadeColors = (option: string) => {
  for (const [key, val] of Object.entries(DECADE_COLORS)) {
    if (option.includes(key)) return val;
  }
  return DEFAULT_DECADE;
};

const ORDERED_DECADES = ['1920s', '1930s', '1940s', '1950s', '1960s', '1970s', '1980s', '1990s', '2000s', '2010s', '2020s'];

const getDecadeDistance = (userAnswer: string, correctDecade: string): number => {
  const userIdx = ORDERED_DECADES.indexOf(userAnswer);
  const correctIdx = ORDERED_DECADES.indexOf(correctDecade);
  if (userIdx === -1 || correctIdx === -1) return -1;
  return Math.abs(userIdx - correctIdx);
};

const getProximityLabel = (distance: number): string => {
  if (distance === 0) return '';
  if (distance === 1) return 'So close — just one decade off!';
  if (distance === 2) return 'Almost — two decades off';
  return `${distance} decades off`;
};

const generateShareText = (
  challenge: { correct_decade?: string; is_correct?: boolean; user_answer?: string; challenge_date?: string },
  streak: number
): string => {
  const correctIdx = ORDERED_DECADES.indexOf(challenge.correct_decade || '');
  const userIdx = ORDERED_DECADES.indexOf(challenge.user_answer || '');
  const dateStr = challenge.challenge_date
    ? new Date(challenge.challenge_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  // Build emoji timeline grid (like Wordle)
  const timeline = ORDERED_DECADES.map((_, i) => {
    if (i === correctIdx && i === userIdx) return '✅';
    if (i === correctIdx) return '🟡';
    if (i === userIdx) return '🔴';
    return '⬛';
  }).join('');

  const distance = (correctIdx !== -1 && userIdx !== -1) ? Math.abs(correctIdx - userIdx) : -1;
  const resultLine = challenge.is_correct
    ? 'Nailed it! 🎯'
    : distance === 1 ? 'One decade off! 😅' : `${distance > 0 ? distance + ' decades off' : 'Missed it'} 📅`;

  return `EraCheck Daily (${dateStr})\n${timeline}\n${resultLine}\n🔥 ${streak} day streak\n\nCan you guess the decade?\n#EraCheck`;
};

const STREAK_BADGES: StreakBadge[] = [
  { id: 'streak-3', name: 'Getting Started', description: 'Complete 3 daily challenges in a row', emoji: '\u{1F525}', milestone: 3, color: '#f97316' },
  { id: 'streak-7', name: 'Week Warrior', description: 'Complete 7 daily challenges in a row', emoji: '\u{26A1}', milestone: 7, color: '#eab308' },
  { id: 'streak-14', name: 'Fortnight Fighter', description: 'Complete 14 daily challenges in a row', emoji: '\u{1F48E}', milestone: 14, color: '#06b6d4' },
  { id: 'streak-21', name: 'Habit Hero', description: 'Complete 21 daily challenges in a row', emoji: '\u{1F3C6}', milestone: 21, color: '#8b5cf6' },
  { id: 'streak-30', name: 'Monthly Master', description: 'Complete 30 daily challenges in a row', emoji: '\u{1F451}', milestone: 30, color: '#ec4899' },
  { id: 'streak-50', name: 'Legendary Streak', description: 'Complete 50 daily challenges in a row', emoji: '\u{1F31F}', milestone: 50, color: '#f59e0b' },
];

// ============================================
// SKELETON
// ============================================

const ChallengeSkeleton: React.FC = () => (
  <View className="p-6">
    <View className="mb-6">
      <Skeleton className="w-48 h-8 mb-2" />
      <Skeleton className="w-40 h-5" />
    </View>
    <Skeleton className="w-full h-56 rounded-3xl mb-4" />
    <Skeleton className="w-64 h-6 rounded-full mb-6 self-center" />
    <View className="flex-row flex-wrap gap-3 mb-6">
      {[1, 2, 3, 4].map((i) => (
        <View key={i} className="w-[48%]">
          <Skeleton className="w-full h-16 rounded-2xl" />
        </View>
      ))}
    </View>
  </View>
);

// ============================================
// MAIN COMPONENT
// ============================================

export default function ChallengeScreen() {
  const { isAuthenticated, isGuest } = useAuth();
  const { isOnline, isChecking, checkNow } = useNetworkStatus();

  const [challenge, setChallenge] = useState<ChallengeData | null>(null);
  const [streakData, setStreakData] = useState<Streak | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [history, setHistory] = useState<ChallengeHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [challengeCompleted, setChallengeCompleted] = useState(false);
  const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [showMilestone, setShowMilestone] = useState(false);
  const [currentMilestone, setCurrentMilestone] = useState<StreakBadge | null>(null);
  const [celebratedMilestones, setCelebratedMilestones] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [photoZoomVisible, setPhotoZoomVisible] = useState(false);
  const [challengeSharing, setChallengeSharing] = useState(false);

  const scaleAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;
  const photoOverlayOpacity = useRef(new Animated.Value(1)).current;

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchChallengeData = useCallback(async (): Promise<void> => {
    if (isGuest && !isAuthenticated) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [challengeRes, streakRes] = await Promise.all([
        api.get('/challenges/daily'),
        api.get('/challenges/streak'),
      ]);

      const challengeData: ChallengeData = challengeRes.data.challenge || challengeRes.data;
      setChallenge(challengeData);

      // Film development entrance animation for the photo
      photoOverlayOpacity.setValue(1);
      Animated.timing(photoOverlayOpacity, {
        toValue: 0,
        duration: 1000,
        delay: 300,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      const streak = streakRes.data.streak || streakRes.data;
      setStreakData(streak);
      setBadges(streakRes.data.badges || []);

      const answered = !!challengeData.user_answer;
      setChallengeCompleted(answered);

      try {
        const historyRes = await api.get('/challenges/history?limit=5');
        setHistory(historyRes.data.challenges || []);
      } catch {
        // optional
      }

      const stored = await AsyncStorage.getItem('celebratedMilestones');
      if (stored) setCelebratedMilestones(JSON.parse(stored));
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
    setCountdown({
      hours: Math.floor(remaining / (1000 * 60 * 60)),
      minutes: Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((remaining % (1000 * 60)) / 1000),
    });
  }, [fetchChallengeData]);

  const formatCountdown = (time: { hours: number; minutes: number; seconds: number }): string => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(time.hours)}:${pad(time.minutes)}:${pad(time.seconds)}`;
  };

  // ============================================
  // SUBMIT ANSWER
  // ============================================

  const handleAnswer = async (answer: string): Promise<void> => {
    if (isSubmitting) return;
    hapticSelection();
    setIsSubmitting(true);

    try {
      const res = await api.post('/challenges/submit', { answer });
      const updated: ChallengeData = res.data.challenge || res.data;

      setChallenge(updated);
      setChallengeCompleted(true);

      if (updated.is_correct) hapticSuccess();
      else hapticError();

      Animated.spring(resultAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
      }).start();

      const streakRes = await api.get('/challenges/streak');
      const newStreak = streakRes.data.streak || streakRes.data;
      const newCount = newStreak.current_streak || 0;
      setStreakData(newStreak);
      setBadges(streakRes.data.badges || []);

      const milestone = STREAK_BADGES.find(
        (b) => b.milestone === newCount && !celebratedMilestones.includes(b.id)
      );
      if (milestone) {
        setCurrentMilestone(milestone);
        setShowMilestone(true);
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 8 }).start();
        const updated2 = [...celebratedMilestones, milestone.id];
        setCelebratedMilestones(updated2);
        await AsyncStorage.setItem('celebratedMilestones', JSON.stringify(updated2));
      }

      try {
        const historyRes = await api.get('/challenges/history?limit=5');
        setHistory(historyRes.data.challenges || []);
      } catch { }
    } catch (err) {
      console.error('Failed to submit answer:', err);
      hapticError();
    } finally {
      setIsSubmitting(false);
    }
  };

  const dismissMilestone = (): void => {
    hapticSelection();
    Animated.timing(scaleAnim, { toValue: 0, duration: 200, useNativeDriver: true, easing: Easing.ease }).start(() => {
      setShowMilestone(false);
      setCurrentMilestone(null);
    });
  };

  const isBadgeUnlocked = (badge: StreakBadge, streak: number) => streak >= badge.milestone;
  const getBadgeProgress = (badge: StreakBadge, streak: number) => ({
    current: Math.min(streak, badge.milestone),
    target: badge.milestone,
    percentage: Math.min((streak / badge.milestone) * 100, 100),
  });
  const getNextBadge = (streak: number) => STREAK_BADGES.find((b) => streak < b.milestone);

  const handleRetry = () => { hapticSelection(); fetchChallengeData(); };

  const handleChallengeShare = async () => {
    if (!challenge || !challengeCompleted) return;
    setChallengeSharing(true);
    hapticSelection();
    try {
      const text = generateShareText(challenge, streak);
      await Share.share({ message: text });
      hapticSuccess();
    } catch { } finally {
      setChallengeSharing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshError(null);
    if (!isOnline) {
      setRefreshError('No internet connection.');
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
        const challengeData: ChallengeData = result.data.challengeRes.data.challenge || result.data.challengeRes.data;
        setChallenge(challengeData);
        setChallengeCompleted(!!challengeData.user_answer);
        const streak = result.data.streakRes.data.streak || result.data.streakRes.data;
        setStreakData(streak);
        setBadges(result.data.streakRes.data.badges || []);
        try {
          const historyRes = await api.get('/challenges/history?limit=5');
          setHistory(historyRes.data.challenges || []);
        } catch { }
        setRetryCount(0);
        hapticSuccess();
      } else {
        setRetryCount((p) => p + 1);
        setRefreshError('Failed to load. Pull down to retry.');
        hapticError();
      }
    } catch {
      setRetryCount((p) => p + 1);
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

  useEffect(() => { fetchChallengeData(); }, [fetchChallengeData]);

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
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        ])
      ).start();
    }
  }, [streakData, pulseAnim]);

  useEffect(() => {
    if (refreshError && retryCount < 3) {
      const t = setTimeout(() => setRefreshError(null), 3000);
      return () => clearTimeout(t);
    }
  }, [refreshError, retryCount]);

  // ============================================
  // LOADING / ERROR / GUEST STATES
  // ============================================

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
        <ChallengeSkeleton />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
        <ErrorState icon="help-circle-outline" title="Challenge Unavailable" message="We couldn't load today's challenge" retryText="Try Again" onRetry={handleRetry} />
      </SafeAreaView>
    );
  }

  if (isGuest && !isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="lock-closed-outline" size={64} color="#6366f1" />
          <Text className="text-xl font-bold text-white mt-6">Sign In Required</Text>
          <Text className="text-gray-500 text-center mt-2">Create an account to access daily challenges and earn badges</Text>
          <Pressable onPress={() => router.push('/(auth)/register')} className="rounded-2xl px-8 py-4 mt-8" style={{ backgroundColor: '#ec4899' }}>
            <Text className="text-white font-bold text-lg">Sign Up Free</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const streak = streakData?.current_streak || 0;
  const nextBadge = getNextBadge(streak);
  const options: string[] = Array.isArray(challenge?.options) ? challenge!.options : [];

  // ============================================
  // RENDER
  // ============================================

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
      <ScrollView
        className="flex-1 px-6 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ec4899" />}
      >
        {/* Offline Banner */}
        {!isOnline && (
          <View className="bg-red-900/50 border border-red-700 rounded-xl mt-2 mb-2 p-3 flex-row items-center gap-2">
            <Ionicons name="cloud-offline" size={20} color="#f87171" />
            <Text className="text-red-400 text-sm flex-1">You're offline. Challenges require internet.</Text>
          </View>
        )}

        {/* Refresh Error */}
        {refreshError && (
          <ReanimatedAnimated.View entering={FadeIn.duration(300)} exiting={FadeOut.duration(300)} className="bg-red-900/30 border border-red-800 rounded-xl p-3 mb-2 mt-2">
            <Text className="text-red-400 text-sm text-center">Failed to load challenge. Pull down to try again.</Text>
          </ReanimatedAnimated.View>
        )}

        {/* Manual Retry */}
        {retryCount >= 3 && refreshError && (
          <Pressable onPress={handleManualRetry} className="bg-purple-600 rounded-xl py-3 px-6 mt-2 mb-2 flex-row items-center justify-center gap-2 active:opacity-80">
            {isRetrying ? <ActivityIndicator color="#fff" size="small" /> : (
              <><Ionicons name="refresh" size={18} color="#fff" /><Text className="text-white font-semibold">Retry Now</Text></>
            )}
          </Pressable>
        )}

        {/* Header */}
        <View className="flex-row items-center justify-between mb-2">
          <Text className="text-2xl font-bold text-white">Daily Challenge</Text>
          <View className="flex-row items-center gap-2">
            {history.length > 0 && (
              <View className="bg-green-500/20 px-2 py-1 rounded-full">
                <Text className="text-green-400 text-xs font-semibold">
                  {Math.round((history.filter(h => h.is_correct).length / history.length) * 100)}% acc
                </Text>
              </View>
            )}
            <View className="bg-pink-500/20 px-3 py-1 rounded-full flex-row items-center gap-1">
              <Ionicons name="flame" size={16} color="#ec4899" />
              <Text className="text-pink-400 font-semibold">{streak}</Text>
            </View>
          </View>
        </View>
        <Text className="text-gray-400 text-sm mb-5">
          {challengeCompleted ? "Come back tomorrow for a new photo 📅" : "Guess the decade — build your streak"}
        </Text>

        {/* Countdown (after answering) */}
        {challengeCompleted && (
          <View className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-4">
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-2">
                <Ionicons name="timer" size={16} color="#f472b6" />
                <Text className="text-gray-400 text-sm">Next challenge in</Text>
              </View>
              <Text className="text-xl font-bold text-pink-400 tracking-wider" style={{ fontVariant: ['tabular-nums'] }}>
                {formatCountdown(countdown)}
              </Text>
            </View>
            {/* 7-day performance grid */}
            {history.length > 0 && (
              <View className="mt-1">
                <Text className="text-gray-500 text-xs mb-2">Last 7 days</Text>
                <View className="flex-row gap-1.5">
                  {Array.from({ length: 7 }, (_, i) => {
                    const dayHistory = history[i];
                    return (
                      <View
                        key={i}
                        className="flex-1 h-6 rounded-md items-center justify-center"
                        style={{
                          backgroundColor: !dayHistory
                            ? 'rgba(55,65,81,0.5)'
                            : dayHistory.is_correct
                            ? 'rgba(16,185,129,0.7)'
                            : 'rgba(239,68,68,0.6)',
                        }}
                      >
                        {dayHistory && (
                          <Ionicons
                            name={dayHistory.is_correct ? 'checkmark' : 'close'}
                            size={12}
                            color="#fff"
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ─── PHOTO CHALLENGE CARD ─── */}
        <Pressable
          onPress={() => challenge?.photo_url && !challengeCompleted && setPhotoZoomVisible(true)}
          className="rounded-3xl overflow-hidden mb-4 border border-purple-500/30"
          style={{ shadowColor: '#a855f7', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 }}
        >
          {challenge?.photo_url ? (
            <View>
              <Image
                source={{ uri: challenge.photo_url }}
                style={{ width: '100%', height: 280 }}
                resizeMode="cover"
              />
              {/* Film development overlay — fades out on load */}
              <Animated.View
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#1a1610', opacity: photoOverlayOpacity }}
                pointerEvents="none"
              />
              {/* Vignette edges */}
              <View
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                pointerEvents="none"
              >
                <LinearGradient
                  colors={['rgba(13,11,8,0.6)', 'transparent', 'transparent', 'rgba(13,11,8,0.6)']}
                  locations={[0, 0.2, 0.8, 1]}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
              </View>
              {!challengeCompleted && (
                <View
                  className="absolute top-3 right-3 rounded-full px-2 py-1 flex-row items-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.6)', gap: 4 }}
                >
                  <Ionicons name="expand-outline" size={12} color="#d1d5db" />
                  <Text style={{ color: '#d1d5db', fontSize: 11 }}>Zoom</Text>
                </View>
              )}
            </View>
          ) : (
            <View className="w-full h-64 bg-gray-800 items-center justify-center">
              <Ionicons name="image-outline" size={48} color="#4b5563" />
            </View>
          )}
          <LinearGradient
            colors={['rgba(88,28,135,0.9)', 'rgba(131,24,67,0.9)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="px-4 py-3"
          >
            <Text className="text-white text-base font-bold text-center">
              📅 Which decade is this photo from?
            </Text>
            {!challengeCompleted && (
              <Text className="text-purple-300 text-xs text-center mt-1 opacity-80">
                Tap photo to zoom in and investigate
              </Text>
            )}
          </LinearGradient>
        </Pressable>

        {/* ─── DECADE OPTIONS ─── */}
        {!challengeCompleted && (
          <View className="flex-row flex-wrap gap-3 mb-5">
            {options.map((option) => {
              const colors = getDecadeColors(option);
              return (
                <Pressable
                  key={option}
                  onPress={() => handleAnswer(option)}
                  disabled={isSubmitting}
                  className="active:scale-95"
                  style={{ width: '47%' }}
                >
                  <LinearGradient
                    colors={isSubmitting ? ['#1f2937', '#111827'] : colors.bg}
                    className="rounded-2xl py-5 items-center"
                    style={{ borderWidth: 1.5, borderColor: isSubmitting ? '#374151' : colors.border }}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#a855f7" />
                    ) : (
                      <>
                        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: 0.5 }}>
                          {option}
                        </Text>
                        <Text style={{ color: colors.text, fontSize: 11, opacity: 0.6, marginTop: 2 }}>
                          {parseInt(option)}–{parseInt(option) + 9}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ─── RESULT REVEAL ─── */}
        {challengeCompleted && challenge?.user_answer && (
          <Animated.View
            style={{ opacity: resultAnim, transform: [{ scale: resultAnim }] }}
            className="rounded-3xl overflow-hidden mb-5"
          >
            <LinearGradient
              colors={challenge.is_correct
                ? ['rgba(6,78,59,0.95)', 'rgba(4,108,78,0.85)']
                : ['rgba(127,29,29,0.95)', 'rgba(153,27,27,0.85)']}
              className={`p-5 border ${challenge.is_correct ? 'border-green-500/50' : 'border-red-500/40'}`}
              style={{ borderWidth: 1 }}
            >
              {/* Result header */}
              <View className="flex-row items-center gap-3 mb-4">
                <View
                  className="rounded-2xl w-14 h-14 items-center justify-center"
                  style={{ backgroundColor: challenge.is_correct ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)' }}
                >
                  <Ionicons
                    name={challenge.is_correct ? 'checkmark' : 'close'}
                    size={32}
                    color={challenge.is_correct ? '#10b981' : '#ef4444'}
                  />
                </View>
                <View className="flex-1">
                  <Text className={`text-xl font-black ${challenge.is_correct ? 'text-green-300' : 'text-red-300'}`}>
                    {challenge.is_correct ? 'Nailed it! 🎯' : 'Close but no cigar'}
                  </Text>
                  <Text className="text-white text-base font-bold mt-0.5">
                    Photo was from: {challenge.correct_decade}
                  </Text>
                </View>
              </View>

              {/* Fun fact */}
              {challenge.fun_fact ? (
                <View
                  className="rounded-2xl p-4 mb-4"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  <View className="flex-row items-center gap-2 mb-2">
                    <Ionicons name="bulb" size={16} color="#fbbf24" />
                    <Text className="text-yellow-300 text-xs font-semibold uppercase tracking-wider">Fun Fact</Text>
                  </View>
                  <Text className="text-gray-100 text-sm leading-6">
                    {challenge.fun_fact}
                  </Text>
                </View>
              ) : null}

              {/* Proximity feedback for wrong answers */}
              {!challenge.is_correct && challenge.user_answer && challenge.correct_decade && (
                <View
                  className="rounded-xl px-4 py-2 mb-3 flex-row items-center justify-center gap-2"
                  style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                >
                  <Ionicons name="navigate" size={14} color="#fbbf24" />
                  <Text className="text-yellow-300 text-sm font-medium">
                    {getProximityLabel(getDecadeDistance(challenge.user_answer, challenge.correct_decade))}
                  </Text>
                  <Text className="text-gray-500 text-xs">
                    (You: {challenge.user_answer})
                  </Text>
                </View>
              )}

              {/* Share button */}
              <Pressable
                onPress={handleChallengeShare}
                disabled={challengeSharing}
                className="flex-row items-center justify-center gap-2 rounded-xl py-3"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
              >
                {challengeSharing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="share-social" size={18} color="#fff" />
                    <Text className="text-white font-semibold text-sm">Share Today's Result</Text>
                  </>
                )}
              </Pressable>
            </LinearGradient>
          </Animated.View>
        )}

        {/* ─── BADGES ─── */}
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
                className={`w-[48%] bg-gray-900 rounded-2xl p-4 border ${unlocked ? 'border-purple-500/30' : isNext ? 'border-pink-500/50' : 'border-gray-800'} ${!unlocked ? 'opacity-50' : ''}`}
              >
                <View className="flex-row items-center gap-3">
                  <View className="relative">
                    <Text className="text-4xl" style={unlocked ? {} : { opacity: 0.35 }}>{badge.emoji}</Text>
                    {!unlocked && (
                      <View className="absolute inset-0 items-center justify-center">
                        <Ionicons name="lock-closed" size={14} color="#9ca3af" />
                      </View>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold text-sm">{badge.name}</Text>
                    <Text className="text-gray-400 text-xs" numberOfLines={1}>{badge.description}</Text>
                  </View>
                </View>
                <View className="bg-gray-800 rounded-full h-2 mt-3 overflow-hidden">
                  <View className="rounded-full h-2" style={{ width: `${progress.percentage}%`, backgroundColor: badge.color }} />
                </View>
                <Text className="text-gray-500 text-xs mt-1">{progress.current}/{progress.target} days</Text>
              </Animated.View>
            );
          })}
        </View>

        {/* ─── HISTORY ─── */}
        {history.length > 0 && (
          <>
            <Text className="text-lg font-bold text-white mb-4">Challenge History</Text>
            {history.map((item) => {
              const dateStr = item.challenge_date || '';
              const formattedDate = dateStr
                ? new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : '';
              return (
                <View key={item.id} className="bg-gray-900 rounded-2xl p-4 mb-3 border border-gray-800 flex-row items-center gap-3">
                  {item.photo_url ? (
                    <Image source={{ uri: item.photo_url }} style={{ width: 56, height: 56, borderRadius: 10 }} resizeMode="cover" />
                  ) : (
                    <View className="w-14 h-14 rounded-xl bg-gray-800 items-center justify-center">
                      <Ionicons name="image-outline" size={24} color="#4b5563" />
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-gray-400 text-xs mb-1">{formattedDate}</Text>
                    <Text className="text-white font-semibold text-sm">
                      {item.correct_decade || '—'}
                      {item.is_correct != null && (
                        <Text className={item.is_correct ? ' text-green-400' : ' text-red-400'}>
                          {item.is_correct ? ' ✓' : ' ✗'}
                        </Text>
                      )}
                    </Text>
                    {item.user_answer && (
                      <Text className="text-gray-500 text-xs">Your answer: {item.user_answer}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View className="h-6" />
      </ScrollView>

      {/* ─── PHOTO ZOOM MODAL ─── */}
      <Modal visible={photoZoomVisible} transparent animationType="fade" statusBarTranslucent>
        <Pressable
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.95)' }}
          onPress={() => setPhotoZoomVisible(false)}
        >
          <Pressable onPress={() => {}} style={{ width: SCREEN_WIDTH - 24 }}>
            {challenge?.photo_url && (
              <Image
                source={{ uri: challenge.photo_url }}
                style={{ width: SCREEN_WIDTH - 24, height: SCREEN_WIDTH - 24, borderRadius: 16 }}
                resizeMode="contain"
              />
            )}
          </Pressable>
          <Text className="text-gray-500 text-sm mt-4">Tap anywhere to close</Text>
        </Pressable>
      </Modal>

      {/* ─── MILESTONE MODAL ─── */}
      <Modal visible={showMilestone} transparent animationType="fade" statusBarTranslucent>
        <View className="flex-1 bg-black/70 items-center justify-center p-6">
          <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: scaleAnim }} className="w-full max-w-sm">
            <LinearGradient colors={['#831843', '#581c87', '#1e1b4b']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="rounded-3xl p-1">
              <View className="bg-gray-900 rounded-3xl p-8 items-center">
                <Text className="text-6xl mb-4">{currentMilestone?.emoji}</Text>
                <Text className="text-2xl font-bold text-white mb-2 text-center">Achievement Unlocked!</Text>
                <Text className="text-pink-400 font-semibold text-lg mb-2">{currentMilestone?.name}</Text>
                <Text className="text-gray-400 text-center mb-6">{currentMilestone?.description}</Text>
                <Pressable onPress={dismissMilestone} className="w-full">
                  <LinearGradient colors={['#ec4899', '#a855f7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="rounded-2xl px-8 py-4">
                    <Text className="text-white font-bold text-center text-lg">Continue</Text>
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
