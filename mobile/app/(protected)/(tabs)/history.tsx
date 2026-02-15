import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../../lib/api';
import { hapticError, hapticLight, hapticSelection, hapticSuccess } from '../../../lib/haptics';
import Skeleton from '../../../components/Skeleton';
import ErrorState from '../../../components/ErrorState';
import ToastBanner from '../../../components/ToastBanner';

interface EraResult {
  id: string;
  era_title: string;
  era_emoji: string;
  era_color: string;
  era_description: string;
  share_count: number;
  created_at: string;
}

const HistoryItemSkeleton: React.FC = () => (
  <View className="rounded-xl p-4 mb-3 flex-row items-center" style={{ backgroundColor: '#111827' }}>
    <Skeleton className="w-16 h-16 rounded-full mr-4" />
    <View className="flex-1">
      <Skeleton className="w-32 h-5 mb-2" />
      <Skeleton className="w-20 h-4" />
    </View>
    <Skeleton className="w-6 h-6 rounded-full" />
  </View>
);

const HistorySkeleton: React.FC = () => (
  <View className="flex-1">
    <View className="px-6 py-4 border-b border-gray-800">
      <Skeleton className="w-28 h-8 mb-2" />
      <Skeleton className="w-16 h-4" />
    </View>
    <View className="p-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <HistoryItemSkeleton key={i} />
      ))}
    </View>
  </View>
);

export default function HistoryScreen() {
  const router = useRouter();
  const [results, setResults] = useState<EraResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const { data } = await api.get('/era/results');
      // Extract from envelope
      const resultsData = data.results || data;
      setResults(Array.isArray(resultsData) ? resultsData : []);

      if (!isRefresh) {
        hapticSuccess();
      }
    } catch (err: any) {
      console.error('Failed to load results:', err);
      if (isRefresh) {
        // Show toast for refresh failure
        setToastMessage('Failed to refresh history');
        setShowToast(true);
        hapticError();
      } else {
        setError('Failed to load your quiz history');
        hapticError();
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRetry = () => {
    hapticSelection();
    loadResults();
  };

  const handleResultPress = (id: string) => {
    hapticLight();
    router.push(`/(protected)/results/${id}`);
  };

  const handleDismissToast = () => {
    setShowToast(false);
  };

  const renderItem = ({ item }: { item: EraResult }) => {
    return (
      <TouchableOpacity
        onPress={() => handleResultPress(item.id)}
        className="rounded-xl p-4 mb-3 flex-row items-center shadow-sm"
        style={{ backgroundColor: item.era_color }}
      >
        <Text className="text-6xl mr-4">{item.era_emoji}</Text>
        <View className="flex-1">
          <Text className="text-white text-xl font-bold">
            {item.era_title}
          </Text>
          {item.era_description && (
            <Text style={{ color: 'rgba(255,255,255,0.8)' }} className="text-xs mt-1" numberOfLines={1}>
              {item.era_description}
            </Text>
          )}
          <Text style={{ color: 'rgba(255,255,255,0.9)' }} className="text-sm mt-1">
            {new Date(item.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)' }} className="text-xs mt-1">
            Shared {item.share_count} times
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={24} color="#fff" />
      </TouchableOpacity>
    );
  };

  const renderFooter = () => {
    if (results.length === 0) return null;
    return (
      <View className="items-center py-6">
        <Text className="text-gray-500 text-sm">You've seen all your results</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
        <HistorySkeleton />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
        <ErrorState
          icon="time-outline"
          title="No History Found"
          message="We couldn't load your quiz history"
          retryText="Try Again"
          onRetry={handleRetry}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
      {/* Toast Banner */}
      <ToastBanner
        visible={showToast}
        message={toastMessage}
        type="error"
        onDismiss={handleDismissToast}
      />

      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-800">
        <Text className="text-3xl font-bold text-white">History</Text>
        <Text className="text-gray-400 mt-1">
          {results.length} {results.length === 1 ? 'result' : 'results'}
        </Text>
      </View>

      {/* Results List */}
      {results.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <View
            className="w-32 h-32 rounded-full items-center justify-center"
            style={{ backgroundColor: '#1e293b' }}
          >
            <Ionicons name="sparkles-outline" size={64} color="#6366f1" />
          </View>
          <Text className="text-xl font-bold text-white mt-6">
            No Eras Discovered Yet
          </Text>
          <Text className="text-gray-500 text-center mt-2">
            Take the quiz to discover which aesthetic era defines your vibe
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/(protected)/quiz')}
            className="rounded-2xl px-8 py-4 mt-8 shadow-lg"
            style={{ backgroundColor: '#ec4899' }}
          >
            <Text className="text-white font-bold text-lg">Take the Quiz</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-6"
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadResults(true)}
              tintColor="#a855f7"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
