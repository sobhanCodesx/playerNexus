import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';

import { NexusVisualizerField } from '@/components/nexus/nexus-visualizer-field';
import { NexusIconButton, NexusText } from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';
import { usePlayer } from '@/providers/player-provider';

export default function VisualizerScreen() {
  const router = useRouter();
  const player = usePlayer();
  const { width, height } = useWindowDimensions();
  const size = Math.min(width - 28, height * 0.52, 410);

  return (
    <NexusScreen scroll={false} contentContainerStyle={styles.content}>
      <View style={styles.nav}>
        <NexusIconButton
          ios="chevron.left"
          android="arrow_back"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          size={44}
        />
        <View style={styles.liveLabel}>
          <View style={[styles.liveDot, { backgroundColor: player.audioReactiveEnabled ? player.theme.accent : '#6F777E' }]} />
          <NexusText variant="micro" muted>
            {player.audioReactiveEnabled ? 'LIVE AUDIO MATTER' : 'VISUAL MODE'}
          </NexusText>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.titleBlock}>
        <NexusText variant="display">Sound, given matter.</NexusText>
        <NexusText muted>
          Bass changes volume. Mids reshape the field. High frequencies fracture light.
        </NexusText>
      </View>

      <View style={styles.fieldWrap}>
        <NexusVisualizerField
          palette={player.track.palette}
          bands={player.audioBands}
          active={player.isPlaying}
          size={size}
        />
        <View pointerEvents="none" style={styles.trackLabel}>
          <NexusText variant="heading" numberOfLines={1}>{player.track.title}</NexusText>
          <NexusText variant="micro" muted>{player.track.artist.toUpperCase()}</NexusText>
        </View>
      </View>

      {!player.audioReactiveEnabled ? (
        <Pressable
          onPress={player.enableAudioReactive}
          style={styles.enable}>
          <NexusText variant="caption">Enable live audio analysis</NexusText>
          <NexusText variant="micro" muted>ON-DEVICE PCM · NO AUDIO LEAVES THE PHONE</NexusText>
        </Pressable>
      ) : null}

      <View style={styles.controls}>
        <NexusIconButton ios="backward.end.fill" android="skip_previous" accessibilityLabel="Previous" onPress={player.previous} size={52} />
        <NexusIconButton
          ios={player.isPlaying ? 'pause.fill' : 'play.fill'}
          android={player.isPlaying ? 'pause' : 'play_arrow'}
          accessibilityLabel={player.isPlaying ? 'Pause' : 'Play'}
          onPress={player.togglePlayback}
          size={68}
          primary
        />
        <NexusIconButton ios="forward.end.fill" android="skip_next" accessibilityLabel="Next" onPress={player.next} size={52} />
      </View>
    </NexusScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 18, paddingBottom: 24 },
  nav: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  liveLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  titleBlock: { marginTop: 18, gap: 8, maxWidth: 340 },
  fieldWrap: { flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center' },
  trackLabel: { position: 'absolute', bottom: 15, alignItems: 'center', gap: 3, maxWidth: 280 },
  enable: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginBottom: 18,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    paddingBottom: 8,
  },
});
