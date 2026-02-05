import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../lib/api';
import { hapticSuccess, hapticError, hapticLight } from '../../../lib/haptics';

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

export default function QuizHomeScreen() {
  const router = useRouter();
  const [streak, setStreak] = useState<Streak | null>(null);
  const [latestResult, setLatestResult] = useState<EraResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [streakRes, resultsRes] = await Promise.all([
        api.get('/era/streak'),
        api.get('/era/results'),
      ]);

      setStreak(streakRes.data);

      if (resultsRes.data && resultsRes.data.length > 0) {
        setLatestResult(resultsRes.data[0]);
      }
    } catch (error: any) {
      console.error('Failed to load data:', error);
      hapticError();
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = () => {
    hapticLight();
    router.push('/(protected)/quiz');
  };

  const handleViewResult = () => {
    if (latestResult) {
      hapticLight();
      router.push(`/(protected)/results/${latestResult.id}`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerClassName="p-6">
        {/* Header */}
        <View className="mb-8">
          <Text className="text-4xl font-bold text-gray-900 mb-2">
            EraCheck
          </Text>
          <Text className="text-lg text-gray-600">
            Discover Your Aesthetic Era
          </Text>
        </View>

        {/* Streak Badge */}
        {streak && streak.current_streak > 0 && (
          <View className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl p-4 mb-6 flex-row items-center">
            <Ionicons name="flame" size={32} color="#fff" />
            <View className="ml-3">
              <Text className="text-white text-2xl font-bold">
                {streak.current_streak} Day Streak
              </Text>
              <Text className="text-white/90 text-sm">
                Longest: {streak.longest_streak} days
              </Text>
            </View>
          </View>
        )}

        {/* Latest Result Card */}
        {latestResult && (
          <TouchableOpacity
            onPress={handleViewResult}
            className="rounded-2xl p-6 mb-6"
            style={{ backgroundColor: latestResult.era_color }}
          >
            <Text className="text-white text-sm font-medium mb-2">
              Your Latest Era
            </Text>
            <View className="flex-row items-center">
              <Text className="text-6xl mr-4">{latestResult.era_emoji}</Text>
              <View className="flex-1">
                <Text className="text-white text-2xl font-bold">
                  {latestResult.era_title}
                </Text>
                <Text className="text-white/90 text-sm mt-1">
                  {new Date(latestResult.created_at).toLocaleDateString()}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </View>
          </TouchableOpacity>
        )}

        {/* Start Quiz Button */}
        <TouchableOpacity
          onPress={handleStartQuiz}
          className="bg-blue-600 rounded-2xl p-6 items-center shadow-lg"
        >
          <Ionicons name="sparkles" size={32} color="#fff" />
          <Text className="text-white text-xl font-bold mt-2">
            Start Quiz
          </Text>
          <Text className="text-white/90 text-sm mt-1">
            Discover your aesthetic era
          </Text>
        </TouchableOpacity>

        {/* Info Cards */}
        <View className="mt-8 space-y-4">
          <View className="bg-purple-50 rounded-xl p-4">
            <Text className="text-purple-900 font-semibold mb-1">
              10 Unique Eras
            </Text>
            <Text className="text-purple-700 text-sm">
              Y2K, Indie Sleaze, Cottagecore, Dark Academia, and more
            </Text>
          </View>

          <View className="bg-pink-50 rounded-xl p-4">
            <Text className="text-pink-900 font-semibold mb-1">
              Personalized Results
            </Text>
            <Text className="text-pink-700 text-sm">
              Get detailed insights into your style, music, and vibes
            </Text>
          </View>

          <View className="bg-blue-50 rounded-xl p-4">
            <Text className="text-blue-900 font-semibold mb-1">
              Share & Compare
            </Text>
            <Text className="text-blue-700 text-sm">
              Share your era with friends and see who matches your vibe
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
