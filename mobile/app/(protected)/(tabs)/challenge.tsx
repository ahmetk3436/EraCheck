import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../lib/api';
import { hapticSuccess, hapticError, hapticLight, hapticMedium, hapticSelection } from '../../../lib/haptics';
import Skeleton from '../../../components/Skeleton';
import ErrorState from '../../../components/ErrorState';

interface DailyChallenge {
  id: string;
  prompt: string;
  challenge_date: string;
  response: string;
  era: string;
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

const ChallengeSkeleton: React.FC = () => (
  <View className="p-6">
    {/* Header skeleton */}
    <View className="mb-6">
      <Skeleton className="w-48 h-8 mb-2" />
      <Skeleton className="w-40 h-5" />
    </View>

    {/* Streak card skeleton */}
    <Skeleton className="w-full h-20 rounded-2xl mb-6" />

    {/* Badges skeleton */}
    <View className="flex-row mb-6">
      {[1, 2, 3, 4].map((i) => (
        <View key={i} className="items-center mr-4">
          <Skeleton className="w-14 h-14 rounded-full mb-1" />
          <Skeleton className="w-10 h-3" />
        </View>
      ))}
    </View>

    {/* Challenge card skeleton */}
    <View className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
      <Skeleton className="w-full h-6 mb-4" />
      <Skeleton className="w-3/4 h-6 mb-2" />
      <Skeleton className="w-1/2 h-6" />
    </View>

    {/* Response input skeleton */}
    <Skeleton className="w-full h-32 rounded-xl mb-4" />

    {/* Submit button skeleton */}
    <Skeleton className="w-full h-14 rounded-xl" />
  </View>
);

export default function ChallengeScreen() {
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [challengeRes, streakRes] = await Promise.all([
        api.get('/challenges/daily'),
        api.get('/challenges/streak'),
      ]);

      // Extract from envelopes
      const challengeData = challengeRes.data.challenge || challengeRes.data;
      setChallenge(challengeData);

      const streakData = streakRes.data.streak || streakRes.data;
      setStreak(streakData);
      setBadges(streakRes.data.badges || []);

      if (challengeData.response && challengeData.response !== '') {
        setResponse(challengeData.response);
      }

      // Fetch challenge history
      try {
        const historyRes = await api.get('/challenges/history?limit=5');
        setHistory(historyRes.data.challenges || []);
      } catch {
        // History fetch is optional
      }

      // Engagement cue when challenge loads
      hapticMedium();
    } catch (err: any) {
      console.error('Failed to load data:', err);
      hapticError();
      setError("Failed to load today's challenge");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRetry = () => {
    hapticSelection();
    loadData();
  };

  const handleSubmit = async () => {
    if (!challenge || !response.trim()) {
      hapticError();
      setSubmissionError('Please enter a response');
      return;
    }

    setSubmitting(true);
    setSubmissionError(null);
    // Store previous badge count for comparison
    const previousUnlockedCount = badges.filter(b => b.unlocked).length;
    try {
      await api.post('/challenges/submit', {
        response: response.trim(),
      });

      hapticSuccess();
      setChallenge({ ...challenge, response: response.trim() });

      // Reload data to get updated streak/badges
      const streakRes = await api.get('/challenges/streak');
      const newBadges = streakRes.data.badges || [];
      const newUnlockedCount = newBadges.filter((b: Badge) => b.unlocked).length;

      // Check for new badge unlock
      if (newUnlockedCount > previousUnlockedCount) {
        setTimeout(() => {
          hapticSuccess();
        }, 300);
      }

      loadData();
    } catch (err: any) {
      console.error('Failed to submit response:', err);
      hapticError();
      setSubmissionError(err.response?.data?.message || 'Failed to submit response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const hasResponded = challenge ? (challenge.response && challenge.response !== '') : false;

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
        <ChallengeSkeleton />
      </SafeAreaView>
    );
  }

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

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView className="flex-1" contentContainerClassName="p-6">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-3xl font-bold text-white mb-2">
              Daily Challenge
            </Text>
            <Text className="text-gray-400">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          {/* Streak Card */}
          {streak && (
            <View
              className="rounded-2xl p-5 mb-6 flex-row items-center shadow-lg"
              style={{ backgroundColor: '#f97316' }}
            >
              <Ionicons name="flame" size={32} color="#fff" />
              <View className="ml-3 flex-1">
                <Text className="text-white text-2xl font-bold">
                  {streak.current_streak} Day Streak
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.9)' }} className="text-sm">
                  Longest: {streak.longest_streak} days
                </Text>
              </View>
            </View>
          )}

          {/* Badges */}
          {badges.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
              {badges.map((badge, i) => (
                <View
                  key={i}
                  className="items-center mr-4"
                  style={{ opacity: badge.unlocked ? 1 : 0.35 }}
                >
                  <View
                    className="w-14 h-14 rounded-full items-center justify-center"
                    style={{ backgroundColor: badge.unlocked ? '#1e293b' : '#111827' }}
                  >
                    <Text style={{ fontSize: 24 }}>{badge.emoji}</Text>
                  </View>
                  <Text className="text-xs text-gray-300 mt-1 font-medium">{badge.name}</Text>
                  <Text className="text-xs text-gray-500">{badge.required}d</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Challenge Card or Empty State */}
          {challenge ? (
            <>
              <View className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
                <View className="flex-row items-center mb-3">
                  <Ionicons name="bulb" size={24} color="#ec4899" />
                  <Text className="text-white text-lg font-bold ml-2">
                    Today's Challenge
                  </Text>
                </View>
                <Text className="text-gray-300 text-base leading-6">
                  {challenge.prompt}
                </Text>
              </View>

              {/* Response Input */}
              <View className="mb-6">
                <Text className="text-white font-semibold text-lg mb-3">
                  Your Response
                </Text>
                <TextInput
                  className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-white text-base"
                  style={{ minHeight: 128 }}
                  placeholder="Share your thoughts..."
                  placeholderTextColor="#6b7280"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  value={response}
                  onChangeText={(text) => {
                    setResponse(text);
                    if (submissionError) setSubmissionError(null);
                  }}
                  editable={!hasResponded}
                  maxLength={500}
                />
                <Text className="text-right text-xs text-gray-400 mt-1">
                  {response.length}/500
                </Text>

                {hasResponded && (
                  <View className="mt-3 flex-row items-center">
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    <Text className="text-green-500 font-medium ml-2">
                      Response submitted!
                    </Text>
                  </View>
                )}
              </View>

              {/* Submit Button */}
              {!hasResponded && (
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitting || !response.trim()}
                  className="rounded-xl py-4 items-center"
                  style={{
                    backgroundColor: submitting || !response.trim() ? '#374151' : '#ec4899',
                  }}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text className="text-white font-semibold text-lg">
                      Submit Response
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              {/* Submission Error */}
              {submissionError && (
                <View className="flex-row items-center justify-center mt-4">
                  <Ionicons name="close-circle" size={16} color="#ef4444" />
                  <Text className="text-red-400 text-sm ml-2">{submissionError}</Text>
                </View>
              )}
            </>
          ) : (
            <View className="items-center justify-center py-12">
              <Ionicons name="calendar-outline" size={64} color="#4b5563" />
              <Text className="text-gray-400 text-lg font-semibold mt-4">
                No Challenge Today
              </Text>
              <Text className="text-gray-500 text-center mt-2">
                Check back tomorrow!
              </Text>
            </View>
          )}

          {/* Challenge History */}
          {history.length > 0 && (
            <View className="mt-6">
              <Text className="text-lg font-bold text-white mb-3">
                Previous Challenges
              </Text>
              {history.map((h: any) => (
                <View
                  key={h.id}
                  className="rounded-xl p-4 mb-3"
                  style={{ backgroundColor: '#111827' }}
                >
                  <Text className="text-sm text-gray-500">
                    {new Date(h.challenge_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text className="text-gray-300 font-medium mt-1" numberOfLines={1}>
                    {h.prompt}
                  </Text>
                  {h.era && (
                    <Text className="text-xs text-gray-500 mt-1">
                      Era: {h.era}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Info */}
          <View className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-4">
            <Text className="text-pink-400 font-semibold mb-1">
              Daily Challenge Streak
            </Text>
            <Text className="text-gray-400 text-sm">
              Complete daily challenges to maintain your streak and unlock
              exclusive badges!
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
