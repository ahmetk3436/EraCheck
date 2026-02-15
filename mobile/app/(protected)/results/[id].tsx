import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Share,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  Easing,
  FadeInUp,
} from 'react-native-reanimated';
import { GlassCard } from '../../../components/GlassCard';
import { useHaptics } from '../../../hooks/useHaptics';
import api from '../../../lib/api';
import Skeleton from '../../../components/Skeleton';
import ErrorState from '../../../components/ErrorState';

// Types
interface EraScore {
  era: string;
  score: number;
  color: string;
}

interface EraResult {
  id: string;
  era: string;
  era_title: string;
  era_emoji: string;
  era_color: string;
  era_description: string;
  music_taste: string;
  style_traits: string;
  scores: Record<string, number>;
  share_count: number;
  created_at: string;
}

interface EraStats {
  total_shares: number;
  current_streak: number;
  longest_streak: number;
  quizzes_taken: number;
  favorite_era: string;
  favorite_era_profile?: {
    key: string;
    title: string;
    emoji: string;
    color: string;
    description: string;
    music_taste: string;
    style_traits: string;
  };
}

const eraDisplayNames: Record<string, { name: string; emoji: string; color: string }> = {
  y2k: { name: 'Y2K Baby', emoji: '\u{1F496}', color: '#FF69B4' },
  '2016_tumblr': { name: 'Tumblr Girl', emoji: '\u{1F319}', color: '#6366F1' },
  '2018_vsco': { name: 'VSCO Girl', emoji: '\u270C\uFE0F', color: '#06B6D4' },
  '2020_cottagecore': { name: 'Cottagecore', emoji: '\u{1F33F}', color: '#22C55E' },
  dark_academia: { name: 'Dark Academia', emoji: '\u{1F4DA}', color: '#92400E' },
  indie_sleaze: { name: 'Indie Sleaze', emoji: '\u{1F3B8}', color: '#A855F7' },
  '2022_clean_girl': { name: 'Clean Girl', emoji: '\u2728', color: '#F472B6' },
  '2024_mob_wife': { name: 'Mob Wife', emoji: '\u{1F48B}', color: '#DC2626' },
  coastal_cowgirl: { name: 'Coastal Cowgirl', emoji: '\u{1F920}', color: '#F59E0B' },
  '2025_demure': { name: 'Demure Queen', emoji: '\u{1F92B}', color: '#EC4899' },
};

// Skeleton for loading state
const ResultSkeleton: React.FC = () => (
  <View className="flex-1">
    <View className="items-center py-8 px-6">
      <Skeleton className="w-28 h-28 rounded-full" />
      <Skeleton className="w-48 h-8 mt-4" />
      <Skeleton className="w-32 h-5 mt-2" />
    </View>
    <View className="px-6 mt-4">
      <Skeleton className="w-40 h-6 mb-4" />
      {[1, 2, 3, 4].map((i) => (
        <View key={i} className="mb-4">
          <Skeleton className="w-full h-3 rounded-full" />
        </View>
      ))}
    </View>
    <View className="px-6 mt-6">
      <Skeleton className="w-full h-32 rounded-2xl mb-4" />
      <Skeleton className="w-full h-32 rounded-2xl" />
    </View>
    <View className="px-6 mt-8">
      <Skeleton className="w-full h-14 rounded-2xl mb-3" />
      <Skeleton className="w-full h-14 rounded-2xl" />
    </View>
  </View>
);

// Animated Score Bar Component
const AnimatedScoreBar: React.FC<{
  era: string;
  score: number;
  color: string;
  index: number;
}> = ({ era, score, color, index }) => {
  const widthProgress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    widthProgress.value = withDelay(
      index * 150,
      withTiming(score, { duration: 800, easing: Easing.out(Easing.cubic) })
    );
    opacity.value = withDelay(
      index * 150 + 200,
      withTiming(1, { duration: 400 })
    );
  }, []);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${widthProgress.value}%`,
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View className="mb-4">
      <View className="flex-row justify-between mb-1.5">
        <Text className="text-sm text-gray-300">{era}</Text>
        <Animated.Text
          className="text-sm font-semibold text-white"
          style={animatedTextStyle}
        >
          {Math.round(score)}%
        </Animated.Text>
      </View>
      <View className="h-3 bg-gray-800 rounded-full overflow-hidden">
        <Animated.View
          className="h-full rounded-full"
          style={[animatedBarStyle, { backgroundColor: color }]}
        />
      </View>
    </View>
  );
};

// Animated Emoji Component
const AnimatedEmoji: React.FC<{ emoji: string }> = ({ emoji }) => {
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withSpring(1.2, { damping: 8, stiffness: 200 }),
      withSpring(1.0, { damping: 12, stiffness: 150 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.Text className="text-7xl" style={animatedStyle}>
      {emoji}
    </Animated.Text>
  );
};

// Animated Title Component
const AnimatedTitle: React.FC<{
  title: string;
  subtitle: string;
  delay: number;
}> = ({ title, subtitle, delay }) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 500 }));
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={animatedStyle} className="items-center mt-4">
      <Text className="text-3xl font-bold text-white text-center">{title}</Text>
      <Text className="text-base text-gray-400 text-center mt-1">{subtitle}</Text>
    </Animated.View>
  );
};

// Comparison Bar Component
const ComparisonBar: React.FC<{
  era: string;
  percentage: number;
  isUserEra: boolean;
  index: number;
}> = ({ era, percentage, isUserEra, index }) => {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(
      800 + index * 100,
      withTiming(percentage, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <View className="mb-2">
      <View className="flex-row justify-between mb-1">
        <Text className={`text-xs ${isUserEra ? 'text-violet-400 font-semibold' : 'text-gray-400'}`}>
          {era}
        </Text>
        <Text className="text-xs text-gray-500">{percentage}%</Text>
      </View>
      <View className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <Animated.View
          className="h-full rounded-full"
          style={[
            animatedStyle,
            { backgroundColor: isUserEra ? '#8B5CF6' : '#4B5563' },
          ]}
        />
      </View>
    </View>
  );
};

// Main Results Screen
export default function ResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { hapticSuccess, hapticError, hapticSelection } = useHaptics();

  const [result, setResult] = useState<EraResult | null>(null);
  const [stats, setStats] = useState<EraStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareCount, setShareCount] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [showSharePrompt, setShowSharePrompt] = useState(false);

  const fetchResult = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data } = await api.get(`/era/results/${id}`);
      // Extract result from envelope: {error, data: {result, profile}}
      const envelope = data.data || data;
      const resultData = envelope.result || envelope;
      setResult(resultData);
      setShareCount(resultData.share_count || 0);

      // Fetch stats in parallel
      try {
        const statsResponse = await api.get('/era/stats');
        const statsData = statsResponse.data.stats || statsResponse.data;
        setStats(statsData);
      } catch {
        // Stats are optional, don't fail the whole screen
      }

      hapticSuccess();
    } catch (err: any) {
      console.error('Failed to load result:', err);
      if (err.response?.status === 404) {
        setError('Result not found');
      } else {
        setError('Failed to load result');
      }
      hapticError();
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchResult();
  }, [fetchResult]);

  // Auto-show share prompt 2 seconds after result loads
  useEffect(() => {
    if (!isLoading && result && !showSharePrompt) {
      const checkAndShow = async () => {
        const dismissed = await AsyncStorage.getItem('share_prompt_dismissed_session');
        if (!dismissed) {
          const timer = setTimeout(() => {
            setShowSharePrompt(true);
          }, 2000);
          return () => clearTimeout(timer);
        }
      };
      checkAndShow();
    }
  }, [isLoading, result]);

  const handleDismissSharePrompt = async () => {
    hapticSelection();
    setShowSharePrompt(false);
    await AsyncStorage.setItem('share_prompt_dismissed_session', 'true');
  };

  const handleShare = async () => {
    if (!result) return;

    hapticSelection();
    setSharing(true);

    try {
      await api.post(`/era/results/${id}/share`);

      const musicTraits = result.music_taste
        ? result.music_taste.split(',').map(t => t.trim()).filter(Boolean)
        : [];
      const styleTraits = result.style_traits
        ? result.style_traits.split(',').map(t => t.trim()).filter(Boolean)
        : [];

      const shareMessage = `I'm in my ${result.era_title} Era! ${result.era_emoji}\n\n` +
        (musicTraits.length > 0 ? `Music Taste: ${musicTraits.join(', ')}\n` : '') +
        (styleTraits.length > 0 ? `Style: ${styleTraits.join(', ')}\n` : '') +
        `\nFind your era at EraCheck!`;

      const shareResult = await Share.share({ message: shareMessage });

      if (shareResult.action === Share.sharedAction) {
        const newCount = shareCount + 1;
        setShareCount(newCount);
        hapticSuccess();
      }

      setShowSharePrompt(false);
      fetchResult();
    } catch (err) {
      console.error('Failed to share:', err);
      hapticError();
    } finally {
      setSharing(false);
    }
  };

  const handleRetake = () => {
    hapticSelection();
    router.push('/(protected)/quiz');
  };

  const handleViewHistory = () => {
    hapticSelection();
    router.push('/(protected)/(tabs)/history');
  };

  const handleGoBack = () => {
    hapticSelection();
    router.back();
  };

  // Convert scores object to sorted array with display info
  const getFilteredScores = (scores: Record<string, number>): EraScore[] => {
    const entries = Object.entries(scores);
    // Calculate max score for percentage normalization
    const maxScore = Math.max(...entries.map(([, v]) => v), 1);

    return entries
      .map(([era, score]) => {
        const display = eraDisplayNames[era];
        const percentage = Math.round((score / maxScore) * 100);
        return {
          era: display ? `${display.emoji} ${display.name}` : era,
          score: percentage,
          color: display?.color || '#4B5563',
        };
      })
      .filter(s => s.score >= 5)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  };

  // Build comparison data from score breakdown (simulated distribution)
  const getComparisonData = (scores: Record<string, number>) => {
    const entries = Object.entries(scores);
    const total = entries.reduce((sum, [, v]) => sum + v, 0) || 1;

    return entries
      .map(([era, score]) => {
        const display = eraDisplayNames[era];
        return {
          era: display?.name || era,
          percentage: Math.round((score / total) * 100),
        };
      })
      .sort((a, b) => b.percentage - a.percentage)
      .slice(0, 5);
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#0F0F1A]">
        <ResultSkeleton />
      </SafeAreaView>
    );
  }

  if (error || !result) {
    return (
      <SafeAreaView className="flex-1 bg-[#0F0F1A] items-center justify-center px-6">
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text className="text-white text-lg font-semibold mt-4">Oops!</Text>
        <Text className="text-gray-400 text-center mt-2">
          {error || 'Result not found'}
        </Text>
        <Pressable
          onPress={handleGoBack}
          className="mt-6 rounded-xl px-6 py-3 active:opacity-70"
          style={{ backgroundColor: '#8B5CF6' }}
        >
          <Text className="text-white font-semibold">Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const filteredScores = result.scores ? getFilteredScores(result.scores) : [];
  const comparisonData = result.scores ? getComparisonData(result.scores) : [];
  const topPercentage = comparisonData.length > 0 ? comparisonData[0].percentage : 0;

  // Parse traits from comma-separated strings
  const musicTraits = result.music_taste
    ? result.music_taste.split(',').map(t => t.trim()).filter(Boolean)
    : [];
  const styleTraits = result.style_traits
    ? result.style_traits.split(',').map(t => t.trim()).filter(Boolean)
    : [];

  return (
    <SafeAreaView className="flex-1 bg-[#0F0F1A]">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Era Result Hero Card */}
        <Animated.View
          entering={FadeInUp.delay(100).duration(400)}
          className="items-center py-8 px-6 relative"
        >
          {/* Gradient Background */}
          <LinearGradient
            colors={[result.era_color || '#8B5CF6', 'transparent']}
            className="absolute inset-0 rounded-3xl"
            style={{ opacity: 0.2 }}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />

          {/* Emoji */}
          <View className="w-28 h-28 rounded-full items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
            <AnimatedEmoji emoji={result.era_emoji} />
          </View>

          {/* Title */}
          <AnimatedTitle
            title={`${result.era_title} Era`}
            subtitle={result.era_description}
            delay={300}
          />

          {/* Share Badge */}
          {shareCount > 0 && (
            <View className="flex-row items-center px-3 py-1.5 rounded-full mt-4" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <Ionicons name="share" size={14} color="white" />
              <Text className="text-sm text-white ml-1">
                Shared {shareCount} time{shareCount > 1 ? 's' : ''}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* Score Breakdown Section */}
        {filteredScores.length > 0 && (
          <View className="px-6 mt-2">
            <Text className="text-lg font-semibold text-white mb-4">
              Your Era Breakdown
            </Text>

            {filteredScores.map((score, index) => (
              <AnimatedScoreBar
                key={score.era}
                era={score.era}
                score={score.score}
                color={score.color}
                index={index}
              />
            ))}
          </View>
        )}

        {/* Comparison Section */}
        {comparisonData.length > 0 && (
          <Animated.View
            entering={FadeInUp.delay(600).duration(400)}
            className="px-6 mt-6"
          >
            <Text className="text-lg font-semibold text-white mb-2">
              How You Compare
            </Text>
            <Text className="text-sm text-gray-400 mb-4">
              Your top era is chosen by {topPercentage}% of users
            </Text>

            <GlassCard variant="glass" className="p-4">
              {comparisonData.map((item, index) => (
                <ComparisonBar
                  key={item.era}
                  era={item.era}
                  percentage={item.percentage}
                  isUserEra={item.era === result.era_title}
                  index={index}
                />
              ))}
            </GlassCard>
          </Animated.View>
        )}

        {/* Music Taste Section */}
        {musicTraits.length > 0 && (
          <Animated.View
            entering={FadeInUp.delay(800).duration(400)}
            className="px-6 mt-6"
          >
            <GlassCard variant="glass" className="p-5">
              <View className="flex-row items-center mb-3">
                <Ionicons name="musical-notes" size={20} color="#8B5CF6" />
                <Text className="text-base font-semibold text-white ml-2">
                  Music Taste
                </Text>
              </View>
              <View className="flex-row flex-wrap">
                {musicTraits.map((trait) => (
                  <View
                    key={trait}
                    className="px-3 py-1.5 rounded-full mr-2 mb-2"
                    style={{ backgroundColor: 'rgba(139,92,246,0.2)' }}
                  >
                    <Text className="text-sm" style={{ color: '#C4B5FD' }}>{trait}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Style Traits Section */}
        {styleTraits.length > 0 && (
          <Animated.View
            entering={FadeInUp.delay(1000).duration(400)}
            className="px-6 mt-4"
          >
            <GlassCard variant="glass" className="p-5">
              <View className="flex-row items-center mb-3">
                <Ionicons name="shirt" size={20} color="#EC4899" />
                <Text className="text-base font-semibold text-white ml-2">
                  Style Traits
                </Text>
              </View>
              <View className="flex-row flex-wrap">
                {styleTraits.map((trait) => (
                  <View
                    key={trait}
                    className="px-3 py-1.5 rounded-full mr-2 mb-2"
                    style={{ backgroundColor: 'rgba(236,72,153,0.2)' }}
                  >
                    <Text className="text-sm" style={{ color: '#F9A8D4' }}>{trait}</Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          </Animated.View>
        )}

        {/* Divider */}
        <View className="h-px bg-gray-800 mt-8 mx-6" />

        {/* Action Buttons */}
        <View className="px-6 mt-6">
          {/* Share Button */}
          <Pressable onPress={handleShare} disabled={sharing} className="active:opacity-80">
            <LinearGradient
              colors={['#EC4899', '#8B5CF6']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="flex-row items-center justify-center rounded-2xl py-4"
            >
              {sharing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Ionicons name="share-social" size={20} color="white" />
                  <Text className="text-base font-semibold text-white ml-2">
                    Share Your Era
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>

          {/* Retake Button */}
          <Pressable
            onPress={handleRetake}
            className="mt-3 flex-row items-center justify-center rounded-2xl py-4 active:opacity-70"
            style={{ borderWidth: 2, borderColor: '#8B5CF6' }}
          >
            <Ionicons name="refresh" size={20} color="#8B5CF6" />
            <Text className="text-base font-semibold ml-2" style={{ color: '#A78BFA' }}>
              Retake Quiz
            </Text>
          </Pressable>

          {/* History Button */}
          <Pressable
            onPress={handleViewHistory}
            className="mt-4 flex-row items-center justify-center py-3 active:opacity-70"
          >
            <Ionicons name="time" size={16} color="#9CA3AF" />
            <Text className="text-sm text-gray-400 ml-1">View History</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Auto-Show Share Prompt */}
      {showSharePrompt && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16 }}>
          <LinearGradient
            colors={['#EC4899', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ borderRadius: 16, padding: 16 }}
          >
            {/* Dismiss Button */}
            <Pressable
              onPress={handleDismissSharePrompt}
              style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center flex-1 mr-3">
                <Ionicons name="share-social" size={24} color="#fff" />
                <Text className="text-white font-semibold text-base ml-3">
                  Share your era with friends!
                </Text>
              </View>
              <Pressable
                onPress={handleShare}
                className="rounded-xl py-2 px-4"
                style={{ backgroundColor: '#fff' }}
              >
                <Text style={{ color: '#EC4899' }} className="font-semibold text-sm">
                  Share
                </Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      )}
    </SafeAreaView>
  );
}
