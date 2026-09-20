import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NexusDock } from '@/components/nexus/nexus-dock';
import { NexusPlayerLayer } from '@/components/nexus/nexus-player-layer';
import { nexusTokens } from '@/design/nexus-tokens';
import { PlayerProvider } from '@/providers/player-provider';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <PlayerProvider>
          <View style={styles.root}>
            <StatusBar style="light" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: nexusTokens.colors.obsidian },
                animation: 'fade',
                animationDuration: 260,
              }}
            />
            <NexusDock />
            <NexusPlayerLayer />
          </View>
        </PlayerProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: nexusTokens.colors.obsidian },
});
