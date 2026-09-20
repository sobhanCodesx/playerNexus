import { useEffect, useRef } from 'react';
import { DeviceMotion } from 'expo-sensors';
import {
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

type ParallaxValues = {
  x: SharedValue<number>;
  y: SharedValue<number>;
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export function useNexusDeviceParallax(enabled: boolean): ParallaxValues {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const baseline = useRef<{ beta: number; gamma: number } | null>(null);

  useEffect(() => {
    if (!enabled) {
      baseline.current = null;
      x.value = withTiming(0, { duration: 240 });
      y.value = withTiming(0, { duration: 240 });
      return;
    }

    let mounted = true;
    let subscription: { remove(): void } | null = null;

    DeviceMotion.isAvailableAsync()
      .then((available) => {
        if (!mounted || !available) return;

        DeviceMotion.setUpdateInterval(48);
        subscription = DeviceMotion.addListener((measurement) => {
          const rotation = measurement.rotation;
          if (!rotation) return;

          if (!baseline.current) {
            baseline.current = { beta: rotation.beta, gamma: rotation.gamma };
            return;
          }

          const deltaGamma = clamp(rotation.gamma - baseline.current.gamma, -0.28, 0.28);
          const deltaBeta = clamp(rotation.beta - baseline.current.beta, -0.24, 0.24);

          x.value = withTiming(deltaGamma / 0.28, { duration: 90 });
          y.value = withTiming(deltaBeta / 0.24, { duration: 90 });
        });
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
      baseline.current = null;
      subscription?.remove();
      x.value = withTiming(0, { duration: 180 });
      y.value = withTiming(0, { duration: 180 });
    };
  }, [enabled, x, y]);

  return { x, y };
}
