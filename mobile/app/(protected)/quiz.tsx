import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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
    {/* Header skeleton */}
    <View className="px-6 py-4 border-b border-gray-800">
      <View className="flex-row items-center justify-between mb-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <Skeleton className="w-32 h-5" />
        <View style={{ width: 28 }} />
      </View>
      <Skeleton className="w-full h-2 rounded-full" />
    </View>

    <View className="px-6 py-6">
      {/* Question skeleton */}
      <Skeleton className="w-full h-8 mb-2" />
      <Skeleton className="w-2/3 h-8 mb-6" />

      {/* Options skeleton */}
      <Skeleton className="w-full h-16 rounded-xl mb-3" />
      <Skeleton className="w-full h-16 rounded-xl mb-3" />
      <Skeleton className="w-full h-16 rounded-xl mb-3" />
      <Skeleton className="w-full h-16 rounded-xl" />
    </View>
  </View>
);

const SubmissionOverlay: React.FC<{ visible: boolean }> = ({ visible }) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
  >
    <View className="flex-1 items-center justify-center" style={{ backgroundColor: 'rgba(3,7,18,0.9)' }}>
      <View className="bg-gray-900 rounded-3xl p-8 items-center mx-6">
        <ActivityIndicator size="large" color="#ec4899" />
        <Text className="text-white text-xl font-semibold mt-6 text-center">
          Analyzing your aesthetic...
        </Text>
        <Text className="text-gray-400 text-sm mt-2 text-center">
          This may take a moment
        </Text>
      </View>
    </View>
  </Modal>
);

export default function QuizScreen() {
  const router = useRouter();
  const { incrementGuestUsage } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

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
      // Extract questions from envelope
      const questionsData = data.questions || data;
      setQuestions(questionsData);

      hapticSuccess();
    } catch (err: any) {
      console.error('Failed to load questions:', err);
      hapticError();
      setError('Could not load quiz');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRetry = () => {
    hapticSelection();
    loadQuestions();
  };

  const handleSelectOption = (optionIndex: number) => {
    hapticLight();
    const currentQuestion = questions[currentIndex];
    setAnswers({
      ...answers,
      [currentQuestion.id]: optionIndex,
    });

    // Success haptic on final question answer
    if (currentIndex === questions.length - 1) {
      hapticSuccess();
    }

    // Auto-advance to next question after short delay
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }, 300);
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      hapticError();
      Alert.alert('Incomplete', 'Please answer all questions');
      return;
    }

    // Medium haptic for major action
    hapticMedium();
    setSubmitting(true);
    try {
      const { data } = await api.post('/era/quiz', { answers });
      hapticSuccess();

      // Increment guest usage if in guest mode
      const guest = await isGuestMode();
      if (guest) {
        await incrementGuestQuizCount();
        await incrementGuestUsage();
      }

      // Extract result ID from envelope: {error, data: {result, profile}}
      const resultData = data.data || data;
      const resultId = resultData.result?.id || resultData.id;

      // Flag for celebration animation on home screen
      await AsyncStorage.setItem('quiz_just_completed', 'true');
      router.replace(`/(protected)/results/${resultId}`);
    } catch (err: any) {
      console.error('Failed to submit quiz:', err);
      hapticError();
      setSubmitting(false);
      setError('Failed to submit quiz. Please try again.');
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      hapticLight();
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950">
        <QuestionSkeleton />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950">
        <ErrorState
          icon="help-buoy-outline"
          title="Could Not Load Quiz"
          message="We couldn't load the quiz questions"
          retryText="Try Again"
          onRetry={handleRetry}
        />
      </SafeAreaView>
    );
  }

  if (questions.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-950">
        <View className="flex-1 items-center justify-center px-8">
          <Ionicons name="alert-circle-outline" size={64} color="#6b7280" />
          <Text className="text-gray-400 text-lg mt-4">No questions available</Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="mt-6 rounded-xl px-6 py-3"
            style={{ backgroundColor: '#ec4899' }}
          >
            <Text className="text-white font-semibold">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentIndex === questions.length - 1;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;

  return (
    <SafeAreaView className="flex-1 bg-gray-950">
      {/* Submission Overlay */}
      <SubmissionOverlay visible={submitting} />

      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-800">
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity onPress={() => {
            // Warning haptic for destructive action
            hapticWarning();
            router.back();
          }}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-white">
            Question {currentIndex + 1}/{questions.length}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Progress Bar */}
        <View className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <View
            className="h-full"
            style={{ width: `${progress}%`, backgroundColor: '#ec4899' }}
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        {/* Question */}
        <Text className="text-2xl font-bold text-white mb-6">
          {currentQuestion.question}
        </Text>

        {/* Options */}
        <View>
          {currentQuestion.options.map((option: QuizOption, index: number) => {
            const isSelected = currentAnswer === index;
            return (
              <TouchableOpacity
                key={index}
                onPress={() => handleSelectOption(index)}
                className="rounded-xl p-4 mb-3"
                style={{
                  borderWidth: 2,
                  borderColor: isSelected ? '#ec4899' : '#374151',
                  backgroundColor: isSelected ? 'rgba(236,72,153,0.1)' : '#111827',
                }}
              >
                <View className="flex-row items-center">
                  <View
                    className="w-6 h-6 rounded-full items-center justify-center mr-3"
                    style={{
                      borderWidth: 2,
                      borderColor: isSelected ? '#ec4899' : '#4b5563',
                      backgroundColor: isSelected ? '#ec4899' : 'transparent',
                    }}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <Text
                    className="flex-1 text-base"
                    style={{ color: isSelected ? '#f9a8d4' : '#d1d5db' }}
                  >
                    {option.text}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {/* Navigation */}
      <View className="px-6 py-4 border-t border-gray-800 flex-row" style={{ gap: 12 }}>
        {currentIndex > 0 && (
          <TouchableOpacity
            onPress={handlePrevious}
            className="flex-1 bg-gray-800 rounded-xl py-4 items-center"
          >
            <Text className="text-white font-semibold text-base">
              Previous
            </Text>
          </TouchableOpacity>
        )}

        {isLastQuestion && Object.keys(answers).length === questions.length && (
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={submitting}
            className="flex-1 rounded-xl py-4 items-center"
            style={{ backgroundColor: '#ec4899' }}
          >
            <Text className="text-white font-semibold text-base">
              Get Results
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
