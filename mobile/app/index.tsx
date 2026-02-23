import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';


export default function Index() {
  const { isAuthenticated, isLoading, isGuest } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const onboarded = await AsyncStorage.getItem('onboarding_complete');
        setHasOnboarded(onboarded === 'true');
      } catch {
        setHasOnboarded(false);
      } finally {
        setOnboardingChecked(true);
      }
    };
    checkOnboarding();
  }, []);

  if (isLoading || !onboardingChecked) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-950">
        <ActivityIndicator size="large" color="#ec4899" />
      </View>
    );
  }

  // If not onboarded, show onboarding
  if (!hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  // If authenticated or guest, go to main app
  if (isAuthenticated || isGuest) {
    return <Redirect href="/(protected)/(tabs)" />;
  }

  // Otherwise go to login
  return <Redirect href="/(auth)/login" />;
}