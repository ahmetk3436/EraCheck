import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api';
import { hapticSuccess, hapticError, hapticLight } from '../../lib/haptics';
import { useAuth } from '../../contexts/AuthContext';
import { canTakeQuiz, incrementGuestQuizCount, isGuestMode } from '../../lib/guest';

interface QuizOption {
  text: string;
  era: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
}

export default function QuizScreen() {
  const router = useRouter();
  const { incrementGuestUsage } = useAuth();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
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
    } catch (error: any) {
      console.error('Failed to load questions:', error);
      hapticError();
      Alert.alert('Error', 'Failed to load quiz questions');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (optionIndex: number) => {
    hapticLight();
    const currentQuestion = questions[currentIndex];
    setAnswers({
      ...answers,
      [currentQuestion.id]: optionIndex,
    });

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
      router.replace(`/(protected)/results/${resultId}`);
    } catch (error: any) {
      console.error('Failed to submit quiz:', error);
      hapticError();
      Alert.alert('Error', 'Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
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
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#ec4899" />
        </View>
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
      {/* Header */}
      <View className="px-6 py-4 border-b border-gray-800">
        <View className="flex-row items-center justify-between mb-3">
          <TouchableOpacity onPress={() => router.back()}>
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
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text className="text-white font-semibold text-base">
                Get Results
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
