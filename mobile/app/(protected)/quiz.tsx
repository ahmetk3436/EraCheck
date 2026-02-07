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

interface QuizOption {
  id: string;
  text: string;
  points: {
    [key: string]: number;
  };
}

interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
}

export default function QuizScreen() {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const { data } = await api.get('/era/questions');
      setQuestions(data);
    } catch (error: any) {
      console.error('Failed to load questions:', error);
      hapticError();
      Alert.alert('Error', 'Failed to load quiz questions');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (optionId: string) => {
    hapticLight();
    const currentQuestion = questions[currentIndex];
    setAnswers({
      ...answers,
      [currentQuestion.id]: optionId,
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
      router.replace(`/(protected)/results/${data.id}`);
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

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentIndex === questions.length - 1;
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : null;

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
          <View className="w-7" />
        </View>

        {/* Progress Bar */}
        <View className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <View
            className="h-full bg-pink-500"
            style={{ width: `${progress}%` }}
          />
        </View>
      </View>

      <ScrollView className="flex-1 px-6 py-6">
        {/* Question */}
        <Text className="text-2xl font-bold text-white mb-6">
          {currentQuestion.question}
        </Text>

        {/* Options */}
        <View className="space-y-3">
          {currentQuestion.options.map((option) => {
            const isSelected = currentAnswer === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                onPress={() => handleSelectOption(option.id)}
                className={`rounded-xl p-4 border-2 ${
                  isSelected
                    ? 'border-pink-500 bg-pink-500/10'
                    : 'border-gray-800 bg-gray-900'
                }`}
              >
                <View className="flex-row items-center">
                  <View
                    className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3 ${
                      isSelected ? 'border-pink-500 bg-pink-500' : 'border-gray-600'
                    }`}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={16} color="#fff" />
                    )}
                  </View>
                  <Text
                    className={`flex-1 text-base ${
                      isSelected ? 'text-pink-300 font-semibold' : 'text-gray-300'
                    }`}
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
      <View className="px-6 py-4 border-t border-gray-800 flex-row gap-3">
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
            className="flex-1 bg-pink-500 rounded-xl py-4 items-center"
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
