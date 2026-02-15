import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../../lib/api';
import { hapticSuccess, hapticError, hapticLight, hapticMedium, hapticSelection } from '../../../lib/haptics';
import Skeleton from '../../../components/Skeleton';
import ErrorState from '../../../components/ErrorState';

const eraDisplayNames: Record<string, { name: string; emoji: string }> = {
  y2k: { name: 'Y2K Baby', emoji: '\u{1F496}' },
  '2016_tumblr': { name: 'Tumblr Girl', emoji: '\u{1F319}' },
  '2018_vsco': { name: 'VSCO Girl', emoji: '\u270C\uFE0F' },
  '2020_cottagecore': { name: 'Cottagecore', emoji: '\u{1F33F}' },
  dark_academia: { name: 'Dark Academia', emoji: '\u{1F4DA}' },
  indie_sleaze: { name: 'Indie Sleaze', emoji: '\u{1F3B8}' },
  '2022_clean_girl': { name: 'Clean Girl', emoji: '\u2728' },
  '2024_mob_wife': { name: 'Mob Wife', emoji: '\u{1F48B}' },
  coastal_cowgirl: { name: 'Coastal Cowgirl', emoji: '\u{1F920}' },
  '2025_demure': { name: 'Demure Queen', emoji: '\u{1F92B}' },
};

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

const ResultSkeleton: React.FC = () => (
  <View className="flex-1">
    {/* Header skeleton */}
    <View className="px-6 py-4 flex-row items-center justify-between border-b border-gray-800">
      <Skeleton className="w-8 h-8 rounded-full" />
      <Skeleton className="w-24 h-5" />
      <Skeleton className="w-8 h-8 rounded-full" />
    </View>

    {/* Main card skeleton */}
    <View className="mx-6 mt-6">
      <Skeleton className="w-full h-56 rounded-3xl mb-6" />
    </View>

    {/* Description skeleton */}
    <View className="mx-6">
      <Skeleton className="w-48 h-6 mb-3" />
      <Skeleton className="w-full h-4 mb-2" />
      <Skeleton className="w-full h-4 mb-2" />
      <Skeleton className="w-2/3 h-4 mb-6" />
    </View>

    {/* Music / Style skeleton */}
    <View className="mx-6">
      <Skeleton className="w-full h-32 rounded-2xl mb-4" />
      <Skeleton className="w-full h-32 rounded-2xl mb-6" />
    </View>

    {/* Buttons skeleton */}
    <View className="mx-6">
      <Skeleton className="w-full h-14 rounded-xl mb-3" />
      <Skeleton className="w-full h-14 rounded-xl" />
    </View>
  </View>
);

const NotFoundState: React.FC<{ onGoBack: () => void }> = ({ onGoBack }) => (
  <View className="flex-1 items-center justify-center px-6">
    <View className="w-24 h-24 rounded-full bg-gray-800 items-center justify-center mb-6">
      <Ionicons name="search-outline" size={48} color="#6b7280" />
    </View>
    <Text className="text-white text-2xl font-bold text-center mb-2">
      Result Not Found
    </Text>
    <Text className="text-gray-400 text-base text-center mb-6">
      This result may have been deleted or doesn't exist
    </Text>
    <Pressable
      onPress={onGoBack}
      className="rounded-xl px-6 py-3 active:opacity-70"
      style={{ backgroundColor: '#a855f7' }}
    >
      <Text className="text-white font-semibold">Go Back</Text>
    </Pressable>
  </View>
);

export default function ResultsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [result, setResult] = useState<EraResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showSharePrompt, setShowSharePrompt] = useState(false);

  useEffect(() => {
    if (id) {
      loadResult();
    }
  }, [id]);

  // Auto-show share prompt 2 seconds after result loads
  useEffect(() => {
    if (!loading && result && !showSharePrompt) {
      const checkAndShow = async () => {
        const dismissed = await AsyncStorage.getItem('share_prompt_dismissed_session');
        if (!dismissed) {
          const timer = setTimeout(() => {
            setShowSharePrompt(true);
            hapticLight();
          }, 2000);
          return () => clearTimeout(timer);
        }
      };
      checkAndShow();
    }
  }, [loading, result]);

  const handleDismissSharePrompt = async () => {
    hapticSelection();
    setShowSharePrompt(false);
    await AsyncStorage.setItem('share_prompt_dismissed_session', 'true');
  };

  const loadResult = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setNotFound(false);

      const { data } = await api.get(`/era/results/${id}`);
      // Extract result from envelope: {error, data: {result, profile}}
      const envelope = data.data || data;
      const resultData = envelope.result || envelope;
      setResult(resultData);
      hapticSuccess();
    } catch (err: any) {
      console.error('Failed to load result:', err);
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        hapticError();
        setError('Failed to load result');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleRetry = () => {
    hapticSelection();
    loadResult();
  };

  const handleGoBack = () => {
    hapticSelection();
    router.back();
  };

  const handleShare = async () => {
    if (!result) return;

    setSharing(true);
    try {
      await api.post(`/era/results/${id}/share`);

      const message = `I got ${result.era_emoji} ${result.era_title}! Find your aesthetic era on EraCheck ✨`;

      await Share.share({
        message,
      });

      hapticSuccess();
      setShowSharePrompt(false);
      loadResult();
    } catch (err: any) {
      console.error('Failed to share:', err);
      hapticError();
    } finally {
      setSharing(false);
    }
  };

  const handleRetake = () => {
    // Medium haptic for major action
    hapticMedium();
    router.push('/(protected)/quiz');
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950">
        <ResultSkeleton />
      </SafeAreaView>
    );
  }

  if (notFound) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950">
        <NotFoundState onGoBack={handleGoBack} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950">
        <ErrorState
          icon="cloud-offline"
          title="Failed to Load"
          message="We couldn't load this result"
          retryText="Try Again"
          onRetry={handleRetry}
        />
      </SafeAreaView>
    );
  }

  if (!result) {
    return null;
  }

  // Convert scores object to sorted array
  const scoresArray = Object.entries(result.scores || {})
    .map(([era, score]) => ({ era, score: score as number }))
    .sort((a, b) => b.score - a.score);

  const getScoreBarWidth = (score: number): `${number}%` => {
    // If scores are raw counts, calculate as percentage of max
    const maxScore = scoresArray.length > 0 ? scoresArray[0].score : 1;
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const clamped = Math.min(Math.max(percentage, 5), 100);
    return `${clamped}%` as `${number}%`;
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center justify-between border-b border-gray-800">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-semibold text-white">Your Era</Text>
        <TouchableOpacity onPress={handleShare} disabled={sharing}>
          {sharing ? (
            <ActivityIndicator size="small" color="#ec4899" />
          ) : (
            <Ionicons name="share-outline" size={28} color="#ec4899" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {/* Main Era Card */}
        <View
          className="mx-6 mt-6 rounded-3xl p-8 items-center shadow-lg"
          style={{ backgroundColor: result.era_color }}
        >
          <Text style={{ fontSize: 80 }}>{result.era_emoji}</Text>
          <Text className="text-white text-3xl font-bold text-center mb-2 mt-2">
            {result.era_title}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.9)' }} className="text-sm">
            Shared {result.share_count} times
          </Text>
        </View>

        {/* Share Count */}
        {result.share_count > 0 && (
          <View className="self-center mt-4 rounded-full py-2 px-4" style={{ backgroundColor: 'rgba(168,85,247,0.15)' }}>
            <Text className="text-purple-400 font-medium text-sm">
              Shared {result.share_count} {result.share_count === 1 ? 'time' : 'times'}
            </Text>
          </View>
        )}

        {/* Description */}
        <View className="mx-6 mt-6">
          <Text className="text-xl font-bold text-white mb-3">
            About Your Era
          </Text>
          <Text className="text-gray-300 text-base leading-6">
            {result.era_description}
          </Text>
        </View>

        {/* Music Taste */}
        {result.music_taste ? (
          <View className="mx-6 mt-6 rounded-2xl p-5" style={{ backgroundColor: '#1e293b' }}>
            <View className="flex-row items-center mb-3">
              <Ionicons name="musical-notes" size={24} color="#ec4899" />
              <Text className="text-xl font-bold text-white ml-2">
                Music Taste
              </Text>
            </View>
            <Text className="text-gray-300 text-base leading-6">
              {result.music_taste}
            </Text>
          </View>
        ) : null}

        {/* Style Traits */}
        {result.style_traits ? (
          <View className="mx-6 mt-4 rounded-2xl p-5" style={{ backgroundColor: '#1a1625' }}>
            <View className="flex-row items-center mb-3">
              <Ionicons name="shirt" size={24} color="#a855f7" />
              <Text className="text-xl font-bold text-white ml-2">
                Style Traits
              </Text>
            </View>
            <Text className="text-gray-300 text-base leading-6">
              {result.style_traits}
            </Text>
          </View>
        ) : null}

        {/* Era Scores */}
        {scoresArray.length > 0 && (
          <View className="mx-6 mt-6">
            <Text className="text-xl font-bold text-white mb-4">
              Your Era Breakdown
            </Text>
            <View>
              {scoresArray.map((item, index) => {
                const display = eraDisplayNames[item.era];
                return (
                  <View key={item.era} className="mb-4">
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-white font-semibold">
                        {display ? `${display.emoji} ${display.name}` : item.era}
                      </Text>
                      <Text className="text-gray-400 font-medium">
                        {Math.round(item.score)}
                      </Text>
                    </View>
                    <View className="h-3 bg-gray-800 rounded-full overflow-hidden">
                      <View
                        className="h-full rounded-full"
                        style={{
                          width: getScoreBarWidth(item.score),
                          backgroundColor:
                            index === 0
                              ? '#ec4899'
                              : index === 1
                              ? '#a855f7'
                              : index === 2
                              ? '#d946ef'
                              : '#4b5563',
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Actions */}
        <View className="mx-6 mt-8 mb-8">
          <TouchableOpacity
            onPress={handleShare}
            disabled={sharing}
            className="rounded-xl py-4 items-center flex-row justify-center mb-3"
            style={{ backgroundColor: '#ec4899' }}
          >
            <Ionicons name="share-social" size={24} color="#fff" />
            <Text className="text-white font-semibold text-lg ml-2">
              Share Your Era
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRetake}
            className="bg-gray-800 rounded-xl py-4 items-center mb-3"
          >
            <Text className="text-white font-semibold text-lg">
              Retake Quiz
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/(protected)/(tabs)/history')}
            className="rounded-xl py-4 items-center mb-4"
          >
            <Text className="font-semibold text-lg" style={{ color: '#ec4899' }}>
              View All Results
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Auto-Show Share Prompt */}
      {showSharePrompt && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16 }}>
          <LinearGradient
            colors={['#ec4899', '#a855f7']}
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
                <Text style={{ color: '#ec4899' }} className="font-semibold text-sm">
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
