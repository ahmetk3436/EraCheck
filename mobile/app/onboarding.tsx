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
import { router } from 'expo-router';
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
import { requestNotificationPermissions } from '../lib/notifications';

const { width: screenWidth } = Dimensions.get('window');
const PAGE_COUNT = 3;

const AnimatedScrollView = Animated.ScrollView;

// Mock decade option for Page 1
const MOCK_OPTIONS = ['1960s', '1970s', '1980s', '1990s'];
const MOCK_OPTION_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  '1960s': { bg: '#3d3510', border: '#d4b800', text: '#ffe566' },
  '1970s': { bg: '#3d2208', border: '#cc7700', text: '#ffcc44' },
  '1980s': { bg: '#380038', border: '#cc00cc', text: '#ff66ff' },
  '1990s': { bg: '#003838', border: '#006699', text: '#33ccff' },
};

// 7-day streak visual for Page 2
const STREAK_DAYS = [
  { done: true, correct: true },
  { done: true, correct: true },
  { done: true, correct: false },
  { done: true, correct: true },
  { done: true, correct: true },
  { done: true, correct: true },
  { done: false, correct: false }, // today
];

export default function OnboardingScreen() {
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

  const handleStartChallenge = async () => {
    hapticMedium();
    setIsNavigating(true);
    await AsyncStorage.setItem('onboarding_complete', 'true');
    // Request notification permission (non-blocking)
    requestNotificationPermissions().catch(() => {});
    await continueAsGuest();
    router.replace('/(protected)/(tabs)/challenge');
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

  // Page animated styles
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

  // Dot indicators
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
            colors={['#C4912A', '#E8C87A']}
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
      {/* Skip Button */}
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
        {/* ─── Page 1: THE HOOK — "Can you guess the decade?" ─── */}
        <View style={[styles.page, { width: screenWidth }]}>
          {/* Sepia gradient background orb */}
          <LinearGradient
            colors={['#C4912A', '#704214']}
            style={styles.gradientOrb}
          />
          <Animated.View style={[{ marginBottom: 16, width: '100%', alignItems: 'center' }, iconStyle0]}>
            {/* Mock photo card */}
            <View style={{
              width: screenWidth - 80,
              height: 160,
              borderRadius: 20,
              backgroundColor: '#1A1610',
              borderWidth: 1,
              borderColor: 'rgba(196,168,130,0.3)',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <LinearGradient
                colors={['rgba(196,145,42,0.15)', 'rgba(18,12,6,0.8)']}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="camera" size={48} color="rgba(196,168,130,0.4)" />
              <Text style={{ color: 'rgba(196,168,130,0.6)', fontSize: 12, marginTop: 8 }}>
                A photo from history...
              </Text>
            </View>
            {/* Mock decade options (2x2) */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, width: screenWidth - 80 }}>
              {MOCK_OPTIONS.map((opt) => {
                const c = MOCK_OPTION_COLORS[opt];
                return (
                  <View
                    key={opt}
                    style={{
                      flex: 1,
                      minWidth: '45%',
                      backgroundColor: c.bg,
                      borderWidth: 1,
                      borderColor: c.border,
                      borderRadius: 12,
                      paddingVertical: 10,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{ color: c.text, fontWeight: '800', fontSize: 16, fontFamily: 'PlayfairDisplay_800ExtraBold' }}>{opt}</Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
          <Animated.Text style={[styles.title, titleStyle0]}>
            Can You Guess{'\n'}the Decade?
          </Animated.Text>
          <Animated.Text style={[styles.description, descStyle0]}>
            Every day, a new photo from history.{'\n'}Guess the decade. Build your streak.
          </Animated.Text>
        </View>

        {/* ─── Page 2: THE STREAK — "Build your daily habit" ─── */}
        <View style={[styles.page, { width: screenWidth }]}>
          <Animated.View style={[{ marginBottom: 24, alignItems: 'center' }, iconStyle1]}>
            {/* Flame icon */}
            <View style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: 'rgba(249,115,22,0.15)',
              borderWidth: 2,
              borderColor: 'rgba(249,115,22,0.4)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 20,
            }}>
              <Ionicons name="flame" size={44} color="#f97316" />
            </View>
            {/* 7-day streak calendar */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {STREAK_DAYS.map((day, i) => (
                <View
                  key={i}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: !day.done
                      ? 'rgba(196,145,42,0.2)'
                      : day.correct
                      ? 'rgba(34,197,94,0.3)'
                      : 'rgba(239,68,68,0.3)',
                    borderWidth: !day.done ? 1.5 : 1,
                    borderColor: !day.done
                      ? '#C4912A'
                      : day.correct
                      ? 'rgba(34,197,94,0.6)'
                      : 'rgba(239,68,68,0.5)',
                  }}
                >
                  {day.done ? (
                    <Ionicons
                      name={day.correct ? 'checkmark' : 'close'}
                      size={16}
                      color={day.correct ? '#22c55e' : '#ef4444'}
                    />
                  ) : (
                    <Text style={{ color: '#C4912A', fontSize: 10, fontWeight: '600' }}>
                      Today
                    </Text>
                  )}
                </View>
              ))}
            </View>
            {/* Streak count */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 }}>
              <Ionicons name="flame" size={20} color="#f97316" />
              <Text style={{ color: '#f97316', fontSize: 20, fontWeight: '800' }}>6 day streak</Text>
            </View>
          </Animated.View>
          <Animated.Text style={[styles.title, titleStyle1]}>
            Build Your Streak
          </Animated.Text>
          <Animated.Text style={[styles.description, descStyle1]}>
            Miss a day, lose your streak.{'\n'}How long can you go?
          </Animated.Text>
        </View>

        {/* ─── Page 3: CTA — "Start Today's Challenge" ─── */}
        <View style={[styles.page, { width: screenWidth }]}>
          <Animated.View style={[{ marginBottom: 24 }, iconStyle2]}>
            {/* Decade timeline emoji */}
            <Text style={{ fontSize: 32, textAlign: 'center', lineHeight: 40 }}>
              ⬛⬛🔴⬛🟡⬛⬛
            </Text>
            <Text style={{ color: '#9CA3AF', fontSize: 13, textAlign: 'center', marginTop: 8 }}>
              Share your results like Wordle
            </Text>
          </Animated.View>

          <Animated.Text style={[styles.title, titleStyle2]}>
            Your First Challenge{'\n'}Awaits
          </Animated.Text>

          <Animated.View style={[{ width: '100%' }, descStyle2]}>
            <Pressable onPress={handleStartChallenge} disabled={isNavigating}>
              <LinearGradient
                colors={['#C4912A', '#8B6914']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.primaryButton}
              >
                {isNavigating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.primaryButtonText}>Start Today's Challenge</Text>
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
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.15,
    top: '25%',
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 38,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  description: {
    fontSize: 17,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 16,
    lineHeight: 24,
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
    fontWeight: '700',
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
