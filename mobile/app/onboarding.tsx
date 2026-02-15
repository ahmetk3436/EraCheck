import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  withTiming,
  withRepeat,
  withSequence,
  Extrapolation,
  runOnJS,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { hapticLight, hapticMedium } from '../lib/haptics';

const { width: screenWidth } = Dimensions.get('window');
const PAGE_COUNT = 3;

const AnimatedScrollView = Animated.ScrollView;

const FEATURES = [
  { emoji: '🎭', text: '10 Unique Aesthetic Eras' },
  { emoji: '📊', text: 'Detailed Style Breakdown' },
  { emoji: '🔥', text: 'Daily Challenges & Streaks' },
];

const EMOJI_GRID = [
  ['👸', '🦋', '✨'],
  ['🌸', '💖', '🌙'],
  ['🎀', '💫', '🌺'],
];

export default function OnboardingScreen() {
  const router = useRouter();
  const { continueAsGuest } = useAuth();
  const [currentPage, setCurrentPage] = useState(0);
  const [showScrollHint, setShowScrollHint] = useState(true);
  const [isNavigating, setIsNavigating] = useState(false);
  const scrollViewRef = useRef<Animated.ScrollView>(null);

  const scrollX = useSharedValue(0);
  const scrollHintOpacity = useSharedValue(1);
  const scrollHintTranslateX = useSharedValue(0);

  const handleScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;

    if (event.contentOffset.x > 10 && scrollHintOpacity.value === 1) {
      scrollHintOpacity.value = withTiming(0, { duration: 300 });
      runOnJS(setShowScrollHint)(false);
    }

    const page = Math.round(event.contentOffset.x / screenWidth);
    runOnJS(setCurrentPage)(page);
  });

  const handleSkip = () => {
    hapticLight();
    (scrollViewRef.current as any)?.scrollTo({ x: screenWidth * 2, animated: true });
  };

  const handleTryFree = async () => {
    hapticMedium();
    setIsNavigating(true);
    await AsyncStorage.setItem('onboarding_complete', 'true');
    await continueAsGuest();
    router.replace('/(protected)/(tabs)');
  };

  const handleSignIn = async () => {
    hapticMedium();
    await AsyncStorage.setItem('onboarding_complete', 'true');
    router.replace('/(auth)/login');
  };

  // Auto-scroll hint animation
  useEffect(() => {
    if (showScrollHint && currentPage === 0) {
      scrollHintTranslateX.value = withRepeat(
        withSequence(
          withTiming(10, { duration: 500 }),
          withTiming(0, { duration: 500 })
        ),
        -1,
        true
      );

      const timer = setTimeout(() => {
        scrollHintOpacity.value = withTiming(0, { duration: 300 });
        setShowScrollHint(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showScrollHint, currentPage]);

  // Animated styles for page elements
  const iconStyle0 = useAnimatedStyle(() => {
    const inputRange = [-screenWidth, 0, screenWidth];
    const scale = interpolate(scrollX.value, inputRange, [0.5, 1.0, 0.5], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [50, 0, -50], Extrapolation.CLAMP);
    return { transform: [{ scale }, { translateY }] };
  });

  const titleStyle0 = useAnimatedStyle(() => {
    const inputRange = [-screenWidth, 0, screenWidth];
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [30, 0, -30], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  const descStyle0 = useAnimatedStyle(() => {
    const inputRange = [-screenWidth, 0, screenWidth];
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    return { opacity };
  });

  const iconStyle1 = useAnimatedStyle(() => {
    const inputRange = [0, screenWidth, screenWidth * 2];
    const scale = interpolate(scrollX.value, inputRange, [0.5, 1.0, 0.5], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [50, 0, -50], Extrapolation.CLAMP);
    return { transform: [{ scale }, { translateY }] };
  });

  const titleStyle1 = useAnimatedStyle(() => {
    const inputRange = [0, screenWidth, screenWidth * 2];
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [30, 0, -30], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  const descStyle1 = useAnimatedStyle(() => {
    const inputRange = [0, screenWidth, screenWidth * 2];
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    return { opacity };
  });

  const iconStyle2 = useAnimatedStyle(() => {
    const inputRange = [screenWidth, screenWidth * 2, screenWidth * 3];
    const scale = interpolate(scrollX.value, inputRange, [0.5, 1.0, 0.5], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [50, 0, -50], Extrapolation.CLAMP);
    return { transform: [{ scale }, { translateY }] };
  });

  const titleStyle2 = useAnimatedStyle(() => {
    const inputRange = [screenWidth, screenWidth * 2, screenWidth * 3];
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [30, 0, -30], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }] };
  });

  const descStyle2 = useAnimatedStyle(() => {
    const inputRange = [screenWidth, screenWidth * 2, screenWidth * 3];
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    return { opacity };
  });

  // Dot indicator animated styles
  const dotStyle0 = useAnimatedStyle(() => {
    const inputRange = [-screenWidth, 0, screenWidth];
    const w = interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP);
    const o = interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], Extrapolation.CLAMP);
    return { width: w, opacity: o };
  });

  const dotStyle1 = useAnimatedStyle(() => {
    const inputRange = [0, screenWidth, screenWidth * 2];
    const w = interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP);
    const o = interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], Extrapolation.CLAMP);
    return { width: w, opacity: o };
  });

  const dotStyle2 = useAnimatedStyle(() => {
    const inputRange = [screenWidth, screenWidth * 2, screenWidth * 3];
    const w = interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP);
    const o = interpolate(scrollX.value, inputRange, [0.5, 1, 0.5], Extrapolation.CLAMP);
    return { width: w, opacity: o };
  });

  // Scroll hint animated style
  const scrollHintStyle = useAnimatedStyle(() => {
    return {
      opacity: scrollHintOpacity.value,
      transform: [{ translateX: scrollHintTranslateX.value }],
    };
  });

  const renderDot = (index: number, animStyle: any) => {
    const isActive = currentPage === index;
    if (isActive) {
      return (
        <Animated.View key={index} style={[styles.dot, animStyle]}>
          <LinearGradient
            colors={['#EC4899', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      );
    }
    return (
      <Animated.View
        key={index}
        style={[styles.dot, { backgroundColor: '#374151' }, animStyle]}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip Button - only on pages 0 and 1 */}
      {currentPage < 2 && (
        <Pressable onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      <AnimatedScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Page 1: Welcome */}
        <View style={[styles.page, { width: screenWidth }]}>
          <LinearGradient
            colors={['#EC4899', '#8B5CF6']}
            style={styles.gradientOrb}
          />
          <Animated.View style={[{ marginBottom: 24 }, iconStyle0]}>
            <Ionicons name="sparkles" size={80} color="#F472B6" />
          </Animated.View>
          <Animated.Text style={[styles.title, titleStyle0]}>
            Discover Your Era
          </Animated.Text>
          <Animated.Text style={[styles.description, descStyle0]}>
            Find out which aesthetic era defines your personality through our fun analysis
          </Animated.Text>
        </View>

        {/* Page 2: Features */}
        <View style={[styles.page, { width: screenWidth }]}>
          <Animated.View style={[{ marginBottom: 32 }, iconStyle1]}>
            <Ionicons name="layers" size={60} color="#A78BFA" />
          </Animated.View>
          <Animated.Text style={[styles.title, titleStyle1]}>
            How It Works
          </Animated.Text>
          <Animated.View style={[styles.featuresContainer, descStyle1]}>
            {FEATURES.map((feature, idx) => (
              <View key={idx} style={styles.featurePill}>
                <Text style={styles.featureText}>
                  {feature.emoji}  {feature.text}
                </Text>
              </View>
            ))}
          </Animated.View>
        </View>

        {/* Page 3: CTA */}
        <View style={[styles.page, { width: screenWidth }]}>
          <Animated.View style={iconStyle2}>
            <View style={styles.emojiGrid}>
              {EMOJI_GRID.map((row, rowIdx) => (
                <View key={rowIdx} style={styles.emojiRow}>
                  {row.map((emoji, colIdx) => (
                    <Text key={colIdx} style={styles.emojiText}>
                      {emoji}
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          </Animated.View>

          <Animated.Text style={[styles.title, titleStyle2]}>
            Ready to Begin?
          </Animated.Text>

          <Animated.View style={[{ width: '100%' }, descStyle2]}>
            <Pressable onPress={handleTryFree} disabled={isNavigating}>
              <LinearGradient
                colors={['#EC4899', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButton}
              >
                {isNavigating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.primaryButtonText}>Try Free</Text>
                )}
              </LinearGradient>
            </Pressable>

            <Pressable onPress={handleSignIn} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </Pressable>
          </Animated.View>
        </View>
      </AnimatedScrollView>

      {/* Dot Indicators */}
      <View style={styles.dotsContainer}>
        {renderDot(0, dotStyle0)}
        {renderDot(1, dotStyle1)}
        {renderDot(2, dotStyle2)}
      </View>

      {/* Auto-Scroll Hint */}
      {showScrollHint && currentPage === 0 && (
        <Animated.View style={[styles.scrollHint, scrollHintStyle]}>
          <Text style={styles.scrollHintText}>Swipe to explore</Text>
          <Ionicons name="chevron-forward" size={16} color="#6B7280" />
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  page: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  gradientOrb: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    opacity: 0.3,
    top: '30%',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 18,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  featuresContainer: {
    width: '100%',
    marginTop: 24,
  },
  featurePill: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  featureText: {
    fontSize: 16,
    color: 'white',
    textAlign: 'center',
  },
  emojiGrid: {
    marginBottom: 32,
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 40,
    marginHorizontal: 8,
    marginVertical: 4,
  },
  primaryButton: {
    borderRadius: 16,
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  secondaryButton: {
    borderRadius: 16,
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '500',
    color: 'white',
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  dot: {
    height: 8,
    marginHorizontal: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scrollHint: {
    position: 'absolute',
    bottom: 128,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
  },
  scrollHintText: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
});
