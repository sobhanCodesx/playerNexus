import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { albums, artists, tracks } from '@/data/library';
import { gradientBackground } from '@/design/nexus-tokens';
import { NexusAlbumTile, NexusTrackRow } from '@/components/nexus/nexus-cards';
import { NexusIconButton, NexusText, SectionHeader } from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';

export default function ArtistScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const artist = artists.find((item) => item.id === params.id) ?? artists[0];
  const topTracks = tracks.filter((track) => track.artist === artist.name);
  const artistAlbums = albums.filter((album) => album.artist === artist.name);
  const { width } = useWindowDimensions();

  return (
    <NexusScreen>
      <View style={styles.nav}>
        <NexusIconButton ios="chevron.left" android="arrow_back" accessibilityLabel="Back" onPress={() => router.back()} size={44} />
        <NexusText variant="micro" muted>ARTIST</NexusText>
        <NexusIconButton ios="ellipsis" android="more_horiz" accessibilityLabel="Artist actions" size={44} />
      </View>

      <View style={styles.hero}>
        <View style={[styles.portrait, { width: Math.min(width - 80, 292), height: Math.min(width - 80, 292), borderRadius: 999 }, gradientBackground([artist.palette[0], artist.palette[2], artist.palette[3] ?? '#090B0D'], 138)]}>
          <View style={[styles.portraitLight,{backgroundColor:artist.palette[1]}]} />
          <NexusText style={styles.monogram}>{artist.name.split(' ').map((part)=>part[0]).join('').slice(0,2)}</NexusText>
        </View>
        <NexusText variant="display" style={styles.name}>{artist.name}</NexusText>
        <NexusText variant="caption" muted>{artist.monthlyMood}</NexusText>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Top tracks" />
        {topTracks.map((track,index)=><NexusTrackRow key={track.id} track={track} index={index} />)}
      </View>

      <View style={styles.section}>
        <SectionHeader title="Albums" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.albumRail}>
          {artistAlbums.length ? artistAlbums.map((album)=><NexusAlbumTile key={album.id} album={album} width={160} />) : albums.slice(0,2).map((album)=><NexusAlbumTile key={album.id} album={album} width={160} />)}
        </ScrollView>
      </View>

      <Pressable style={styles.recent}>
        <NexusText variant="micro" muted>RECENTLY PLAYED</NexusText>
        <NexusText variant="heading">{topTracks[0]?.title ?? 'Afterlight'}</NexusText>
        <NexusText muted>Picked up where the last session ended.</NexusText>
      </Pressable>
    </NexusScreen>
  );
}

const styles=StyleSheet.create({
  nav:{height:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  hero:{alignItems:'center',marginTop:10},
  portrait:{overflow:'hidden',alignItems:'center',justifyContent:'center',borderWidth:StyleSheet.hairlineWidth,borderColor:'rgba(255,255,255,0.17)',elevation:20},
  portraitLight:{position:'absolute',width:'74%',height:'52%',borderRadius:999,top:-20,right:-36,opacity:0.38,transform:[{rotate:'28deg'}]},
  monogram:{fontSize:66,fontWeight:'700',letterSpacing:-4,color:'rgba(255,255,255,0.82)'},
  name:{marginTop:22,textAlign:'center'},
  section:{marginTop:32,gap:12},
  albumRail:{gap:16,paddingRight:20},
  recent:{marginTop:34,gap:7,paddingVertical:22,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:'rgba(255,255,255,0.08)'},
});
