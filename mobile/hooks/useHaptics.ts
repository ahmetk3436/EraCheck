import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export const useHaptics = () => {
  const hapticSuccess = () => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const hapticError = () => {
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const hapticSelection = () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
  };

  const hapticImpact = (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (Platform.OS === 'ios') {
      const impactStyle = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      }[style];
      Haptics.impactAsync(impactStyle);
    }
  };

  return { hapticSuccess, hapticError, hapticSelection, hapticImpact };
};
