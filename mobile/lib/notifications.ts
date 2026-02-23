import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const NOTIFICATION_KEY = 'streak_notification_scheduled';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Schedule a daily reminder at 8pm local time if:
 * - User has an active streak
 * - Today's challenge is NOT yet completed
 */
export async function scheduleStreakReminder(): Promise<void> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return;

    // Cancel any existing streak reminders first
    await cancelStreakReminder();

    // Check if today's challenge is already done
    const today = new Date().toISOString().split('T')[0];
    const lastCompleted = await AsyncStorage.getItem('challenge_completed_date');
    if (lastCompleted === today) return; // Already done today, no reminder needed

    // Schedule for 8pm today (or tomorrow if past 8pm)
    const now = new Date();
    const trigger = new Date();
    trigger.setHours(20, 0, 0, 0);

    // If it's already past 8pm, schedule for tomorrow
    if (now >= trigger) {
      trigger.setDate(trigger.getDate() + 1);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Don't lose your streak! 🔥",
        body: "Today's photo challenge is waiting. Can you guess the decade?",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    });

    await AsyncStorage.setItem(NOTIFICATION_KEY, trigger.toISOString());
  } catch (err) {
    console.warn('Failed to schedule notification:', err);
  }
}

export async function cancelStreakReminder(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(NOTIFICATION_KEY);
  } catch {
    // silent
  }
}

/**
 * Call after completing today's challenge to cancel pending reminder
 * and schedule tomorrow's
 */
export async function onChallengeCompleted(): Promise<void> {
  await cancelStreakReminder();

  // Schedule reminder for tomorrow at 8pm
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(20, 0, 0, 0);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "New challenge unlocked! 📅",
        body: "A fresh photo is waiting. Keep your streak alive!",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: tomorrow,
      },
    });
  } catch (err) {
    console.warn('Failed to schedule next-day notification:', err);
  }
}
