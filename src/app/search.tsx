import { useDeferredValue, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { nexusTokens } from '@/design/nexus-tokens';
import { NexusAlbumTile, NexusArtistBubble, NexusTrackRow } from '@/components/nexus/nexus-cards';
import { NexusIcon, NexusSurface, NexusText, SectionHeader } from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';
import { usePlayer } from '@/providers/player-provider';
import { useNexusCollections } from '@/providers/collections-provider';
import {
  rankAlbums,
  rankArtists,
  rankFolders,
  rankPlaylists,
  rankTracks,
} from '@/search/local-search';

export default function SearchScreen() {
  const router = useRouter();
  const player = usePlayer();
  const collections = useNexusCollections();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());

  const folders = useMemo(() => {
    const groups = new Map<string, number>();
    player.libraryTracks.forEach((track) => {
      const name = track.folder?.replace(/\/$/, '') || 'Local files';
      groups.set(name, (groups.get(name) ?? 0) + 1);
    });
    return [...groups.entries()].map(([name, count]) => ({ name, count }));
  }, [player.libraryTracks]);

  const results = useMemo(() => {
    const recentIds = player.recentTracks.map((track) => track.id);
    return {
      tracks: rankTracks(player.libraryTracks, deferredQuery, player.playCounts, recentIds),
      albums: rankAlbums(player.libraryAlbums, deferredQuery),
      artists: rankArtists(player.libraryArtists, deferredQuery),
      playlists: rankPlaylists(collections.playlists, deferredQuery),
      folders: rankFolders(folders, deferredQuery),
    };
  }, [
    collections.playlists,
    deferredQuery,
    folders,
    player.libraryAlbums,
    player.libraryArtists,
    player.libraryTracks,
    player.playCounts,
    player.recentTracks,
  ]);

  const hasResults =
    results.tracks.length ||
    results.albums.length ||
    results.artists.length ||
    results.playlists.length ||
    results.folders.length;

  return (
    <NexusScreen scroll={false}>
      <View style={styles.header}>
        <NexusText variant="micro" muted style={styles.eyebrow}>FIND IN YOUR MUSIC</NexusText>
        <NexusText variant="display">Search</NexusText>
      </View>

      <NexusSurface style={styles.searchBox} intensity="strong">
        <NexusIcon ios="magnifyingglass" android="search" size={21} color="#9AA1A8" />
        <TextInput
          autoFocus={false}
          value={query}
          onChangeText={setQuery}
          placeholder="Songs, albums, artists, playlists"
          placeholderTextColor="#777F86"
          selectionColor="#F2F4F5"
          style={styles.input}
          accessibilityLabel="Search your local music"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')}>
            <NexusIcon ios="xmark.circle.fill" android="cancel" size={19} color="#7F878E" />
          </Pressable>
        ) : null}
      </NexusSurface>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.results}>
        {!deferredQuery ? (
          <View style={styles.idle}>
            <View style={styles.rings}>
              <View style={styles.ringOne}><View style={styles.ringTwo} /></View>
            </View>
            <NexusText variant="heading">Search stays local</NexusText>
            <NexusText muted style={styles.idleCopy}>
              Search resolves from your device index. No query leaves Nexus.
            </NexusText>
            <View style={styles.quickRow}>
              <Pressable onPress={() => router.push('/favorites')} style={styles.quick}>
                <NexusIcon ios="heart.fill" android="favorite" size={15} color="#A6ADB3" />
                <NexusText variant="micro" muted>FAVORITES</NexusText>
              </Pressable>
              <Pressable onPress={() => router.push('/recent')} style={styles.quick}>
                <NexusIcon ios="clock.fill" android="history" size={15} color="#A6ADB3" />
                <NexusText variant="micro" muted>RECENT</NexusText>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {results.tracks.length ? (
              <View style={styles.group}>
                <SectionHeader title="Songs" />
                {results.tracks.map(({ item }, index) => (
                  <NexusTrackRow key={item.id} track={item} index={index} showNumber={false} />
                ))}
              </View>
            ) : null}

            {results.albums.length ? (
              <View style={styles.group}>
                <SectionHeader title="Albums" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                  {results.albums.map(({ item }) => <NexusAlbumTile key={item.id} album={item} width={142} />)}
                </ScrollView>
              </View>
            ) : null}

            {results.artists.length ? (
              <View style={styles.group}>
                <SectionHeader title="Artists" />
                <View style={styles.artistRow}>
                  {results.artists.map(({ item }) => <NexusArtistBubble key={item.id} artist={item} size={72} />)}
                </View>
              </View>
            ) : null}

            {results.playlists.length ? (
              <View style={styles.group}>
                <SectionHeader title="Playlists" />
                {results.playlists.map(({ item }) => (
                  <Pressable
                    key={item.id}
                    onPress={() => router.push({ pathname: '/playlist', params: { id: item.id } })}
                    style={styles.resultRow}>
                    <View style={styles.resultIcon}>
                      <NexusIcon ios="music.note.list" android="queue_music" size={18} color="#A9B0B6" />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <NexusText>{item.name}</NexusText>
                      <NexusText variant="caption" muted>{item.trackIds.length} tracks</NexusText>
                    </View>
                    <NexusIcon ios="chevron.right" android="chevron_right" size={17} color="#737B82" />
                  </Pressable>
                ))}
              </View>
            ) : null}

            {results.folders.length ? (
              <View style={styles.group}>
                <SectionHeader title="Folders" />
                {results.folders.map(({ item }) => (
                  <Pressable
                    key={item.name}
                    onPress={() => router.push({ pathname: '/folder', params: { name: item.name } })}
                    style={styles.resultRow}>
                    <View style={styles.resultIcon}>
                      <NexusIcon ios="folder.fill" android="folder" size={18} color="#A9B0B6" />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <NexusText numberOfLines={1}>{item.name.split('/').filter(Boolean).at(-1) ?? item.name}</NexusText>
                      <NexusText variant="caption" muted numberOfLines={1}>{item.count} tracks · {item.name}</NexusText>
                    </View>
                    <NexusIcon ios="chevron.right" android="chevron_right" size={17} color="#737B82" />
                  </Pressable>
                ))}
              </View>
            ) : null}

            {!hasResults ? (
              <View style={styles.idle}>
                <View style={styles.darkOrb} />
                <NexusText variant="heading">Nothing in this orbit</NexusText>
                <NexusText muted>Try a title, artist, album, playlist or folder.</NexusText>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </NexusScreen>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 18 },
  eyebrow: { letterSpacing: 1.1, marginBottom: 5 },
  searchBox: { height: 56, borderRadius: 24, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16 },
  input: { flex: 1, color: nexusTokens.colors.white, fontSize: 16, fontWeight: '500', paddingVertical: 0 },
  results: { paddingTop: 24, paddingBottom: 40, flexGrow: 1 },
  idle: { minHeight: 310, alignItems: 'center', justifyContent: 'center', gap: 10 },
  idleCopy: { maxWidth: 280, textAlign: 'center' },
  rings: { width: 92, height: 92, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  ringOne: { width: 78, height: 78, borderRadius: 39, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  ringTwo: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.07)' },
  darkOrb: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 10 },
  group: { marginBottom: 28, gap: 12 },
  rail: { gap: 14, paddingRight: 20 },
  artistRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  quickRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  quick: { height: 38, borderRadius: 19, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.05)' },
  resultRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.065)' },
  resultIcon: { width: 38, height: 38, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
});
