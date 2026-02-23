import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Slot, router, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticSelection } from '../../../lib/haptics';

const tabs = [
  {
    path: '/(protected)/(tabs)/challenge',
    icon: 'flame' as const,
    iconOutline: 'flame-outline' as const,
    label: 'Daily',
  },
  {
    path: '/(protected)/(tabs)',
    icon: 'sparkles' as const,
    iconOutline: 'sparkles-outline' as const,
    label: 'Quiz',
  },
  {
    path: '/(protected)/(tabs)/history',
    icon: 'time' as const,
    iconOutline: 'time-outline' as const,
    label: 'History',
  },
  {
    path: '/(protected)/(tabs)/settings',
    icon: 'settings' as const,
    iconOutline: 'settings-outline' as const,
    label: 'Settings',
  },
];

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('/(protected)/(tabs)/challenge');
  const [showChallengeBadge, setShowChallengeBadge] = useState(false);

  // Check if today's challenge is completed to show/hide badge
  const checkChallengeBadge = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const lastCompleted = await AsyncStorage.getItem('challenge_completed_date');
      setShowChallengeBadge(lastCompleted !== today);
    } catch {
      setShowChallengeBadge(true);
    }
  }, []);

  useEffect(() => {
    checkChallengeBadge();
    const interval = setInterval(checkChallengeBadge, 60000); // check every minute
    return () => clearInterval(interval);
  }, [checkChallengeBadge]);

  // Sync active tab with pathname
  useEffect(() => {
    if (pathname) {
      const match = tabs.find((t) => pathname.endsWith(t.path.split('/').pop() || ''));
      if (match) setActiveTab(match.path);
    }
  }, [pathname]);

  return (
    <View className="flex-1 bg-gray-950">
      <View className="flex-1">
        <Slot />
      </View>
      <View
        className="flex-row border-t border-gray-800 bg-gray-950"
        style={{ paddingBottom: insets.bottom || 8 }}
      >
        {tabs.map((tab) => {
          const active = activeTab === tab.path;
          const isChallenge = tab.path.endsWith('/challenge');

          return (
            <Pressable
              key={tab.path}
              onPress={() => {
                hapticSelection();
                setActiveTab(tab.path);
                router.push(tab.path as any);
                if (isChallenge) checkChallengeBadge();
              }}
              className="flex-1 items-center pt-2 pb-1"
            >
              <View className="relative">
                <Ionicons
                  name={active ? tab.icon : tab.iconOutline}
                  size={24}
                  color={active ? '#ec4899' : '#9ca3af'}
                />
                {/* Badge dot for new daily challenge */}
                {isChallenge && showChallengeBadge && !active && (
                  <View
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -4,
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: '#ef4444',
                      borderWidth: 1.5,
                      borderColor: '#030712',
                    }}
                  />
                )}
              </View>
              <Text
                style={{
                  color: active ? '#ec4899' : '#9ca3af',
                  fontSize: 10,
                  fontWeight: active ? '600' : '400',
                  marginTop: 2,
                }}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
