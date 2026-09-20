import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';

import { nexusTokens } from '@/design/nexus-tokens';
import { NexusAlbumTile, NexusArtistBubble, NexusTrackRow } from '@/components/nexus/nexus-cards';
import { NexusIcon, NexusSurface, NexusText } from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';
import { usePlayer } from '@/providers/player-provider';
import { useNexusCollections } from '@/providers/collections-provider';

const tabs = ['Songs', 'Albums', 'Artists', 'Playlists', 'Folders'] as const;
type Tab = (typeof tabs)[number];

export default function LibraryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const player = usePlayer();
  const collections = useNexusCollections();
  const tracks = player.libraryTracks;
  const albums = player.libraryAlbums;
  const artists = player.libraryArtists;
  const [tab, setTab] = useState<Tab>('Songs');
  const [sort, setSort] = useState('Recently added');
  const [creating, setCreating] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const albumWidth = Math.min(164, (width - 56) / 2);

  const folders = useMemo(() => {
    const groups = new Map<string, number>();
    tracks.forEach((track) => {
      const folder = track.folder?.replace(/\/$/, '') || 'Local files';
      groups.set(folder, (groups.get(folder) ?? 0) + 1);
    });
    return [...groups.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [tracks]);

  const createPlaylist = () => {
    const trimmed = playlistName.trim();
    if (!trimmed) return;
    const id = collections.createPlaylist(trimmed);
    setPlaylistName('');
    setCreating(false);
    router.push({ pathname: '/playlist', params: { id } });
  };

  return (
    <NexusScreen>
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
            <NexusText variant="caption">Scan the Android music library</NexusText>
            <NexusText variant="micro" muted>FILES STAY ON THIS DEVICE</NexusText>
          </View>
          <Pressable onPress={() => player.scanLibrary(true)} style={styles.permissionAction}>
            <NexusText variant="micro" style={{ color: '#111519' }}>ALLOW</NexusText>
          </Pressable>
        </NexusSurface>
      ) : null}

      <View style={styles.utilityRow}>
        <NexusText variant="caption" muted>
          {tab === 'Songs'
            ? tracks.length + ' tracks'
            : tab === 'Albums'
              ? albums.length + ' albums'
              : tab === 'Artists'
                ? artists.length + ' artists'
                : tab === 'Playlists'
                  ? collections.playlists.length + ' playlists'
                  : folders.length + ' folders'}
        </NexusText>

        {tab === 'Songs' ? (
          <Pressable
            onPress={() => setSort((value) => value === 'Recently added' ? 'Title' : 'Recently added')}
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
        <View style={styles.list}>
          {tracks.map((track, index) => (
            <NexusTrackRow key={track.id} track={track} index={index} />
          ))}
        </View>
      ) : null}

      {tab === 'Albums' ? (
        <View style={styles.albumGrid}>
          {albums.map((album) => (
            <NexusAlbumTile key={album.id} album={album} width={albumWidth} />
          ))}
        </View>
      ) : null}

      {tab === 'Artists' ? (
        <View style={styles.artistGrid}>
          {artists.map((artist) => (
            <NexusArtistBubble key={artist.id} artist={artist} size={92} />
          ))}
        </View>
      ) : null}

      {tab === 'Playlists' ? (
        <View style={styles.playlists}>
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
            const playlistTracks = playlist.trackIds
              .map((id) => tracks.find((track) => track.id === id))
              .filter(Boolean);
            const palette = playlistTracks[0]?.palette ?? tracks[index % Math.max(1, tracks.length)]?.palette ?? player.track.palette;
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
        </View>
      ) : null}

      {tab === 'Folders' ? (
        <View style={styles.folders}>
          {folders.map((folder, index) => (
            <Pressable
              key={folder.name}
              onPress={() => router.push({ pathname: '/folder', params: { name: folder.name } })}
              style={styles.folderRow}>
              <View style={styles.folderIndex}>
                <NexusText variant="micro" muted>{String(index + 1).padStart(2, '0')}</NexusText>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <NexusText numberOfLines={1}>{folder.name.split('/').filter(Boolean).at(-1) ?? folder.name}</NexusText>
                <NexusText variant="caption" muted numberOfLines={1}>{folder.name}</NexusText>
              </View>
              <NexusText variant="micro" muted>{folder.count} TRACKS</NexusText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </NexusScreen>
  );
}

const styles = StyleSheet.create({
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
  list: { marginTop: 2 },
  albumGrid: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 },
  artistGrid: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 24, justifyContent: 'space-around' },
  playlists: { gap: 12 },
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
  folders: { gap: 2 },
  folderRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.065)' },
  folderIndex: { width: 34, height: 34, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.045)' },
});
