import * as Haptics from 'expo-haptics';

let hapticsEnabled = true;

export function configureNexusHaptics(enabled: boolean) {
  hapticsEnabled = enabled;
}

const ignore = (promise: Promise<void>) => promise.catch(() => undefined);
const run = (factory: () => Promise<void>) => {
  if (!hapticsEnabled) return;
  ignore(factory());
};

export const nexusHaptics = {
  play() {
    run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
  },
  transport() {
    run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
  },
  favorite() {
    run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
  },
  lift() {
    run(() => Haptics.selectionAsync());
  },
  seek() {
    run(() => Haptics.selectionAsync());
  },
  settle() {
    run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft));
  },
};
