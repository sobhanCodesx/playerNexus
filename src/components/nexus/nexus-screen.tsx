import { PropsWithChildren } from 'react';
import { ScrollView, ScrollViewProps, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlayer } from '@/providers/player-provider';
import { useNexusSettings } from '@/providers/settings-provider';
import { gradientBackground, nexusTokens } from '@/design/nexus-tokens';
import { NexusAura } from './nexus-primitives';

export function NexusScreen({
  children,
  scroll = true,
  contentContainerStyle,
  ...props
}: PropsWithChildren<ScrollViewProps & { scroll?: boolean }>) {
  const insets = useSafeAreaInsets();
  const { track, theme, isPlaying, audioBands } = usePlayer();
  const { settings } = useNexusSettings();

  const background =
    settings.themeMode === 'amoled'
      ? { backgroundColor: '#000000' }
      : settings.themeMode === 'obsidian'
        ? gradientBackground(['#11151A', '#080A0D', '#050608'], 170)
        : settings.themeMode === 'light'
          ? gradientBackground(['#F2EFE9', '#E6E2DB', '#D8D4CC'], 170)
          : gradientBackground([theme.backgroundTint, '#080A0D', nexusTokens.colors.obsidian], 170);

  const showAura = settings.themeMode === 'dynamic' || settings.themeMode === 'light';

  const content = (
    <View
      style={[
        styles.content,
        !scroll && styles.staticContent,
        { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 184 },
        contentContainerStyle,
      ]}>
      {children}
    </View>
  );

  return (
    <View style={[styles.root, background]}>
      {showAura ? (
        <NexusAura
          palette={track.palette}
          active={isPlaying}
          bands={audioBands}
          size={520}
          style={[styles.aura, settings.themeMode === 'light' && styles.lightAura]}
        />
      ) : null}
      {scroll ? (
        <ScrollView
          {...props}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}>
          {content}
        </ScrollView>
      ) : content}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: nexusTokens.colors.obsidian,
  },
  aura: {
    position: 'absolute',
    top: -270,
    right: -230,
    opacity: 0.42,
  },
  lightAura: { opacity: 0.16 },
  scroll: { flexGrow: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  staticContent: {
    flex: 1,
  },
});
