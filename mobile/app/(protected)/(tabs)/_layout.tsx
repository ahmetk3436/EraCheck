import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticSelection } from '../../../lib/haptics';

const tabs = [
  { name: 'index', path: '/(protected)/(tabs)', label: 'Quiz', icon: 'sparkles' },
  { name: 'history', path: '/(protected)/(tabs)/history', label: 'History', icon: 'time-outline' },
  { name: 'challenge', path: '/(protected)/(tabs)/challenge', label: 'Daily', icon: 'calendar-outline' },
  { name: 'settings', path: '/(protected)/(tabs)/settings', label: 'Settings', icon: 'settings-outline' },
] as const;

export default function TabsLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const isActive = (tab: typeof tabs[number]) => {
    if (tab.name === 'index') {
      return pathname === '/' || pathname === '/(tabs)' || pathname === '/(protected)/(tabs)';
    }
    return pathname.includes(tab.name);
  };

  return (
    <View className="flex-1 bg-gray-950">
      <Slot />
      <View
        className="flex-row bg-gray-950 border-t border-gray-800"
        style={{ paddingBottom: insets.bottom }}
      >
        {tabs.map((tab) => {
          const active = isActive(tab);
          return (
            <Pressable
              key={tab.name}
              className="flex-1 items-center pt-3 pb-2"
              onPress={() => {
                hapticSelection();
                router.push(tab.path as any);
              }}
            >
              <Ionicons
                name={tab.icon as keyof typeof Ionicons.glyphMap}
                size={24}
                color={active ? '#ec4899' : '#6b7280'}
              />
              <Text
                className={`text-xs mt-1 ${active ? 'text-pink-500 font-semibold' : 'text-gray-500'}`}
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
