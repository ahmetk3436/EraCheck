import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticSelection } from '../../../lib/haptics';

const tabs = [
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
    path: '/(protected)/(tabs)/challenge',
    icon: 'calendar' as const,
    iconOutline: 'calendar-outline' as const,
    label: 'Daily',
  },
  {
    path: '/(protected)/(tabs)/settings',
    icon: 'settings' as const,
    iconOutline: 'settings-outline' as const,
    label: 'Settings',
  },
];

export default function TabsLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
          const isActive =
            pathname === tab.path ||
            (tab.path.endsWith('(tabs)') &&
              (pathname === '/' || pathname === ''));
          // Also check by the route name for partial matching
          const tabName = tab.path.split('/').pop() || '';
          const isActiveByName =
            tabName !== '(tabs)' && pathname.includes(tabName);
          const active = isActive || isActiveByName;

          return (
            <Pressable
              key={tab.path}
              onPress={() => {
                hapticSelection();
                router.push(tab.path as any);
              }}
              className="flex-1 items-center pt-2 pb-1"
            >
              <Ionicons
                name={active ? tab.icon : tab.iconOutline}
                size={24}
                color={active ? '#ec4899' : '#9ca3af'}
              />
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
