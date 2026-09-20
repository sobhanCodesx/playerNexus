import { PropsWithChildren } from 'react';
import { ScrollView, ScrollViewProps, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlayer } from '@/providers/player-provider';
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
  const content = (
    <View
      style={[
        styles.content,
        { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 184 },
        contentContainerStyle,
      ]}>
      {children}
    </View>
  );

  return (
    <View
      style={[
        styles.root,
        gradientBackground([theme.backgroundTint, '#080A0D', nexusTokens.colors.obsidian], 170),
      ]}>
      <NexusAura
        palette={track.palette}
        active={isPlaying}
        bands={audioBands}
        size={520}
        style={styles.aura}
      />
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
  scroll: { flexGrow: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
});
