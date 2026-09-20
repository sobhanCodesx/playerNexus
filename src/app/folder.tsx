import { Pressable, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { usePlayer } from '@/providers/player-provider';
import { NexusTrackRow } from '@/components/nexus/nexus-cards';
import { NexusIcon, NexusIconButton, NexusText } from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';

export default function FolderScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name?: string }>();
  const player = usePlayer();
  const folderName = name ?? 'Local files';
  const tracks = player.libraryTracks.filter(
    (track) => (track.folder?.replace(/\/$/, '') || 'Local files') === folderName,
  );

  return (
    <NexusScreen>
      <View style={styles.nav}>
        <NexusIconButton ios="chevron.left" android="arrow_back" accessibilityLabel="Back" onPress={() => router.back()} size={44} />
        <NexusText variant="micro" muted>FOLDER</NexusText>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.hero}>
        <View style={styles.folderObject}>
          <View style={styles.folderTab} />
          <View style={styles.folderLight} />
          <NexusIcon ios="folder.fill" android="folder" size={30} color="#B7BEC4" />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <NexusText variant="title" numberOfLines={2}>{folderName.split('/').filter(Boolean).at(-1) ?? folderName}</NexusText>
          <NexusText variant="caption" muted numberOfLines={2}>{folderName}</NexusText>
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
          <NexusIcon ios="play.fill" android="play_arrow" size={22} color="#111519" />
          <NexusText variant="caption" style={{ color: '#111519' }}>Play folder</NexusText>
        </Pressable>
        <NexusText variant="micro" muted>{tracks.length} TRACKS</NexusText>
      </View>

      <View style={styles.list}>
        {tracks.map((track, index) => <NexusTrackRow key={track.id} track={track} index={index} />)}
      </View>
    </NexusScreen>
  );
}

const styles = StyleSheet.create({
  nav: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hero: { marginTop: 24, flexDirection: 'row', gap: 18, alignItems: 'center' },
  folderObject: { width: 94, height: 76, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)' },
  folderTab: { position: 'absolute', left: 12, top: 0, width: 36, height: 8, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, backgroundColor: 'rgba(255,255,255,0.12)' },
  folderLight: { position: 'absolute', width: 70, height: 36, borderRadius: 999, right: -20, top: -8, backgroundColor: 'rgba(255,255,255,0.07)', transform: [{ rotate: '18deg' }] },
  actions: { marginTop: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  play: { height: 46, borderRadius: 23, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#F3F5F6' },
  list: { marginTop: 20 },
});
