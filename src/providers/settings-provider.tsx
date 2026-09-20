import AsyncStorage from '@react-native-async-storage/async-storage';
import { AccessibilityInfo, AppState, Platform } from 'react-native';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { configureNexusHaptics } from '@/services/haptics';

export type NexusThemeMode = 'dynamic' | 'amoled' | 'obsidian' | 'light';
export type NexusVisualQuality = 'low' | 'balanced' | 'ultra';

export type NexusSettings = {
  onboardingComplete: boolean;
  themeMode: NexusThemeMode;
  reduceMotion: boolean;
  depthMotion: boolean;
  haptics: boolean;
  gapless: boolean;
  crossfadeSeconds: number;
  visualQuality: NexusVisualQuality;
};

type SettingsContextValue = {
  hydrated: boolean;
  settings: NexusSettings;
  effectiveVisualQuality: NexusVisualQuality;
  effectiveReduceMotion: boolean;
  screenReaderEnabled: boolean;
  highTextContrastEnabled: boolean;
  updateSetting: <K extends keyof NexusSettings>(key: K, value: NexusSettings[K]) => void;
  completeOnboarding: (themeMode: NexusThemeMode) => void;
  resetOnboarding: () => void;
};

const STORAGE_KEY = 'nexus.settings.v1';

const defaults: NexusSettings = {
  onboardingComplete: false,
  themeMode: 'dynamic',
  reduceMotion: false,
  depthMotion: true,
  haptics: true,
  gapless: true,
  crossfadeSeconds: 2,
  visualQuality: 'balanced',
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function NexusSettingsProvider({ children }: PropsWithChildren) {
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState<NexusSettings>(defaults);
  const [effectiveVisualQuality, setEffectiveVisualQuality] = useState<NexusVisualQuality>(
    defaults.visualQuality,
  );
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const [highTextContrastEnabled, setHighTextContrastEnabled] = useState(false);
  const performanceWindow = useRef({
    lastFrameAt: 0,
    frames: 0,
    stalledFrames: 0,
    recoveryWindows: 0,
  });

  useEffect(() => {
    let active = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (active) setSystemReduceMotion(enabled);
      })
      .catch(() => undefined);
    AccessibilityInfo.isScreenReaderEnabled()
      .then((enabled) => {
        if (active) setScreenReaderEnabled(enabled);
      })
      .catch(() => undefined);
    if (Platform.OS === 'android') {
      AccessibilityInfo.isHighTextContrastEnabled()
        .then((enabled) => {
          if (active) setHighTextContrastEnabled(enabled);
        })
        .catch(() => undefined);
    }

    const reduceMotion = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setSystemReduceMotion,
    );
    const screenReader = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setScreenReaderEnabled,
    );
    const refreshHighContrast = () => {
      if (Platform.OS !== 'android') return;
      AccessibilityInfo.isHighTextContrastEnabled()
        .then(setHighTextContrastEnabled)
        .catch(() => undefined);
    };
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refreshHighContrast();
    });

    return () => {
      active = false;
      reduceMotion.remove();
      screenReader.remove();
      appState.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const parsed = JSON.parse(raw) as Partial<NexusSettings>;
        setSettings({ ...defaults, ...parsed });
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    configureNexusHaptics(settings.haptics);
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => undefined);
  }, [hydrated, settings]);

  useEffect(() => {
    setEffectiveVisualQuality(settings.visualQuality);
    performanceWindow.current = {
      lastFrameAt: 0,
      frames: 0,
      stalledFrames: 0,
      recoveryWindows: 0,
    };
  }, [settings.visualQuality]);

  useEffect(() => {
    if (!hydrated) return;

    const levels: NexusVisualQuality[] = ['low', 'balanced', 'ultra'];
    const userCeiling = levels.indexOf(settings.visualQuality);
    let frameHandle = 0;
    let active = true;

    const sampleFrame = (now: number) => {
      if (!active) return;
      const window = performanceWindow.current;
      if (window.lastFrameAt > 0) {
        const delta = now - window.lastFrameAt;
        if (delta > 0 && delta < 250) {
          window.frames += 1;
          if (delta > 29) window.stalledFrames += 1;

          if (window.frames >= 90) {
            const stallRatio = window.stalledFrames / window.frames;
            setEffectiveVisualQuality((current) => {
              const currentLevel = levels.indexOf(current);

              if (stallRatio >= 0.12 && currentLevel > 0) {
                window.recoveryWindows = 0;
                return levels[currentLevel - 1];
              }

              if (stallRatio <= 0.025 && currentLevel < userCeiling) {
                window.recoveryWindows += 1;
                if (window.recoveryWindows >= 5) {
                  window.recoveryWindows = 0;
                  return levels[Math.min(userCeiling, currentLevel + 1)];
                }
              } else {
                window.recoveryWindows = 0;
              }

              return current;
            });
            window.frames = 0;
            window.stalledFrames = 0;
          }
        }
      }
      window.lastFrameAt = now;
      frameHandle = requestAnimationFrame(sampleFrame);
    };

    frameHandle = requestAnimationFrame(sampleFrame);
    return () => {
      active = false;
      cancelAnimationFrame(frameHandle);
    };
  }, [hydrated, settings.visualQuality]);

  const updateSetting = useCallback(
    <K extends keyof NexusSettings>(key: K, value: NexusSettings[K]) => {
      setSettings((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const completeOnboarding = useCallback((themeMode: NexusThemeMode) => {
    setSettings((current) => ({
      ...current,
      themeMode,
      onboardingComplete: true,
    }));
  }, []);

  const resetOnboarding = useCallback(() => {
    setSettings((current) => ({ ...current, onboardingComplete: false }));
  }, []);

  const effectiveReduceMotion = settings.reduceMotion || systemReduceMotion;

  const value = useMemo<SettingsContextValue>(
    () => ({
      hydrated,
      settings,
      effectiveVisualQuality,
      effectiveReduceMotion,
      screenReaderEnabled,
      highTextContrastEnabled,
      updateSetting,
      completeOnboarding,
      resetOnboarding,
    }),
    [
      completeOnboarding,
      effectiveReduceMotion,
      effectiveVisualQuality,
      highTextContrastEnabled,
      hydrated,
      resetOnboarding,
      screenReaderEnabled,
      settings,
      updateSetting,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useNexusSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useNexusSettings must be used inside NexusSettingsProvider');
  return context;
}
