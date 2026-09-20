import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  visualQuality: NexusVisualQuality;
};

type SettingsContextValue = {
  hydrated: boolean;
  settings: NexusSettings;
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
  visualQuality: 'balanced',
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function NexusSettingsProvider({ children }: PropsWithChildren) {
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState<NexusSettings>(defaults);

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

  const value = useMemo<SettingsContextValue>(
    () => ({
      hydrated,
      settings,
      updateSetting,
      completeOnboarding,
      resetOnboarding,
    }),
    [completeOnboarding, hydrated, resetOnboarding, settings, updateSetting],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useNexusSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useNexusSettings must be used inside NexusSettingsProvider');
  return context;
}
