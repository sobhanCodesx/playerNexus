import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';

import { albums, artists, tracks } from '@/data/library';
import { nexusTokens } from '@/design/nexus-tokens';
import { NexusAlbumTile, NexusArtistBubble, NexusTrackRow } from '@/components/nexus/nexus-cards';
import { NexusIcon, NexusSurface, NexusText } from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';

const tabs = ['Songs', 'Albums', 'Artists', 'Playlists', 'Folders'] as const;
type Tab = (typeof tabs)[number];

export default function LibraryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<Tab>('Songs');
  const [sort, setSort] = useState('Recently added');
  const albumWidth = Math.min(164, (width - 56) / 2);

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
          <Pressable key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.tabActive]}>
            <NexusText variant="caption" style={{ color: tab === item ? '#F6F7F8' : '#838B92' }}>{item}</NexusText>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.utilityRow}>
        <NexusText variant="caption" muted>
          {tab === 'Songs' ? tracks.length + ' tracks' : tab === 'Albums' ? albums.length + ' albums' : tab === 'Artists' ? artists.length + ' artists' : 'Local only'}
        </NexusText>
        <Pressable onPress={() => setSort((v) => v === 'Recently added' ? 'Title' : 'Recently added')} style={styles.sort}>
          <NexusText variant="micro" muted>{sort.toUpperCase()}</NexusText>
          <NexusIcon ios="arrow.up.arrow.down" android="swap_vert" size={15} color="#9299A0" />
        </Pressable>
      </View>

      {tab === 'Songs' && (
        <View style={styles.list}>
          {tracks.map((track, index) => <NexusTrackRow key={track.id} track={track} index={index} />)}
        </View>
      )}

      {tab === 'Albums' && (
        <View style={styles.albumGrid}>
          {albums.map((album) => <NexusAlbumTile key={album.id} album={album} width={albumWidth} />)}
        </View>
      )}

      {tab === 'Artists' && (
        <View style={styles.artistGrid}>
          {artists.map((artist) => <NexusArtistBubble key={artist.id} artist={artist} size={92} />)}
        </View>
      )}

      {(tab === 'Playlists' || tab === 'Folders') && (
        <NexusSurface style={styles.empty} intensity="soft">
          <View style={styles.emptyOrb}>
            <View style={styles.emptyOrbInner} />
          </View>
          <NexusText variant="heading">{tab === 'Playlists' ? 'No local playlists yet' : 'Folder view is ready'}</NexusText>
          <NexusText muted style={styles.emptyCopy}>
            {tab === 'Playlists' ? 'Create one from tracks you keep returning to.' : 'Music folders will appear here when device scanning is connected.'}
          </NexusText>
        </NexusSurface>
      )}
    </NexusScreen>
  );
}

const styles=StyleSheet.create({
  header:{minHeight:76,flexDirection:'row',alignItems:'center',gap:16,marginBottom:18},
  eyebrow:{letterSpacing:1.1,marginBottom:4},
  headerButton:{width:46,height:46,borderRadius:23,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,0.06)'},
  tabs:{gap:8,paddingRight:20},
  tab:{height:36,paddingHorizontal:14,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(255,255,255,0.035)'},
  tabActive:{backgroundColor:'rgba(255,255,255,0.11)'},
  utilityRow:{height:54,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  sort:{flexDirection:'row',alignItems:'center',gap:5,paddingVertical:8},
  list:{marginTop:2},
  albumGrid:{marginTop:12,flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between',gap:16},
  artistGrid:{marginTop:18,flexDirection:'row',flexWrap:'wrap',gap:24,justifyContent:'space-around'},
  empty:{marginTop:36,borderRadius:nexusTokens.radius.xl,minHeight:250,alignItems:'center',justifyContent:'center',padding:32,gap:10},
  emptyOrb:{width:74,height:74,borderRadius:37,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,0.18)',backgroundColor:'rgba(255,255,255,0.04)',padding:15,marginBottom:8},
  emptyOrbInner:{flex:1,borderRadius:999,backgroundColor:'rgba(255,255,255,0.09)'},
  emptyCopy:{textAlign:'center',maxWidth:270},
});
