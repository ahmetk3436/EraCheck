import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';

export default function HomeScreen() {
  const { user, logout } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      <View className="flex-1 px-8 pt-12">
        <Text className="mb-2 text-3xl font-bold text-white">
          EraCheck
        </Text>
        <Text className="mb-8 text-base text-gray-400">
          Welcome, {user?.email}
        </Text>

        <View className="flex-1 items-center justify-center">
          <View className="rounded-2xl bg-gray-900 border border-gray-800 p-8">
            <Text className="text-center text-lg font-semibold text-pink-400">
              Discover your aesthetic era.
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-400">
              Take the quiz to find out!
            </Text>
          </View>
        </View>

        <View className="pb-8">
          <Button
            title="Sign Out"
            variant="outline"
            onPress={logout}
            size="lg"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
