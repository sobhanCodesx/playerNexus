import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { albums, artists, tracks } from '@/data/library';
import { nexusTokens } from '@/design/nexus-tokens';
import { NexusAlbumTile, NexusArtistBubble, NexusTrackRow } from '@/components/nexus/nexus-cards';
import { NexusIcon, NexusSurface, NexusText, SectionHeader } from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';

export default function SearchScreen() {
  const [query,setQuery]=useState('');
  const normalized=query.trim().toLowerCase();
  const results=useMemo(()=>({
    tracks:tracks.filter((item)=>(item.title+' '+item.artist+' '+item.album).toLowerCase().includes(normalized)),
    albums:albums.filter((item)=>(item.title+' '+item.artist).toLowerCase().includes(normalized)),
    artists:artists.filter((item)=>item.name.toLowerCase().includes(normalized)),
  }),[normalized]);

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
          placeholder="Songs, albums, artists"
          placeholderTextColor="#777F86"
          selectionColor="#F2F4F5"
          style={styles.input}
          accessibilityLabel="Search your local music"
        />
      </NexusSurface>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.results}>
        {!normalized ? (
          <View style={styles.idle}>
            <View style={styles.rings}>
              <View style={styles.ringOne}><View style={styles.ringTwo} /></View>
            </View>
            <NexusText variant="heading">Search stays local</NexusText>
            <NexusText muted style={styles.idleCopy}>Start typing. Results resolve instantly from the local Nexus index.</NexusText>
          </View>
        ) : (
          <>
            {results.tracks.length > 0 && (
              <View style={styles.group}>
                <SectionHeader title="Songs" />
                {results.tracks.slice(0,5).map((track,index)=><NexusTrackRow key={track.id} track={track} index={index} showNumber={false} />)}
              </View>
            )}
            {results.albums.length > 0 && (
              <View style={styles.group}>
                <SectionHeader title="Albums" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
                  {results.albums.map((album)=><NexusAlbumTile key={album.id} album={album} width={142} />)}
                </ScrollView>
              </View>
            )}
            {results.artists.length > 0 && (
              <View style={styles.group}>
                <SectionHeader title="Artists" />
                <View style={styles.artistRow}>{results.artists.map((artist)=><NexusArtistBubble key={artist.id} artist={artist} size={72} />)}</View>
              </View>
            )}
            {!results.tracks.length && !results.albums.length && !results.artists.length && (
              <View style={styles.idle}>
                <View style={styles.darkOrb} />
                <NexusText variant="heading">Nothing in this orbit</NexusText>
                <NexusText muted>Try another title or artist.</NexusText>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </NexusScreen>
  );
}

const styles=StyleSheet.create({
  header:{marginBottom:18},
  eyebrow:{letterSpacing:1.1,marginBottom:5},
  searchBox:{height:56,borderRadius:24,flexDirection:'row',alignItems:'center',gap:11,paddingHorizontal:16},
  input:{flex:1,color:nexusTokens.colors.white,fontSize:16,fontWeight:'500',paddingVertical:0},
  results:{paddingTop:24,paddingBottom:40,flexGrow:1},
  idle:{minHeight:310,alignItems:'center',justifyContent:'center',gap:10},
  idleCopy:{maxWidth:270,textAlign:'center'},
  rings:{width:92,height:92,alignItems:'center',justifyContent:'center',marginBottom:10},
  ringOne:{width:78,height:78,borderRadius:39,borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,0.18)',alignItems:'center',justifyContent:'center'},
  ringTwo:{width:42,height:42,borderRadius:21,backgroundColor:'rgba(255,255,255,0.07)'},
  darkOrb:{width:64,height:64,borderRadius:32,backgroundColor:'rgba(255,255,255,0.045)',borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,0.1)',marginBottom:10},
  group:{marginBottom:28,gap:12},
  rail:{gap:14,paddingRight:20},
  artistRow:{flexDirection:'row',flexWrap:'wrap',gap:20},
});
