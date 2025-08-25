import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Wrapper for haptic feedback that works with Expo
export const HapticFeedback = {
  trigger: (
    type: string,
    options?: { enableVibrateFallback?: boolean; ignoreAndroidSystemSettings?: boolean }
  ) => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      switch (type) {
        case 'impactLight':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'impactMedium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'impactHeavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'notificationSuccess':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'notificationWarning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'notificationError':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case 'selection':
        default:
          Haptics.selectionAsync();
          break;
      }
    }
  },
  
  // Compatibility methods
  impactLight: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  impactMedium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  impactHeavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  selection: () => Haptics.selectionAsync(),
  notificationSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  notificationWarning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  notificationError: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};

export default HapticFeedback;