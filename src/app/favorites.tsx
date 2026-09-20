import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { usePlayer } from '@/providers/player-provider';
import { NexusTrackList } from '@/components/nexus/nexus-track-list';
import { NexusIcon, NexusIconButton, NexusSurface, NexusText } from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';

export default function FavoritesScreen() {
  const router = useRouter();
  const player = usePlayer();
  const tracks = player.favoriteTracks;
  const playFromFavorites = useCallback(
    (track: (typeof tracks)[number]) => {
      player.playQueue(tracks, track.id);
      player.openPlayer();
    },
    [player.openPlayer, player.playQueue, tracks],
  );

  const shuffle = () => {
    const shuffled = [...tracks];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
    }
    player.playQueue(shuffled);
    player.openPlayer();
  };

  const header = (
    <>
      <View style={styles.nav}>
        <NexusIconButton ios="chevron.left" android="arrow_back" accessibilityLabel="Back" onPress={() => router.back()} size={44} />
        <NexusText variant="micro" muted>FAVORITES</NexusText>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.hero}>
        <View style={[styles.pulse, { borderColor: player.theme.accent + '55' }]}>
          <View style={[styles.pulseCore, { backgroundColor: player.theme.accent }]} />
          <NexusIcon ios="heart.fill" android="favorite" size={34} color="#F4F6F7" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <NexusText variant="display">Your pulse</NexusText>
          <NexusText muted>{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'} you chose to keep close.</NexusText>
        </View>
      </View>

      {tracks.length ? (
        <View style={styles.actions}>
          <Pressable
            onPress={() => {
              player.playQueue(tracks);
              player.openPlayer();
            }}
            style={styles.primary}>
            <NexusIcon ios="play.fill" android="play_arrow" size={21} color="#111519" />
            <NexusText variant="caption" style={{ color: '#111519' }}>Play</NexusText>
          </Pressable>
          <Pressable onPress={shuffle} style={styles.secondary}>
            <NexusIcon ios="shuffle" android="shuffle" size={19} />
            <NexusText variant="caption">Shuffle</NexusText>
          </Pressable>
        </View>
      ) : null}
    </>
  );

  return (
    <NexusScreen scroll={false} contentContainerStyle={styles.screen}>
      <NexusTrackList
        tracks={tracks}
        header={header}
        onTrackPress={playFromFavorites}
        contentContainerStyle={styles.listContent}
        empty={
          <NexusSurface style={styles.empty} intensity="soft">
            <NexusText variant="heading">Nothing has stayed yet.</NexusText>
            <NexusText muted style={styles.emptyCopy}>
              Double-tap artwork in Now Playing or use the heart to build this collection.
            </NexusText>
          </NexusSurface>
        }
      />
    </NexusScreen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  listContent: { paddingBottom: 28 },
  nav: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hero: { marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 18 },
  pulse: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.045)', overflow: 'hidden' },
  pulseCore: { position: 'absolute', width: 74, height: 74, borderRadius: 37, opacity: 0.14 },
  actions: { marginTop: 28, flexDirection: 'row', gap: 10 },
  primary: { height: 46, borderRadius: 23, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#F3F5F6' },
  secondary: { height: 46, borderRadius: 23, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.07)' },
  empty: { marginTop: 34, minHeight: 190, borderRadius: 30, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 28 },
  emptyCopy: { textAlign: 'center', maxWidth: 280 },
});
