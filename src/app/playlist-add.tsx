import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';

import type { Track } from '@/data/library';
import { useNexusCollections } from '@/providers/collections-provider';
import { usePlayer, usePlayerActions } from '@/providers/player-provider';
import { NexusArtwork, NexusIcon, NexusIconButton, NexusSurface, NexusText } from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';

export default function PlaylistAddScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const collections = useNexusCollections();
  const player = usePlayer();
  const { hydrateArtworkWindow } = usePlayerActions();
  const [query, setQuery] = useState('');
  const playlist = collections.playlists.find((item) => item.id === id);
  if (!playlist) return null;

  const normalized = query.trim().toLowerCase();
  const selectedIds = useMemo(() => new Set(playlist.trackIds), [playlist.trackIds]);
  const tracks = useMemo(
    () =>
      player.libraryTracks.filter((track) =>
        !normalized ||
        (track.title + ' ' + track.artist + ' ' + track.album).toLowerCase().includes(normalized),
      ),
    [normalized, player.libraryTracks],
  );

  const renderItem = useCallback(
    ({ item: track }: { item: Track }) => {
      const selected = selectedIds.has(track.id);
      return (
        <Pressable
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
    },
    [collections.toggleTrack, playlist.id, selectedIds],
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: Track }> }) => {
      hydrateArtworkWindow(viewableItems.map((token) => token.item));
    },
    [hydrateArtworkWindow],
  );

  return (
    <NexusScreen scroll={false} contentContainerStyle={styles.screen}>
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

      <FlashList
        data={tracks}
        renderItem={renderItem}
        keyExtractor={(track) => track.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 18 }}
        drawDistance={420}
      />
    </NexusScreen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  nav: { height: 56, flexDirection: 'row', alignItems: 'center' },
  done: { paddingHorizontal: 10, height: 40, alignItems: 'center', justifyContent: 'center' },
  search: { height: 52, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, marginTop: 14, marginBottom: 8 },
  input: { flex: 1, color: '#F4F6F7', fontSize: 16, fontWeight: '500', paddingVertical: 0 },
  list: { paddingTop: 10, paddingBottom: 28 },
  row: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.065)' },
  check: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.2)' },
  checkSelected: { backgroundColor: '#F3F5F6', borderColor: '#F3F5F6' },
});
