import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import ReportButton from '../../components/ui/ReportButton';
import BlockButton from '../../components/ui/BlockButton';
import StreakBadge from '../../components/ui/StreakBadge';
import GlassCard from '../../components/ui/GlassCard';
import FeatureCard from '../../components/ui/FeatureCard';
import ShareableResult from '../../components/ui/ShareableResult';
import UsageBadge from '../../components/ui/UsageBadge';
import { hapticLight } from '../../lib/haptics';

const MOCK_ERA = {
  title: 'Y2K Dream Girl',
  emoji: '💅',
  color: 'y2k',
  description: 'Low-rise jeans, butterfly clips, and flip phones. You are the queen of the mall.',
  traits: ['Playful', 'Nostalgic', 'Trendy', 'Social'],
};

export default function UIDemoScreen() {
  const [showModal, setShowModal] = React.useState(false);

  return (
    <SafeAreaView className="flex-1 bg-gray-950" edges={['top']}>
      <ScrollView className="flex-1">
        {/* Header */}
        <View className="px-6 pt-6 pb-4 border-b border-gray-800">
          <View className="flex-row items-center justify-between mb-4">
            <View>
              <Text className="text-3xl font-bold text-white">
                UI Components Demo
              </Text>
              <Text className="text-gray-400">
                2025-2026 Trends Applied
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Streak Badge */}
        <View className="px-6 py-6">
          <Text className="text-white text-lg font-bold mb-4">
            Gamification - Streak Badge
          </Text>
          <StreakBadge
            currentStreak={14}
            longestStreak={21}
            size="lg"
            showMilestone
            onPress={() => {
              /* Handle streak press */
            }}
          />
          <View className="mt-4 flex-row gap-3">
            {[3, 7, 21, 30].map((streak) => (
              <StreakBadge
                key={streak}
                currentStreak={streak}
                longestStreak={streak}
                size="sm"
              />
            ))}
          </View>
        </View>

        {/* Usage Badges */}
        <View className="px-6 py-6 border-t border-gray-800">
          <Text className="text-white text-lg font-bold mb-4">
            Contextual Paywalls - Usage Badges
          </Text>
          <View className="gap-3">
            <UsageBadge used={2} limit={3} type="guest" />
            <UsageBadge used={8} limit={10} type="free" />
            <UsageBadge used={999} limit={1000} type="premium" />
          </View>
        </View>

        {/* Glass Cards */}
        <View className="px-6 py-6 border-t border-gray-800">
          <Text className="text-white text-lg font-bold mb-4">
            Glassmorphism - Glass Cards
          </Text>
          <View className="flex-row gap-3 flex-wrap">
            <GlassCard variant="glass" className="flex-1 min-w-[140px] p-4">
              <Text className="text-white font-semibold mb-2">Glass Variant</Text>
              <Text className="text-gray-400 text-sm">
                Translucent with blur effect
              </Text>
            </GlassCard>
            <GlassCard
              variant="gradient"
              gradientColors={['#ec4899', '#8b5cf6']}
              className="flex-1 min-w-[140px] p-4"
            >
              <Text className="text-white font-semibold mb-2">
                Gradient Variant
              </Text>
              <Text className="text-white/80 text-sm">
                Linear gradient background
              </Text>
            </GlassCard>
          </View>
        </View>

        {/* Feature Cards (Bento Box) */}
        <View className="px-6 py-6 border-t border-gray-800">
          <Text className="text-white text-lg font-bold mb-4">
            Bento Grid Layout - Feature Cards
          </Text>
          <View className="grid grid-cols-2 gap-3">
            <FeatureCard
              icon="sparkles"
              title="AI Analysis"
              description="Get personalized aesthetic insights"
              color="#ec4899"
              badge="New"
            />
            <FeatureCard
              icon="musical-notes"
              title="Era Match"
              description="Compare your vibe with friends"
              color="#8b5cf6"
            />
            <FeatureCard
              icon="trophy"
              title="Achievements"
              description="Unlock badges and milestones"
              color="#f59e0b"
              gradientColors={['#f59e0b', '#d97706']}
            />
            <FeatureCard
              icon="share-social"
              title="Share Results"
              description="Viral sharing to Instagram"
              color="#10b981"
            />
          </View>
        </View>

        {/* Buttons */}
        <View className="px-6 py-6 border-t border-gray-800">
          <Text className="text-white text-lg font-bold mb-4">
            Enhanced Buttons
          </Text>
          <View className="gap-3">
            <Button title="Primary Button" variant="primary" size="lg" />
            <Button
              title="Gradient Button"
              variant="gradient"
              size="lg"
              icon={<Ionicons name="sparkles" size={20} color="#fff" />}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  title="Outline"
                  variant="outline"
                  size="md"
                  fullWidth
                />
              </View>
              <View className="flex-1">
                <Button
                  title="Destructive"
                  variant="destructive"
                  size="md"
                  fullWidth
                />
              </View>
            </View>
          </View>
        </View>

        {/* Inputs */}
        <View className="px-6 py-6 border-t border-gray-800">
          <Text className="text-white text-lg font-bold mb-4">
            Enhanced Inputs
          </Text>
          <View className="gap-4">
            <Input
              label="Email"
              placeholder="you@example.com"
              leftIcon="mail"
              autoCapitalize="none"
            />
            <Input
              label="Password"
              placeholder="Enter your password"
              leftIcon="lock-closed"
              secureTextEntry
              showPasswordToggle
              maxLength={32}
              showCharCount
            />
            <Input
              label="Search"
              placeholder="Search for something..."
              leftIcon="search"
              rightIcon={<Ionicons name="options" size={20} color="#9ca3af" />}
            />
          </View>
        </View>

        {/* Shareable Result */}
        <View className="px-6 py-6 border-t border-gray-800">
          <Text className="text-white text-lg font-bold mb-4">
            Viral Sharing - Shareable Result
          </Text>
          <ShareableResult
            era={MOCK_ERA}
            userName="eracheck_user"
            traits={MOCK_ERA.traits}
            date={new Date().toLocaleDateString()}
          />
        </View>

        {/* Moderation */}
        <View className="px-6 py-6 border-t border-gray-800">
          <Text className="text-white text-lg font-bold mb-4">
            UGC Safety - Report & Block
          </Text>
          <View className="flex-row gap-6">
            <View className="flex-1">
              <Text className="text-gray-400 text-sm mb-3">
                Report Button Variants
              </Text>
              <View className="gap-3">
                <ReportButton
                  contentType="user"
                  contentId="123"
                  variant="icon"
                  size="md"
                />
                <ReportButton
                  contentType="post"
                  contentId="456"
                  variant="text"
                  size="md"
                />
                <ReportButton
                  contentType="comment"
                  contentId="789"
                  variant="both"
                  size="md"
                />
              </View>
            </View>
            <View className="flex-1">
              <Text className="text-gray-400 text-sm mb-3">
                Block Button Variants
              </Text>
              <View className="gap-3">
                <BlockButton
                  userId="123"
                  userName="Sample User"
                  variant="icon"
                  size="md"
                />
                <BlockButton
                  userId="456"
                  variant="text"
                  size="md"
                />
                <BlockButton
                  userId="789"
                  variant="both"
                  size="md"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Modal Trigger */}
        <View className="px-6 py-6 border-t border-gray-800">
          <Text className="text-white text-lg font-bold mb-4">
            Enhanced Modal
          </Text>
          <Button
            title="Show Modal"
            variant="gradient"
            size="lg"
            onPress={() => setShowModal(true)}
            icon={<Ionicons name="layers" size={20} color="#fff" />}
            fullWidth
          />
        </View>

        <View className="h-8" />
      </ScrollView>

      {/* Modal */}
      <Modal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title="UI Components Demo"
        subtitle="2025-2026 Trends Showcase"
        size="lg"
      >
        <View className="py-4">
          <Text className="text-white text-base mb-4">
            This modal demonstrates the enhanced glassmorphism effect with backdrop blur.
            The modal supports different sizes (sm, md, lg, full) and includes a
            subtitle option.
          </Text>

          <View className="bg-white/10 rounded-2xl p-4 mb-4">
            <Text className="text-white text-sm">
              All components include haptic feedback for a premium feel. The
              glassmorphism effect works best on iOS with the expo-blur library.
            </Text>
          </View>

          <Button
            title="Close"
            variant="outline"
            onPress={() => setShowModal(false)}
            fullWidth
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
