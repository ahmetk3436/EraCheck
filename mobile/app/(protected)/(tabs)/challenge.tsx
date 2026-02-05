import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../lib/api';
import { hapticSuccess, hapticError, hapticLight } from '../../../lib/haptics';

interface DailyChallenge {
  id: string;
  challenge_text: string;
  challenge_date: string;
  has_responded: boolean;
  user_response?: string;
}

interface Streak {
  current_streak: number;
  longest_streak: number;
}

export default function ChallengeScreen() {
  const [challenge, setChallenge] = useState<DailyChallenge | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [challengeRes, streakRes] = await Promise.all([
        api.get('/era/challenge'),
        api.get('/era/streak'),
      ]);

      setChallenge(challengeRes.data);
      setStreak(streakRes.data);

      if (challengeRes.data.has_responded && challengeRes.data.user_response) {
        setResponse(challengeRes.data.user_response);
      }
    } catch (error: any) {
      console.error('Failed to load data:', error);
      hapticError();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!challenge || !response.trim()) {
      hapticError();
      Alert.alert('Error', 'Please enter a response');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/era/challenge/${challenge.id}`, {
        response: response.trim(),
      });

      hapticSuccess();
      Alert.alert('Success', 'Your response has been saved!');
      loadData(); // Reload to update streak and challenge state
    } catch (error: any) {
      console.error('Failed to submit response:', error);
      hapticError();
      Alert.alert('Error', 'Failed to submit response. Please try again.');
    } finally {
      setSubmitting(false);
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
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView className="flex-1" contentContainerClassName="p-6">
          {/* Header */}
          <View className="mb-6">
            <Text className="text-3xl font-bold text-gray-900 mb-2">
              Daily Challenge
            </Text>
            <Text className="text-gray-600">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </View>

          {/* Streak Card */}
          {streak && (
            <View className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl p-4 mb-6 flex-row items-center">
              <Ionicons name="flame" size={32} color="#fff" />
              <View className="ml-3 flex-1">
                <Text className="text-white text-2xl font-bold">
                  {streak.current_streak} Day Streak
                </Text>
                <Text className="text-white/90 text-sm">
                  Longest: {streak.longest_streak} days
                </Text>
              </View>
            </View>
          )}

          {/* Challenge Card */}
          {challenge && (
            <View className="bg-purple-50 rounded-2xl p-6 mb-6">
              <View className="flex-row items-center mb-3">
                <Ionicons name="bulb" size={24} color="#9333ea" />
                <Text className="text-purple-900 text-lg font-bold ml-2">
                  Today's Challenge
                </Text>
              </View>
              <Text className="text-purple-900 text-base leading-6">
                {challenge.challenge_text}
              </Text>
            </View>
          )}

          {/* Response Input */}
          {challenge && (
            <View className="mb-6">
              <Text className="text-gray-900 font-semibold text-lg mb-3">
                Your Response
              </Text>
              <TextInput
                className="bg-gray-100 rounded-xl p-4 text-gray-900 text-base min-h-32"
                placeholder="Share your thoughts..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                value={response}
                onChangeText={setResponse}
                editable={!challenge.has_responded}
              />

              {challenge.has_responded && (
                <View className="mt-3 flex-row items-center">
                  <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  <Text className="text-green-600 font-medium ml-2">
                    Response submitted!
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Submit Button */}
          {challenge && !challenge.has_responded && (
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting || !response.trim()}
              className={`rounded-xl py-4 items-center ${
                submitting || !response.trim()
                  ? 'bg-gray-300'
                  : 'bg-blue-600'
              }`}
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

          {/* Info */}
          <View className="mt-6 bg-blue-50 rounded-xl p-4">
            <Text className="text-blue-900 font-semibold mb-1">
              Daily Challenge Streak
            </Text>
            <Text className="text-blue-700 text-sm">
              Complete daily challenges to maintain your streak and unlock
              exclusive badges!
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
