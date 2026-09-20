import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useNexusCollections } from '@/providers/collections-provider';
import { usePlayer } from '@/providers/player-provider';
import { NexusArtwork, NexusIcon, NexusIconButton, NexusSurface, NexusText } from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';

export default function PlaylistAddScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const collections = useNexusCollections();
  const player = usePlayer();
  const [query, setQuery] = useState('');
  const playlist = collections.playlists.find((item) => item.id === id);
  if (!playlist) return null;

  const normalized = query.trim().toLowerCase();
  const tracks = useMemo(
    () =>
      player.libraryTracks.filter((track) =>
        !normalized ||
        (track.title + ' ' + track.artist + ' ' + track.album).toLowerCase().includes(normalized),
      ),
    [normalized, player.libraryTracks],
  );

  return (
    <NexusScreen scroll={false}>
      <View style={styles.nav}>
        <NexusIconButton ios="chevron.left" android="arrow_back" accessibilityLabel="Back" onPress={() => router.back()} size={44} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <NexusText variant="micro" muted>ADD TO</NexusText>
          <NexusText variant="caption" numberOfLines={1}>{playlist.name}</NexusText>
        </View>
        <Pressable onPress={() => router.back()} style={styles.done}>
          <NexusText variant="caption">Done</NexusText>
        </Pressable>
      </View>

      <NexusSurface style={styles.search} intensity="strong">
        <NexusIcon ios="magnifyingglass" android="search" size={19} color="#929AA1" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Find music"
          placeholderTextColor="#747C83"
          selectionColor="#F3F5F6"
          style={styles.input}
          autoFocus
        />
      </NexusSurface>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}>
        {tracks.map((track) => {
          const selected = playlist.trackIds.includes(track.id);
          return (
            <Pressable
              key={track.id}
              onPress={() => collections.toggleTrack(playlist.id, track.id)}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
              <NexusArtwork palette={track.palette} artworkUri={track.artworkUri} size={44} radius={13} />
              <View style={{ flex: 1, gap: 2 }}>
                <NexusText numberOfLines={1}>{track.title}</NexusText>
                <NexusText variant="caption" muted numberOfLines={1}>{track.artist} · {track.album}</NexusText>
              </View>
              <View style={[styles.check, selected && styles.checkSelected]}>
                {selected ? <NexusIcon ios="checkmark" android="check" size={14} color="#111519" /> : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </NexusScreen>
  );
}

const styles = StyleSheet.create({
  nav: { height: 56, flexDirection: 'row', alignItems: 'center' },
  done: { paddingHorizontal: 10, height: 40, alignItems: 'center', justifyContent: 'center' },
  search: { height: 52, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, marginTop: 14 },
  input: { flex: 1, color: '#F4F6F7', fontSize: 16, fontWeight: '500', paddingVertical: 0 },
  list: { paddingTop: 18, paddingBottom: 80 },
  row: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.065)' },
  check: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.2)' },
  checkSelected: { backgroundColor: '#F3F5F6', borderColor: '#F3F5F6' },
});
