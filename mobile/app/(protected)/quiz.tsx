import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../../lib/api';
import { hapticSuccess, hapticError, hapticLight, hapticMedium, hapticWarning, hapticSelection } from '../../lib/haptics';
import { useAuth } from '../../contexts/AuthContext';
import { canTakeQuiz, incrementGuestQuizCount, isGuestMode } from '../../lib/guest';
import Skeleton from '../../components/Skeleton';
import ErrorState from '../../components/ErrorState';

interface QuizOption {
  text: string;
  era: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
}

const QuestionSkeleton: React.FC = () => (
  <View className="flex-1">
    <View className="px-6 py-4 border-b border-gray-800">
      <View className="flex-row items-center justify-between mb-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="w-32 h-5" />
        <View style={{ width: 28 }} />
      </View>
      <Skeleton className="w-full h-2 rounded-full" />
    </View>

    <View className="px-6 py-6">
      <Skeleton className="w-full h-8 mb-2" />
      <Skeleton className="w-2/3 h-8 mb-6" />

      <Skeleton className="w-full h-16 rounded-xl mb-3" />
      <Skeleton className="w-full h-16 rounded-xl mb-3" />
      <Skeleton className="w-full h-16 rounded-xl mb-3" />
      <Skeleton className="w-full h-16 rounded-xl" />
    </View>
  </View>
);

export default function QuizScreen() {
  const { incrementGuestUsage } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shared values for animations
  const progressWidth = useSharedValue<number>(0);
  const optionScale = useSharedValue<number>(1);
  const checkmarkScale = useSharedValue<number>(0);
  const glowOpacity = useSharedValue<number>(0.3);
  const overlayOpacity = useSharedValue<number>(0);
  const questionTranslateX = useSharedValue<number>(0);
  const questionOpacity = useSharedValue<number>(1);

  // Animated styles
  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const questionAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: questionTranslateX.value }],
    opacity: questionOpacity.value,
  }));

  const optionAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: optionScale.value }],
  }));

  const checkmarkAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
    opacity: checkmarkScale.value,
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    shadowColor: '#ec4899',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: glowOpacity.value,
    shadowRadius: 20,
    elevation: 10,
  }));

  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  // Animate progress bar
  const animateProgress = useCallback((current: number, total: number) => {
    const targetWidth = (current / total) * 100;
    progressWidth.value = withTiming(targetWidth, {
      duration: 400,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, []);

  // Start glow animation for submit button
  const startGlowAnimation = useCallback(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  // Advance to next question with animation
  const advanceToNextQuestion = useCallback(() => {
    // Animate out (slide left + fade)
    questionTranslateX.value = withTiming(-50, { duration: 150 });
    questionOpacity.value = withTiming(0, { duration: 150 });

    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      checkmarkScale.value = 0;

      // Reset position to right, then animate in
      questionTranslateX.value = 50;
      questionOpacity.value = 0;

      questionTranslateX.value = withTiming(0, { duration: 300 });
      questionOpacity.value = withTiming(1, { duration: 300 });

      animateProgress(currentIndex + 2, questions.length);
    }, 150);
  }, [currentIndex, questions.length, animateProgress]);

  // Handle option selection with animation
  const handleSelectOption = useCallback((optionIndex: number) => {
    if (selectedOption !== null) return;

    hapticLight();

    // Spring scale animation
    optionScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1.02, { damping: 8, stiffness: 400 }),
      withTiming(1.0, { duration: 100 })
    );

    setSelectedOption(optionIndex);

    // Animate checkmark
    checkmarkScale.value = withSpring(1, { damping: 8, stiffness: 400 });

    const currentQuestion = questions[currentIndex];
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: optionIndex,
    }));

    // Success haptic on final question answer
    if (currentIndex === questions.length - 1) {
      hapticSuccess();
    }

    // Auto-advance after delay — 500ms feels more intentional than 300ms
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        advanceToNextQuestion();
      }
    }, 500);
  }, [selectedOption, questions, currentIndex, advanceToNextQuestion]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (Object.keys(answers).length < questions.length) {
      hapticError();
      Alert.alert('Incomplete', 'Please answer all questions');
      return;
    }

    hapticMedium();
    setSubmitting(true);

    // Animate overlay
    overlayOpacity.value = withTiming(1, { duration: 300 });

    try {
      const { data } = await api.post('/era/quiz', { answers });
      hapticSuccess();

      // Increment guest usage if in guest mode
      const guest = await isGuestMode();
      if (guest) {
        await incrementGuestQuizCount();
        await incrementGuestUsage();
      }

      // Extract result ID from envelope
      const resultData = data.data || data;
      const resultId = resultData.result?.id || resultData.id;

      // Flag for celebration animation on home screen
      await AsyncStorage.setItem('quiz_just_completed', 'true');
      router.replace(`/(protected)/results/${resultId}`);
    } catch (err: any) {
      console.error('Failed to submit quiz:', err);
      hapticError();
      setSubmitting(false);
      overlayOpacity.value = withTiming(0, { duration: 300 });
      setError('Failed to submit quiz. Please try again.');
    }
  }, [answers, questions.length, router, incrementGuestUsage]);

  // Handle previous question
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      hapticLight();

      // Animate out (slide right + fade)
      questionTranslateX.value = withTiming(50, { duration: 150 });
      questionOpacity.value = withTiming(0, { duration: 150 });

      setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setSelectedOption(null);
        checkmarkScale.value = 0;

        // Reset position to left, then animate in
        questionTranslateX.value = -50;
        questionOpacity.value = 0;

        questionTranslateX.value = withTiming(0, { duration: 300 });
        questionOpacity.value = withTiming(1, { duration: 300 });

        animateProgress(currentIndex, questions.length);
      }, 150);
    }
  }, [currentIndex, questions.length, animateProgress]);

  // Load questions
  const loadQuestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check guest limit
      const allowed = await canTakeQuiz();
      if (!allowed) {
        Alert.alert(
          'Free Limit Reached',
          'Sign up for unlimited quizzes!',
          [
            { text: 'Sign Up', onPress: () => router.replace('/(auth)/register') },
            { text: 'Get Premium', onPress: () => router.replace('/(protected)/paywall') },
          ]
        );
        router.back();
        return;
      }

      const { data } = await api.get('/era/questions');
      const questionsData = data.questions || data;
      setQuestions(questionsData);

      hapticSuccess();
    } catch (err: any) {
      console.error('Failed to load questions:', err);
      hapticError();
      const msg = err?.message || '';
      if (msg.includes('refresh token') || msg.includes('401') || err?.response?.status === 401) {
        setError('Please sign in to take the quiz');
      } else if (msg.includes('Network Error')) {
        setError('No internet connection. Check your network and try again.');
      } else {
        setError('Could not load quiz. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleRetry = () => {
    hapticSelection();
    loadQuestions();
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  // Initialize animations when questions load
  useEffect(() => {
    if (!loading && questions.length > 0) {
      questionTranslateX.value = 0;
      questionOpacity.value = 1;
      animateProgress(1, questions.length);
    }
  }, [loading, questions.length]);

  // Start glow animation when all questions answered
  useEffect(() => {
    if (Object.keys(answers).length === questions.length && questions.length > 0) {
      startGlowAnimation();
    }
  }, [answers, questions.length, startGlowAnimation]);

  // Render step indicator dots (sliding window of 7)
  const renderStepDots = useCallback(() => {
    const totalDots = Math.min(7, questions.length);
    const startIndex = Math.max(0, Math.min(currentIndex - 3, questions.length - totalDots));

    const dots = [];
    for (let i = startIndex; i < startIndex + totalDots; i++) {
      const isCompleted = i < currentIndex;
      const isCurrent = i === currentIndex;

      dots.push(
        <View
          key={i}
          style={isCurrent ? { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ec4899' } :
            { width: 6, height: 6, borderRadius: 3, backgroundColor: isCompleted ? '#ec4899' : '#374151' }}
        />
      );
    }
    return dots;
  }, [currentIndex, questions.length]);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950">
        <QuestionSkeleton />
      </SafeAreaView>
    );
  }

  // Error state
  if (error) {
    const isAuthError = error.includes('sign in');
    return (
      <SafeAreaView className="flex-1 bg-gray-950">
        <ErrorState
          icon={isAuthError ? 'lock-closed-outline' : 'help-buoy-outline'}
          title={isAuthError ? 'Sign In Required' : 'Could Not Load Quiz'}
          message={error}
          retryText={isAuthError ? 'Sign In' : 'Try Again'}
          onRetry={isAuthError ? () => router.replace('/(auth)/login') : handleRetry}
          onGoBack={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  // Empty state
  if (questions.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950">
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle-outline" size={64} color="#6b7280" />
          <Text className="text-gray-400 text-lg mt-4">No questions available</Text>
          <Pressable
            onPress={() => router.back()}
            className="mt-6 rounded-xl px-6 py-3"
            style={{ backgroundColor: '#ec4899' }}
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const allAnswered = Object.keys(answers).length === questions.length;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      {/* Progress Section */}
      <View className="pt-4 px-6">
        <View className="flex-row items-center justify-between mb-2">
          <Pressable onPress={() => {
            hapticWarning();
            router.back();
          }}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          <Text className="text-sm text-gray-400 font-medium">
            Question {currentIndex + 1} of {questions.length}
          </Text>
          <Text className="text-xs text-gray-500">
            {Math.round(((currentIndex + 1) / questions.length) * 100)}%
          </Text>
        </View>

        {/* Animated Progress Bar */}
        <View className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <Animated.View style={progressAnimatedStyle} className="h-full rounded-full overflow-hidden">
            <LinearGradient
              colors={['#ec4899', '#a855f7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </View>

        {/* Step Indicator Dots */}
        <View className="flex-row justify-center mt-4" style={{ gap: 8 }}>
          {renderStepDots()}
        </View>
      </View>

      {/* Question + Options */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16 }}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={questionAnimatedStyle}>
          <Text className="text-sm text-pink-400 font-semibold mb-2 text-center">
            Question {currentIndex + 1}
          </Text>
          <Text className="text-2xl font-bold text-white text-center leading-tight mb-8">
            {currentQuestion.question}
          </Text>

          {/* Options */}
          {currentQuestion.options.map((option: QuizOption, index: number) => {
            const isSelected = selectedOption === index;
            const isPreviouslySelected = currentAnswer === index && selectedOption === null;
            const hasSelection = selectedOption !== null;

            return (
              <Animated.View
                key={index}
                style={isSelected ? optionAnimatedStyle : undefined}
                className="mb-3"
              >
                <Pressable
                  onPress={() => handleSelectOption(index)}
                  disabled={selectedOption !== null}
                  style={[
                    {
                      opacity: hasSelection && !isSelected ? 0.5 : 1,
                      borderWidth: isSelected || isPreviouslySelected ? 2 : 1,
                      borderColor: isSelected || isPreviouslySelected ? '#ec4899' : 'rgba(255,255,255,0.1)',
                      borderRadius: 16,
                      overflow: 'hidden',
                    },
                  ]}
                >
                  <LinearGradient
                    colors={isSelected || isPreviouslySelected ? ['rgba(236,72,153,0.25)', 'rgba(168,85,247,0.25)'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    className="py-4 px-5 flex-row items-center"
                  >
                    <View
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: isSelected || isPreviouslySelected ? '#ec4899' : 'rgba(255,255,255,0.08)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 14,
                      }}
                    >
                      {isSelected || isPreviouslySelected ? (
                        <Ionicons name="checkmark" size={18} color="#fff" />
                      ) : (
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600' }}>
                          {String.fromCharCode(65 + index)}
                        </Text>
                      )}
                    </View>
                    <Text className="text-white text-base font-medium flex-1">
                      {option.text}
                    </Text>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            );
          })}
        </Animated.View>
      </ScrollView>

      {/* Navigation / Submit */}
      <View className="px-6 pb-8 flex-row" style={{ gap: 12 }}>
        {currentIndex > 0 && (
          <Pressable
            onPress={handlePrevious}
            className="flex-1 bg-gray-800 rounded-2xl py-4 items-center"
          >
            <Text className="text-white font-semibold text-base">
              Previous
            </Text>
          </Pressable>
        )}

        {isLastQuestion && allAnswered && (
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-2xl overflow-hidden"
          >
            <Animated.View style={glowAnimatedStyle}>
              <LinearGradient
                colors={['#ec4899', '#a855f7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="py-4 flex-row items-center justify-center"
              >
                {submitting ? (
                  <>
                    <ActivityIndicator size="small" color="#ffffff" />
                    <Text className="text-white text-lg font-bold ml-2">
                      Discovering your era...
                    </Text>
                  </>
                ) : (
                  <Text className="text-white text-lg font-bold">
                    Reveal My Era ✨
                  </Text>
                )}
              </LinearGradient>
            </Animated.View>
          </Pressable>
        )}
      </View>

      {/* Loading Overlay */}
      <Animated.View
        style={[overlayAnimatedStyle, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}
        pointerEvents={submitting ? 'auto' : 'none'}
      >
        <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <ActivityIndicator size="large" color="#ec4899" />
          <Text className="text-lg text-white mt-4 font-medium">
            Discovering your era...
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
