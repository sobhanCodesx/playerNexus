import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useNexusCollections } from '@/providers/collections-provider';
import { usePlayer } from '@/providers/player-provider';
import { NexusTrackRow } from '@/components/nexus/nexus-cards';
import { NexusIcon, NexusIconButton, NexusSurface, NexusText } from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';

export default function PlaylistScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const collections = useNexusCollections();
  const player = usePlayer();
  const playlist = collections.playlists.find((item) => item.id === id);
  if (!playlist) return null;

  const byId = new Map(player.libraryTracks.map((track) => [track.id, track] as const));
  const tracks = playlist.trackIds.map((trackId) => byId.get(trackId)).filter((track): track is NonNullable<typeof track> => Boolean(track));
  const palette = tracks[0]?.palette ?? player.track.palette;

  return (
    <NexusScreen>
      <View style={styles.nav}>
        <NexusIconButton ios="chevron.left" android="arrow_back" accessibilityLabel="Back" onPress={() => router.back()} size={44} />
        <NexusText variant="micro" muted>LOCAL PLAYLIST</NexusText>
        <NexusIconButton ios="ellipsis" android="more_horiz" accessibilityLabel="Playlist actions" size={44} />
      </View>

      <View style={styles.hero}>
        <View style={styles.poster}>
          <View style={[styles.beam, { backgroundColor: palette[0], height: '74%' }]} />
          <View style={[styles.beam, { backgroundColor: palette[1], height: '48%' }]} />
          <View style={[styles.beam, { backgroundColor: palette[2], height: '88%' }]} />
          <View style={[styles.beam, { backgroundColor: palette[3] ?? '#11161A', height: '62%' }]} />
          <View style={styles.posterLine} />
        </View>
        <View style={styles.heroCopy}>
          <NexusText variant="micro" muted>CURATED ON THIS DEVICE</NexusText>
          <NexusText variant="display">{playlist.name}</NexusText>
          <NexusText variant="caption" muted>{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'} · no cloud copy</NexusText>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          disabled={!tracks.length}
          onPress={() => {
            player.playQueue(tracks);
            player.openPlayer();
          }}
          style={[styles.play, !tracks.length && { opacity: 0.35 }]}>
          <NexusIcon ios="play.fill" android="play_arrow" size={23} color="#111519" />
          <NexusText variant="caption" style={{ color: '#111519' }}>Play</NexusText>
        </Pressable>
        <Pressable
          onPress={() => router.push({ pathname: '/playlist-add', params: { id: playlist.id } })}
          style={styles.add}>
          <NexusIcon ios="plus" android="add" size={19} />
          <NexusText variant="caption">Add music</NexusText>
        </Pressable>
      </View>

      {tracks.length ? (
        <View style={styles.list}>
          {tracks.map((track, index) => (
            <NexusTrackRow key={track.id} track={track} index={index} />
          ))}
        </View>
      ) : (
        <NexusSurface style={styles.empty} intensity="soft">
          <NexusText variant="heading">This playlist is still silent.</NexusText>
          <NexusText muted style={styles.emptyCopy}>Add music and shape the order later from Queue.</NexusText>
          <Pressable
            onPress={() => router.push({ pathname: '/playlist-add', params: { id: playlist.id } })}
            style={styles.emptyAction}>
            <NexusText variant="caption" style={{ color: '#111519' }}>Choose tracks</NexusText>
          </Pressable>
        </NexusSurface>
      )}

      <Pressable
        onPress={() => {
          collections.deletePlaylist(playlist.id);
          router.back();
        }}
        style={styles.delete}>
        <NexusText variant="caption" muted>Delete playlist</NexusText>
      </Pressable>
    </NexusScreen>
  );
}

const styles = StyleSheet.create({
  nav: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hero: { marginTop: 24, gap: 24 },
  poster: { height: 166, borderRadius: 34, flexDirection: 'row', alignItems: 'flex-end', gap: 7, paddingHorizontal: 24, paddingVertical: 22, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)' },
  beam: { flex: 1, borderRadius: 12, opacity: 0.74 },
  posterLine: { position: 'absolute', left: 24, right: 24, top: 22, height: 1, backgroundColor: 'rgba(255,255,255,0.22)' },
  heroCopy: { gap: 5 },
  actions: { marginTop: 24, flexDirection: 'row', gap: 10 },
  play: { height: 48, borderRadius: 24, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#F3F5F6' },
  add: { height: 48, borderRadius: 24, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.07)' },
  list: { marginTop: 22 },
  empty: { marginTop: 28, minHeight: 190, borderRadius: 30, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 8 },
  emptyCopy: { textAlign: 'center' },
  emptyAction: { marginTop: 8, height: 42, borderRadius: 21, paddingHorizontal: 18, backgroundColor: '#F3F5F6', alignItems: 'center', justifyContent: 'center' },
  delete: { marginTop: 34, alignItems: 'center', paddingVertical: 18, opacity: 0.62 },
});
