import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../lib/api';
import { hapticSuccess, hapticError, hapticLight } from '../../../lib/haptics';

interface EraScore {
  era: string;
  score: number;
}

interface EraResult {
  id: string;
  era_title: string;
  era_emoji: string;
  era_color: string;
  description: string;
  music_taste: string;
  style_traits: string;
  scores: EraScore[];
  share_count: number;
  created_at: string;
}

export default function ResultsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const [result, setResult] = useState<EraResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (id) {
      loadResult();
    }
  }, [id]);

  const loadResult = async () => {
    try {
      const { data } = await api.get(`/era/results/${id}`);
      setResult(data);
    } catch (error: any) {
      console.error('Failed to load result:', error);
      hapticError();
      Alert.alert('Error', 'Failed to load results');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;

    setSharing(true);
    try {
      await api.post(`/era/results/${id}/share`);

      const message = `I just discovered my aesthetic era! I'm ${result.era_emoji} ${result.era_title}! Take the quiz and find yours!`;

      await Share.share({
        message,
      });

      hapticSuccess();
      loadResult(); // Reload to update share count
    } catch (error: any) {
      console.error('Failed to share:', error);
      hapticError();
    } finally {
      setSharing(false);
    }
  };

  const handleRetake = () => {
    hapticLight();
    router.push('/(protected)/quiz');
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ec4899" />
        </View>
      </SafeAreaView>
    );
  }

  if (!result) {
    return null;
  }

  const getScoreBarWidth = (score: number): any => {
    return `${Math.min(Math.max(score, 0), 100)}%`;
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
          <Text className="text-8xl mb-4">{result.era_emoji}</Text>
          <Text className="text-white text-3xl font-bold text-center mb-2">
            {result.era_title}
          </Text>
          <Text className="text-white/90 text-sm">
            Shared {result.share_count} times
          </Text>
        </View>

        {/* Description */}
        <View className="mx-6 mt-6">
          <Text className="text-xl font-bold text-white mb-3">
            About Your Era
          </Text>
          <Text className="text-gray-300 text-base leading-6">
            {result.description}
          </Text>
        </View>

        {/* Music Taste */}
        <View className="mx-6 mt-6">
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

        {/* Style Traits */}
        <View className="mx-6 mt-6">
          <View className="flex-row items-center mb-3">
            <Ionicons name="shirt" size={24} color="#ec4899" />
            <Text className="text-xl font-bold text-white ml-2">
              Style Traits
            </Text>
          </View>
          <Text className="text-gray-300 text-base leading-6">
            {result.style_traits}
          </Text>
        </View>

        {/* Era Scores */}
        <View className="mx-6 mt-6">
          <Text className="text-xl font-bold text-white mb-4">
            Your Era Breakdown
          </Text>
          <View className="space-y-4">
            {result.scores
              .sort((a, b) => b.score - a.score)
              .map((item, index) => (
                <View key={item.era}>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-white font-semibold">
                      {item.era}
                    </Text>
                    <Text className="text-gray-400 font-medium">
                      {Math.round(item.score)}%
                    </Text>
                  </View>
                  <View className="h-3 bg-gray-800 rounded-full overflow-hidden">
                    <View
                      className={`h-full ${
                        index === 0
                          ? 'bg-pink-500'
                          : index === 1
                          ? 'bg-purple-500'
                          : index === 2
                          ? 'bg-fuchsia-500'
                          : 'bg-gray-600'
                      }`}
                      style={{ width: getScoreBarWidth(item.score) }}
                    />
                  </View>
                </View>
              ))}
          </View>
        </View>

        {/* Actions */}
        <View className="mx-6 mt-8 mb-8 space-y-3">
          <TouchableOpacity
            onPress={handleShare}
            disabled={sharing}
            className="bg-pink-500 rounded-xl py-4 items-center flex-row justify-center"
          >
            <Ionicons name="share-social" size={24} color="#fff" />
            <Text className="text-white font-semibold text-lg ml-2">
              Share Your Era
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRetake}
            className="bg-gray-800 rounded-xl py-4 items-center"
          >
            <Text className="text-white font-semibold text-lg">
              Retake Quiz
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
