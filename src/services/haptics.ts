import * as Haptics from 'expo-haptics';

const ignore = (promise: Promise<void>) => promise.catch(() => undefined);

export const nexusHaptics = {
  play() {
    ignore(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
  },
  transport() {
    ignore(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  favorite() {
    ignore(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  lift() {
    ignore(Haptics.selectionAsync());
  },
  seek() {
    ignore(Haptics.selectionAsync());
  },
  settle() {
    ignore(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
  },
};
