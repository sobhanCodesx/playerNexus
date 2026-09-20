import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { usePlayer } from '@/providers/player-provider';
import { NexusTrackRow } from '@/components/nexus/nexus-cards';
import { NexusIcon, NexusIconButton, NexusSurface, NexusText } from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';

export default function RecentScreen() {
  const router = useRouter();
  const player = usePlayer();
  const tracks = player.recentTracks;

  return (
    <NexusScreen>
      <View style={styles.nav}>
        <NexusIconButton ios="chevron.left" android="arrow_back" accessibilityLabel="Back" onPress={() => router.back()} size={44} />
        <NexusText variant="micro" muted>HISTORY</NexusText>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.hero}>
        <View style={styles.historyObject}>
          <View style={styles.historyArc} />
          <NexusIcon ios="clock.arrow.circlepath" android="history" size={34} color="#B3BAC0" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <NexusText variant="display">Recently played</NexusText>
          <NexusText muted>Latest sessions, ordered by when you returned to them.</NexusText>
        </View>
      </View>

      {tracks.length ? (
        <>
          <Pressable
            onPress={() => {
              player.playQueue(tracks);
              player.openPlayer();
            }}
            style={styles.resume}>
            <NexusIcon ios="play.fill" android="play_arrow" size={20} color="#111519" />
            <NexusText variant="caption" style={{ color: '#111519' }}>Play history</NexusText>
          </Pressable>
          <View style={styles.list}>
            {tracks.map((track, index) => <NexusTrackRow key={track.id} track={track} index={index} />)}
          </View>
        </>
      ) : (
        <NexusSurface style={styles.empty} intensity="soft">
          <NexusText variant="heading">History starts with a play.</NexusText>
          <NexusText muted style={styles.emptyCopy}>Tracks appear here as soon as a listening session begins.</NexusText>
        </NexusSurface>
      )}
    </NexusScreen>
  );
}

const styles = StyleSheet.create({
  nav: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hero: { marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 18 },
  historyObject: { width: 96, height: 96, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
  historyArc: { position: 'absolute', width: 84, height: 84, borderRadius: 42, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', left: 28, top: -24 },
  resume: { marginTop: 28, height: 46, alignSelf: 'flex-start', borderRadius: 23, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#F3F5F6' },
  list: { marginTop: 20 },
  empty: { marginTop: 34, minHeight: 190, borderRadius: 30, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 28 },
  emptyCopy: { textAlign: 'center', maxWidth: 280 },
});
