import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../lib/api';
import { hapticError, hapticLight } from '../../../lib/haptics';

interface EraResult {
  id: string;
  era_title: string;
  era_emoji: string;
  era_color: string;
  share_count: number;
  created_at: string;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [results, setResults] = useState<EraResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      const { data } = await api.get('/era/results');
      setResults(data);
    } catch (error: any) {
      console.error('Failed to load results:', error);
      hapticError();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadResults();
  };

  const handleResultPress = (id: string) => {
    hapticLight();
    router.push(`/(protected)/results/${id}`);
  };

  const renderItem = ({ item }: { item: EraResult }) => {
    return (
      <TouchableOpacity
        onPress={() => handleResultPress(item.id)}
        className="rounded-xl p-4 mb-3 flex-row items-center"
        style={{ backgroundColor: item.era_color }}
      >
        <Text className="text-6xl mr-4">{item.era_emoji}</Text>
        <View className="flex-1">
          <Text className="text-white text-xl font-bold">
            {item.era_title}
          </Text>
          <Text className="text-white/90 text-sm mt-1">
            {new Date(item.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
          <Text className="text-white/80 text-xs mt-1">
            Shared {item.share_count} times
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#fff" />
      </TouchableOpacity>
    );
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
      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-200">
        <Text className="text-3xl font-bold text-gray-900">History</Text>
        <Text className="text-gray-600 mt-1">
          {results.length} {results.length === 1 ? 'result' : 'results'}
        </Text>
      </View>

      {/* Results List */}
      {results.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="time-outline" size={64} color="#d1d5db" />
          <Text className="text-gray-500 text-lg font-semibold mt-4">
            No Results Yet
          </Text>
          <Text className="text-gray-400 text-center mt-2">
            Take the quiz to discover your aesthetic era
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(protected)/quiz')}
            className="bg-blue-600 rounded-xl px-6 py-3 mt-6"
          >
            <Text className="text-white font-semibold">Take Quiz</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-6"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#2563eb"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
