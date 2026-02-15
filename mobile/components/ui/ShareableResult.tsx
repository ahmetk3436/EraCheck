import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Paths, File } from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticSuccess, hapticError, hapticLight } from '../../lib/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ShareableResultProps {
  era: {
    title: string;
    emoji: string;
    color: string;
    description?: string;
  };
  userName?: string;
  traits?: string[];
  date?: string;
  onShare?: () => void;
}

const PRESET_GRADIENTS: Record<string, readonly [string, string]> = {
  y2k: ['#FF6B9D', '#C44DFF'] as const,
  indie: ['#00D4FF', '#7B2FFF'] as const,
  cottagecore: ['#7FFF6B', '#FFD700'] as const,
  darkAcademia: ['#4A3728', '#8B7355'] as const,
  coquette: ['#FFB6D9', '#E0BBE4'] as const,
  oldMoney: ['#C9B037', '#2F4F4F'] as const,
  blokette: ['#000000', '#FFFFFF'] as const,
  mobWife: ['#FF1493', '#FF69B4'] as const,
  officeSiren: ['#E6E6FA', '#9370DB'] as const,
  rockstarGF: ['#8B008B', '#FFD700'] as const,
};

export default function ShareableResult({
  era,
  userName,
  traits,
  date,
  onShare,
}: ShareableResultProps) {
  const shareCardRef = useRef<View>(null);
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    try {
      setIsSharing(true);
      hapticLight();

      // Capture the share card
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1,
        width: 1080,
        height: 1920,
      });

      if (uri) {
        // Copy to document directory for sharing
        const destFile = new File(Paths.document, 'eracheck-result.png');
        const sourceFile = new File(uri);
        sourceFile.copy(destFile);

        // Share via system sheet
        await Sharing.shareAsync(destFile.uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share your Era result',
        });

        hapticSuccess();
        onShare?.();
      }
    } catch (error) {
      console.error('Share error:', error);
      hapticError();
      Alert.alert('Error', 'Failed to share. Please try again.');
    } finally {
      setIsSharing(false);
    }
  };

  const gradientColors = PRESET_GRADIENTS[era.color] || PRESET_GRADIENTS.y2k;

  return (
    <View className="gap-4">
      {/* Preview (smaller version) */}
      <View className="rounded-3xl overflow-hidden shadow-2xl">
        <ShareCardContent
          era={era}
          userName={userName}
          traits={traits}
          date={date}
          gradientColors={gradientColors}
          isPreview
        />
      </View>

      {/* Share Button */}
      <Pressable
        onPress={handleShare}
        disabled={isSharing}
        className="flex-row items-center justify-center gap-2 rounded-2xl bg-pink-500 py-4"
      >
        <Ionicons
          name={isSharing ? 'reload' : 'share-social'}
          size={20}
          color="#fff"
        />
        <Text className="text-white font-bold text-base">
          {isSharing ? 'Creating Card...' : 'Share Result'}
        </Text>
      </Pressable>

      {/* Hidden full-size card for capture */}
      <View className="absolute -left-[9999px] top-0">
        <View ref={shareCardRef}>
          <ShareCardContent
            era={era}
            userName={userName}
            traits={traits}
            date={date}
            gradientColors={gradientColors}
            isPreview={false}
          />
        </View>
      </View>
    </View>
  );
}

interface ShareCardContentProps {
  era: {
    title: string;
    emoji: string;
    color: string;
    description?: string;
  };
  userName?: string;
  traits?: string[];
  date?: string;
  gradientColors: readonly [string, string];
  isPreview: boolean;
}

function ShareCardContent({
  era,
  userName,
  traits,
  date,
  gradientColors,
  isPreview,
}: ShareCardContentProps) {
  const cardHeight = isPreview ? undefined : 1920;
  const cardWidth = isPreview ? undefined : 1080;
  const padding = isPreview ? 24 : 80;

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ height: cardHeight, width: cardWidth, padding }}
    >
      {/* App Watermark */}
      <View className="absolute top-6 left-6">
        <View className="flex-row items-center gap-2">
          <Ionicons name="sparkles" size={isPreview ? 20 : 40} color="#fff" />
          <Text className={cn('text-white font-bold', isPreview ? 'text-base' : 'text-2xl')}>
            EraCheck
          </Text>
        </View>
      </View>

      {/* Main Content */}
      <View className="items-center justify-center flex-1">
        {/* Emoji */}
        <Text className={isPreview ? 'text-7xl mb-4' : 'text-[180px] mb-8'}>
          {era.emoji}
        </Text>

        {/* Era Title */}
        <Text
          className={cn(
            'text-white font-black text-center mb-4',
            isPreview ? 'text-3xl' : 'text-6xl'
          )}
          style={Platform.select({
            ios: { fontFamily: 'SF Pro Display' },
            android: {},
          })}
        >
          {era.title}
        </Text>

        {/* Traits */}
        {traits && traits.length > 0 && (
          <View className="flex-row flex-wrap justify-center gap-2 mt-4">
            {traits.map((trait, index) => (
              <View
                key={index}
                className="bg-white/20 rounded-full px-4 py-2"
                style={
                  isPreview
                    ? {}
                    : { paddingHorizontal: 32, paddingVertical: 16 }
                }
              >
                <Text
                  className={cn(
                    'text-white font-semibold',
                    isPreview ? 'text-sm' : 'text-xl'
                  )}
                >
                  {trait}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Description */}
        {era.description && (
          <Text
            className={cn(
              'text-white/90 text-center mt-6 px-4',
              isPreview ? 'text-sm' : 'text-xl'
            )}
            style={{ maxWidth: isPreview ? 300 : 700 }}
          >
            {era.description}
          </Text>
        )}
      </View>

      {/* Footer */}
      <View className="items-center mt-8">
        {/* User Name */}
        {userName && (
          <Text
            className={cn('text-white/80 mb-2', isPreview ? 'text-sm' : 'text-xl')}
          >
            @{userName}
          </Text>
        )}

        {/* Date */}
        {date && (
          <Text
            className={cn('text-white/60 mb-6', isPreview ? 'text-xs' : 'text-lg')}
          >
            {date}
          </Text>
        )}

        {/* CTA */}
        <View
          className="bg-black/30 rounded-2xl px-6 py-3"
          style={isPreview ? {} : { paddingHorizontal: 48, paddingVertical: 24 }}
        >
          <Text
            className={cn(
              'text-white font-semibold text-center',
              isPreview ? 'text-sm' : 'text-xl'
            )}
          >
            Find your aesthetic era @ EraCheck
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
