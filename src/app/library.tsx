import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Alert,
  AppState,
  Linking,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';

import type { Album, Artist, Track } from '@/data/library';
import { nexusTokens } from '@/design/nexus-tokens';
import { NexusAlbumTile, NexusArtistBubble } from '@/components/nexus/nexus-cards';
import { NexusTrackList } from '@/components/nexus/nexus-track-list';
import { NexusIcon, NexusSurface, NexusText } from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';
import { usePlayer, usePlayerActions } from '@/providers/player-provider';
import { useNexusCollections } from '@/providers/collections-provider';
import {
  getMusicAccessDiagnostics,
  type MusicAccessDiagnosticSnapshot,
} from '@/services/library-service';

const tabs = ['Songs', 'Albums', 'Artists', 'Playlists', 'Folders'] as const;
const sortModes = ['Recently added', 'Title', 'Artist', 'Album', 'Most played'] as const;
type Tab = (typeof tabs)[number];
type SortMode = (typeof sortModes)[number];
type FolderItem = { name: string; count: number };

export default function LibraryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const player = usePlayer();
  const { hydrateArtworkWindow } = usePlayerActions();
  const collections = useNexusCollections();
  const tracks = player.libraryTracks;
  const albums = player.libraryAlbums;
  const artists = player.libraryArtists;
  const [tab, setTab] = useState<Tab>('Songs');
  const [sort, setSort] = useState<SortMode>('Recently added');
  const [creating, setCreating] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [musicDiagnostics, setMusicDiagnostics] = useState<MusicAccessDiagnosticSnapshot | null>(null);
  const [requestingMusicAccess, setRequestingMusicAccess] = useState(false);
  const albumWidth = Math.min(164, (width - 56) / 2);
  const artistSize = Math.min(92, Math.max(72, (width - 92) / 3));

  const sortedTracks = useMemo(() => {
    const next = [...tracks];
    if (sort === 'Title') return next.sort((a, b) => a.title.localeCompare(b.title));
    if (sort === 'Artist') return next.sort((a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title));
    if (sort === 'Album') return next.sort((a, b) => a.album.localeCompare(b.album) || a.title.localeCompare(b.title));
    if (sort === 'Most played') {
      return next.sort(
        (a, b) =>
          (player.playCounts[b.id] ?? 0) - (player.playCounts[a.id] ?? 0) ||
          a.title.localeCompare(b.title),
      );
    }
    return next.sort((a, b) => (b.dateAdded ?? 0) - (a.dateAdded ?? 0));
  }, [player.playCounts, sort, tracks]);

  const byId = useMemo(
    () => new Map(tracks.map((track) => [track.id, track] as const)),
    [tracks],
  );

  const folders = useMemo<FolderItem[]>(() => {
    const groups = new Map<string, number>();
    tracks.forEach((track) => {
      const folder = track.folder?.replace(/\/$/, '') || 'Local files';
      groups.set(folder, (groups.get(folder) ?? 0) + 1);
    });
    return [...groups.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);

  const albumSeedTracks = useMemo(() => {
    const map = new Map<string, Track>();
    albums.forEach((album) => {
      const seed = album.trackIds.map((id) => byId.get(id)).find(Boolean);
      if (seed) map.set(album.id, seed);
    });
    return map;
  }, [albums, byId]);

  const artistSeedTracks = useMemo(() => {
    const map = new Map<string, Track>();
    tracks.forEach((track) => {
      if (!map.has(track.artist)) map.set(track.artist, track);
    });
    return map;
  }, [tracks]);

  const refreshMusicDiagnostics = useCallback(() => {
    getMusicAccessDiagnostics()
      .then(setMusicDiagnostics)
      .catch(() => setMusicDiagnostics(null));
  }, []);

  useEffect(() => {
    if (player.libraryPermission !== 'granted') refreshMusicDiagnostics();
  }, [player.libraryPermission, refreshMusicDiagnostics]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshMusicDiagnostics();
        if (player.libraryPermission !== 'granted') player.scanLibrary(false);
      }
    });
    return () => subscription.remove();
  }, [player.libraryPermission, player.scanLibrary, refreshMusicDiagnostics]);

  const handleMusicAccess = useCallback(async () => {
    if (requestingMusicAccess) return;
    setRequestingMusicAccess(true);
    try {
      const permission = await player.scanLibrary(true);
      const diagnostics = await getMusicAccessDiagnostics().catch(() => null);
      setMusicDiagnostics(diagnostics);

      if (permission === 'granted') return;

      const buildProblem =
        diagnostics?.nativeScanner === false || diagnostics?.declared === false;
      const detail = diagnostics
        ? [
            'Android SDK ' + diagnostics.sdkInt,
            diagnostics.permission.split('.').pop(),
            'declared: ' + (diagnostics.declared === null ? 'unknown' : diagnostics.declared ? 'yes' : 'NO'),
            'granted: ' + (diagnostics.granted ? 'yes' : 'no'),
            'native scanner: ' + (diagnostics.nativeScanner ? 'yes' : 'NO'),
          ].join(' · ')
        : 'Permission request returned ' + permission + '.';

      Alert.alert(
        buildProblem ? 'Development build needs rebuilding' : 'Music access is still off',
        buildProblem
          ? 'The installed Android app does not contain the current native music permission/scanner. Rebuild and reinstall the development client.\n\n' + detail
          : 'Android did not grant Music and audio access. Open the app settings and enable Music and audio.\n\n' + detail,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => Linking.openSettings().catch(() => undefined),
          },
        ],
      );
    } finally {
      setRequestingMusicAccess(false);
    }
  }, [player.scanLibrary, requestingMusicAccess]);

  const createPlaylist = () => {
    const trimmed = playlistName.trim();
    if (!trimmed) return;
    const id = collections.createPlaylist(trimmed);
    setPlaylistName('');
    setCreating(false);
    router.push({ pathname: '/playlist', params: { id } });
  };

  const playSortedTrack = useCallback(
    (track: Track) => {
      player.playQueue(sortedTracks, track.id);
    },
    [player.playQueue, sortedTracks],
  );

  const onAlbumsViewable = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: Album }> }) => {
      hydrateArtworkWindow(
        viewableItems
          .map(({ item }) => albumSeedTracks.get(item.id))
          .filter((item): item is Track => Boolean(item)),
      );
    },
    [albumSeedTracks, hydrateArtworkWindow],
  );

  const onArtistsViewable = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: Artist }> }) => {
      hydrateArtworkWindow(
        viewableItems
          .map(({ item }) => artistSeedTracks.get(item.name))
          .filter((candidate): candidate is Track => Boolean(candidate)),
      );
    },
    [artistSeedTracks, hydrateArtworkWindow],
  );

  const renderAlbum = useCallback(
    ({ item }: { item: Album }) => (
      <View style={styles.albumCell}>
        <NexusAlbumTile album={item} width={albumWidth} />
      </View>
    ),
    [albumWidth],
  );

  const renderArtist = useCallback(
    ({ item }: { item: Artist }) => (
      <View style={styles.artistCell}>
        <NexusArtistBubble artist={item} size={artistSize} />
      </View>
    ),
    [artistSize],
  );

  const renderFolder = useCallback(
    ({ item, index }: { item: FolderItem; index: number }) => (
      <Pressable
        onPress={() => router.push({ pathname: '/folder', params: { name: item.name } })}
        style={styles.folderRow}>
        <View style={styles.folderIndex}>
          <NexusText variant="micro" muted>{String(index + 1).padStart(2, '0')}</NexusText>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <NexusText numberOfLines={1}>{item.name.split('/').filter(Boolean).at(-1) ?? item.name}</NexusText>
          <NexusText variant="caption" muted numberOfLines={1}>{item.name}</NexusText>
        </View>
        <NexusText variant="micro" muted>{item.count} TRACKS</NexusText>
      </Pressable>
    ),
    [router],
  );

  const libraryCount =
    tab === 'Songs'
      ? tracks.length + ' tracks'
      : tab === 'Albums'
        ? albums.length + ' albums'
        : tab === 'Artists'
          ? artists.length + ' artists'
          : tab === 'Playlists'
            ? collections.playlists.length + ' playlists'
            : folders.length + ' folders';

  return (
    <NexusScreen scroll={false} contentContainerStyle={styles.screen}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <NexusText variant="micro" muted style={styles.eyebrow}>LOCAL COLLECTION</NexusText>
          <NexusText variant="display">Library</NexusText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search library"
          onPress={() => router.push('/search')}
          style={styles.headerButton}>
          <NexusIcon ios="magnifyingglass" android="search" size={22} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {tabs.map((item) => (
          <Pressable
            key={item}
            onPress={() => setTab(item)}
            style={[styles.tab, tab === item && styles.tabActive]}>
            <NexusText variant="caption" style={{ color: tab === item ? '#F6F7F8' : '#838B92' }}>
              {item}
            </NexusText>
          </Pressable>
        ))}
      </ScrollView>

      {player.libraryStatus === 'permission' || player.libraryStatus === 'error' ? (
        <NexusSurface style={styles.permission} intensity="strong">
          <View style={{ flex: 1, gap: 3 }}>
            <NexusText variant="caption">
              {musicDiagnostics?.nativeScanner === false
                ? 'Native music scanner is missing'
                : musicDiagnostics?.declared === false
                  ? 'Audio permission is missing from this build'
                  : player.libraryPermission === 'blocked'
                    ? 'Music access is blocked'
                    : 'Scan the Android music library'}
            </NexusText>
            <NexusText variant="micro" muted>
              {musicDiagnostics
                ? [
                    'SDK ' + musicDiagnostics.sdkInt,
                    musicDiagnostics.permission.split('.').pop(),
                    musicDiagnostics.declared === null
                      ? 'MANIFEST ?'
                      : musicDiagnostics.declared
                        ? 'MANIFEST YES'
                        : 'MANIFEST NO',
                    musicDiagnostics.nativeScanner ? 'NATIVE YES' : 'NATIVE NO',
                  ].join(' · ')
                : player.libraryStatus === 'error'
                  ? 'SCAN FAILED · TAP TO DIAGNOSE'
                  : 'FILES STAY ON THIS DEVICE'}
            </NexusText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              player.libraryPermission === 'blocked' ? 'Open app settings' : 'Allow music access'
            }
            disabled={requestingMusicAccess}
            onPress={
              player.libraryPermission === 'blocked'
                ? () => Linking.openSettings().catch(() => undefined)
                : handleMusicAccess
            }
            style={[styles.permissionAction, requestingMusicAccess && { opacity: 0.55 }]}>
            <NexusText variant="micro" style={{ color: '#111519' }}>
              {requestingMusicAccess
                ? 'CHECKING'
                : player.libraryPermission === 'blocked'
                  ? 'SETTINGS'
                  : 'ALLOW'}
            </NexusText>
          </Pressable>
        </NexusSurface>
      ) : null}

      <View style={styles.utilityRow}>
        <NexusText variant="caption" muted>{libraryCount}</NexusText>

        {tab === 'Songs' ? (
          <Pressable
            onPress={() =>
              setSort((value) => sortModes[(sortModes.indexOf(value) + 1) % sortModes.length])
            }
            style={styles.sort}>
            <NexusText variant="micro" muted>{sort.toUpperCase()}</NexusText>
            <NexusIcon ios="arrow.up.arrow.down" android="swap_vert" size={15} color="#9299A0" />
          </Pressable>
        ) : null}

        {tab === 'Playlists' ? (
          <Pressable onPress={() => setCreating((value) => !value)} style={styles.newAction}>
            <NexusIcon ios="plus" android="add" size={16} color="#A9B0B6" />
            <NexusText variant="micro" muted>NEW</NexusText>
          </Pressable>
        ) : null}
      </View>

      {tab === 'Songs' ? (
        <NexusTrackList
          tracks={sortedTracks}
          onTrackPress={playSortedTrack}
          contentContainerStyle={styles.virtualContent}
        />
      ) : null}

      {tab === 'Albums' ? (
        <FlashList
          key="albums"
          data={albums}
          numColumns={2}
          renderItem={renderAlbum}
          keyExtractor={(album) => album.id}
          contentContainerStyle={styles.virtualContent}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onAlbumsViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 14 }}
          drawDistance={480}
        />
      ) : null}

      {tab === 'Artists' ? (
        <FlashList
          key="artists"
          data={artists}
          numColumns={3}
          renderItem={renderArtist}
          keyExtractor={(artist) => artist.id}
          contentContainerStyle={styles.virtualContent}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onArtistsViewable}
          viewabilityConfig={{ itemVisiblePercentThreshold: 14 }}
          drawDistance={420}
        />
      ) : null}

      {tab === 'Playlists' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.playlists}>
          {creating ? (
            <NexusSurface style={styles.composer} intensity="strong">
              <TextInput
                autoFocus
                value={playlistName}
                onChangeText={setPlaylistName}
                onSubmitEditing={createPlaylist}
                placeholder="Playlist name"
                placeholderTextColor="#737B82"
                selectionColor="#F4F6F7"
                style={styles.composerInput}
                returnKeyType="done"
              />
              <Pressable
                onPress={createPlaylist}
                disabled={!playlistName.trim()}
                style={[styles.createButton, !playlistName.trim() && { opacity: 0.35 }]}>
                <NexusIcon ios="arrow.right" android="arrow_forward" size={18} color="#111519" />
              </Pressable>
            </NexusSurface>
          ) : null}

          {collections.playlists.map((playlist, index) => {
            const firstTrack = playlist.trackIds.map((id) => byId.get(id)).find(Boolean);
            const palette =
              firstTrack?.palette ??
              tracks[index % Math.max(1, tracks.length)]?.palette ??
              player.track.palette;
            return (
              <Pressable
                key={playlist.id}
                onPress={() => router.push({ pathname: '/playlist', params: { id: playlist.id } })}>
                <NexusSurface style={styles.playlistCard} intensity="soft">
                  <View style={styles.editorialMark}>
                    <View style={[styles.editorialBand, { backgroundColor: palette[0], height: '82%' }]} />
                    <View style={[styles.editorialBand, { backgroundColor: palette[1], height: '56%' }]} />
                    <View style={[styles.editorialBand, { backgroundColor: palette[2], height: '70%' }]} />
                  </View>
                  <View style={styles.playlistCopy}>
                    <NexusText variant="micro" muted>PLAYLIST · {String(index + 1).padStart(2, '0')}</NexusText>
                    <NexusText variant="heading" numberOfLines={1}>{playlist.name}</NexusText>
                    <NexusText variant="caption" muted>
                      {playlist.trackIds.length} {playlist.trackIds.length === 1 ? 'track' : 'tracks'}
                    </NexusText>
                  </View>
                  <NexusIcon ios="arrow.up.right" android="north_east" size={20} color="#858D94" />
                </NexusSurface>
              </Pressable>
            );
          })}

          {!collections.playlists.length && !creating ? (
            <NexusSurface style={styles.empty} intensity="soft">
              <View style={styles.emptyOrb}><View style={styles.emptyOrbInner} /></View>
              <NexusText variant="heading">Make a listening shape</NexusText>
              <NexusText muted style={styles.emptyCopy}>
                Playlists stay local. Start with a name, then pull in only the tracks that belong together.
              </NexusText>
              <Pressable onPress={() => setCreating(true)} style={styles.emptyCTA}>
                <NexusText variant="caption" style={{ color: '#111519' }}>New playlist</NexusText>
              </Pressable>
            </NexusSurface>
          ) : null}
        </ScrollView>
      ) : null}

      {tab === 'Folders' ? (
        <FlashList
          key="folders"
          data={folders}
          renderItem={renderFolder}
          keyExtractor={(folder) => folder.name}
          contentContainerStyle={styles.virtualContent}
          showsVerticalScrollIndicator={false}
          drawDistance={420}
        />
      ) : null}
    </NexusScreen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  virtualContent: { paddingBottom: 28 },
  header: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 18 },
  eyebrow: { letterSpacing: 1.1, marginBottom: 4 },
  headerButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  tabs: { gap: 8, paddingRight: 20 },
  tab: { height: 36, paddingHorizontal: 14, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.035)' },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.11)' },
  permission: { minHeight: 68, borderRadius: 22, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  permissionAction: { height: 36, borderRadius: 18, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4F6F7' },
  utilityRow: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8 },
  newAction: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8 },
  albumCell: { flex: 1, alignItems: 'center', paddingBottom: 18 },
  artistCell: { flex: 1, alignItems: 'center', paddingBottom: 22 },
  playlists: { gap: 12, paddingBottom: 28 },
  composer: { minHeight: 64, borderRadius: 23, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 10 },
  composerInput: { flex: 1, color: '#F4F6F7', fontSize: 16, fontWeight: '600', paddingVertical: 0 },
  createButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F5F6' },
  playlistCard: { minHeight: 104, borderRadius: 28, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  editorialMark: { width: 64, height: 72, flexDirection: 'row', alignItems: 'flex-end', gap: 3, padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.045)' },
  editorialBand: { flex: 1, borderRadius: 6, opacity: 0.76 },
  playlistCopy: { flex: 1, gap: 3 },
  empty: { marginTop: 18, borderRadius: nexusTokens.radius.xl, minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  emptyOrb: { width: 74, height: 74, borderRadius: 37, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)', backgroundColor: 'rgba(255,255,255,0.04)', padding: 15, marginBottom: 8 },
  emptyOrbInner: { flex: 1, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.09)' },
  emptyCopy: { textAlign: 'center', maxWidth: 280 },
  emptyCTA: { marginTop: 8, height: 42, paddingHorizontal: 18, borderRadius: 21, backgroundColor: '#F3F5F6', alignItems: 'center', justifyContent: 'center' },
  folderRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.065)' },
  folderIndex: { width: 34, height: 34, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.045)' },
});
