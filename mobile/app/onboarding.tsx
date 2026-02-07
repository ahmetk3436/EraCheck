import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { hapticLight } from '../lib/haptics';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const router = useRouter();
  const { continueAsGuest } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentPage(page);
  };

  const handleTryFree = async () => {
    hapticLight();
    await AsyncStorage.setItem('onboarding_complete', 'true');
    await continueAsGuest();
    router.replace('/(protected)/(tabs)');
  };

  const handleSignIn = async () => {
    hapticLight();
    await AsyncStorage.setItem('onboarding_complete', 'true');
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Page 1: Welcome */}
        <View style={{ width }} className="flex-1 items-center justify-center px-8">
          <Ionicons name="sparkles" size={80} color="#ec4899" />
          <Text className="text-4xl font-bold mt-6" style={{ color: '#ec4899' }}>
            EraCheck
          </Text>
          <Text className="text-xl text-gray-400 mt-3 text-center">
            Discover Your Aesthetic Era
          </Text>
        </View>

        {/* Page 2: Features */}
        <View style={{ width }} className="flex-1 justify-center px-8">
          <Text className="text-2xl font-bold text-white mb-8 text-center">
            What You Get
          </Text>

          <View className="flex-row items-center rounded-2xl p-5 mb-4" style={{ backgroundColor: '#1f2937' }}>
            <Ionicons name="sparkles" size={32} color="#ec4899" />
            <View className="ml-4 flex-1">
              <Text className="font-bold text-white text-base">10 Unique Eras</Text>
              <Text className="text-sm text-gray-400">From Y2K to Demure Queen</Text>
            </View>
          </View>

          <View className="flex-row items-center rounded-2xl p-5 mb-4" style={{ backgroundColor: '#1f2937' }}>
            <Ionicons name="calendar" size={32} color="#ec4899" />
            <View className="ml-4 flex-1">
              <Text className="font-bold text-white text-base">Daily Challenges</Text>
              <Text className="text-sm text-gray-400">Keep your streak alive</Text>
            </View>
          </View>

          <View className="flex-row items-center rounded-2xl p-5 mb-4" style={{ backgroundColor: '#1f2937' }}>
            <Ionicons name="share-social" size={32} color="#ec4899" />
            <View className="ml-4 flex-1">
              <Text className="font-bold text-white text-base">Share Your Vibe</Text>
              <Text className="text-sm text-gray-400">Compare eras with friends</Text>
            </View>
          </View>
        </View>

        {/* Page 3: CTA */}
        <View style={{ width }} className="flex-1 items-center justify-center px-8">
          <Text className="text-3xl font-bold text-white text-center">
            Ready to find your era?
          </Text>

          <Pressable
            onPress={handleTryFree}
            className="rounded-2xl py-4 w-full items-center mt-8"
            style={{ backgroundColor: '#ec4899' }}
          >
            <Text className="text-white font-bold text-lg">Try Free</Text>
          </Pressable>

          <Pressable
            onPress={handleSignIn}
            className="rounded-2xl py-4 w-full items-center mt-3"
            style={{ borderWidth: 2, borderColor: '#ec4899' }}
          >
            <Text style={{ color: '#ec4899' }} className="font-bold text-lg">Sign In</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Page Dots */}
      <View className="flex-row items-center justify-center pb-6">
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            className="w-2.5 h-2.5 rounded-full mx-1"
            style={{ backgroundColor: currentPage === i ? '#ec4899' : '#4b5563' }}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}
