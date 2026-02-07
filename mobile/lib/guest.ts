import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_MODE_KEY = 'eracheck_guest_mode';
const GUEST_QUIZ_COUNT_KEY = 'eracheck_guest_quiz_count';
const MAX_FREE_QUIZZES = 3;

export const isGuestMode = async (): Promise<boolean> => {
  const val = await AsyncStorage.getItem(GUEST_MODE_KEY);
  return val === 'true';
};

export const getGuestQuizCount = async (): Promise<number> => {
  const val = await AsyncStorage.getItem(GUEST_QUIZ_COUNT_KEY);
  return val ? parseInt(val, 10) : 0;
};

export const incrementGuestQuizCount = async (): Promise<number> => {
  const count = await getGuestQuizCount();
  const newCount = count + 1;
  await AsyncStorage.setItem(GUEST_QUIZ_COUNT_KEY, newCount.toString());
  return newCount;
};

export const canTakeQuiz = async (): Promise<boolean> => {
  const guest = await isGuestMode();
  if (!guest) return true;
  const count = await getGuestQuizCount();
  return count < MAX_FREE_QUIZZES;
};

export const getRemainingQuizzes = async (): Promise<number> => {
  const count = await getGuestQuizCount();
  return Math.max(0, MAX_FREE_QUIZZES - count);
};

export const clearGuestMode = async (): Promise<void> => {
  await AsyncStorage.removeItem(GUEST_MODE_KEY);
  await AsyncStorage.removeItem(GUEST_QUIZ_COUNT_KEY);
};
