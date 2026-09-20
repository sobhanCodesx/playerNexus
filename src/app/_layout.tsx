import { useEffect } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NexusDock } from '@/components/nexus/nexus-dock';
import { NexusPlayerLayer } from '@/components/nexus/nexus-player-layer';
import { nexusTokens } from '@/design/nexus-tokens';
import { PlayerProvider } from '@/providers/player-provider';
import { NexusCollectionsProvider } from '@/providers/collections-provider';
import { NexusSettingsProvider, useNexusSettings } from '@/providers/settings-provider';

function NexusAppShell() {
  const router = useRouter();
  const pathname = usePathname();
  const { effectiveReduceMotion, hydrated, settings } = useNexusSettings();

  useEffect(() => {
    if (!hydrated) return;
    if (!settings.onboardingComplete && pathname !== '/onboarding') {
      router.replace('/onboarding');
      return;
    }
    if (settings.onboardingComplete && pathname === '/onboarding') {
      router.replace('/');
    }
  }, [hydrated, pathname, router, settings.onboardingComplete]);

  if (!hydrated) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style={settings.themeMode === 'light' ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: nexusTokens.colors.obsidian },
          animation: effectiveReduceMotion ? 'none' : 'fade',
          animationDuration: effectiveReduceMotion ? 0 : 260,
        }}
      />
      <NexusDock />
      <NexusPlayerLayer />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <NexusSettingsProvider>
          <NexusCollectionsProvider>
            <PlayerProvider>
              <NexusAppShell />
            </PlayerProvider>
          </NexusCollectionsProvider>
        </NexusSettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: nexusTokens.colors.obsidian },
});
