import AsyncStorage from '@react-native-async-storage/async-storage';

const GUEST_MODE_KEY = 'eracheck_guest_mode';
const GUEST_USAGE_KEY = 'eracheck_guest_usage';
const MAX_FREE_QUIZZES = 3;
const MAX_FREE_CHALLENGES = 3;

export type GuestFeature = 'quiz' | 'challenge';

interface GuestUsage {
  quizzes: number;
  challenges: number;
}

export const isGuestMode = async (): Promise<boolean> => {
  const val = await AsyncStorage.getItem(GUEST_MODE_KEY);
  return val === 'true';
};

const getGuestUsage = async (): Promise<GuestUsage> => {
  const val = await AsyncStorage.getItem(GUEST_USAGE_KEY);
  if (val) {
    try {
      return JSON.parse(val);
    } catch {
      return { quizzes: 0, challenges: 0 };
    }
  }
  return { quizzes: 0, challenges: 0 };
};

const saveGuestUsage = async (usage: GuestUsage): Promise<void> => {
  await AsyncStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(usage));
};

export const canUseFeature = async (feature: GuestFeature): Promise<boolean> => {
  const guest = await isGuestMode();
  if (!guest) return true;
  
  const usage = await getGuestUsage();
  const maxUses = feature === 'quiz' ? MAX_FREE_QUIZZES : MAX_FREE_CHALLENGES;
  const key = feature === 'quiz' ? 'quizzes' : 'challenges';
  return usage[key] < maxUses;
};

export const incrementUsage = async (feature: GuestFeature): Promise<number> => {
  const usage = await getGuestUsage();
  const key = feature === 'quiz' ? 'quizzes' : 'challenges';
  const newCount = usage[key] + 1;
  usage[key] = newCount;
  await saveGuestUsage(usage);
  return newCount;
};

export const getUsageCount = async (feature: GuestFeature): Promise<number> => {
  const usage = await getGuestUsage();
  const key = feature === 'quiz' ? 'quizzes' : 'challenges';
  return usage[key];
};

export const getRemainingUses = async (feature: GuestFeature): Promise<number> => {
  const usage = await getGuestUsage();
  const maxUses = feature === 'quiz' ? MAX_FREE_QUIZZES : MAX_FREE_CHALLENGES;
  const key = feature === 'quiz' ? 'quizzes' : 'challenges';
  return Math.max(0, maxUses - usage[key]);
};

export const getGuestQuizCount = async (): Promise<number> => {
  return getUsageCount('quiz');
};

export const incrementGuestQuizCount = async (): Promise<number> => {
  return incrementUsage('quiz');
};

export const canTakeQuiz = async (): Promise<boolean> => {
  return canUseFeature('quiz');
};

export const getRemainingQuizzes = async (): Promise<number> => {
  return getRemainingUses('quiz');
};

export const clearGuestMode = async (): Promise<void> => {
  await AsyncStorage.removeItem(GUEST_MODE_KEY);
  await AsyncStorage.removeItem(GUEST_USAGE_KEY);
};