import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { gradientBackground, nexusTokens } from '@/design/nexus-tokens';
import { usePlayer } from '@/providers/player-provider';
import { NexusTrackRow } from '@/components/nexus/nexus-cards';
import { NexusArtwork, NexusIcon, NexusIconButton, NexusText } from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';

export default function AlbumScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const player = usePlayer();
  const albums = player.libraryAlbums;
  const artists = player.libraryArtists;
  const tracks = player.libraryTracks;
  const album = albums.find((item) => item.id === params.id) ?? albums[0];
  if (!album) return null;
  const albumTracks = tracks.filter((track) => album.trackIds.includes(track.id));
  const artistId = artists.find((item) => item.name === album.artist)?.id ?? artists[0]?.id;
  const { width } = useWindowDimensions();
  const artSize = Math.min(width - 100, 250);

  return (
    <NexusScreen>
      <View style={[styles.backdrop, gradientBackground([album.palette[2] + 'CC', album.palette[0] + '55', 'transparent'], 155)]} />
      <View style={styles.nav}>
        <NexusIconButton ios="chevron.left" android="arrow_back" accessibilityLabel="Back" onPress={() => router.back()} size={44} />
        <NexusText variant="micro" muted>ALBUM · {album.year}</NexusText>
        <NexusIconButton ios="ellipsis" android="more_horiz" accessibilityLabel="Album actions" size={44} />
      </View>

      <View style={styles.hero}>
        <NexusArtwork palette={album.palette} artworkUri={album.artworkUri} size={artSize} active={player.track.album === album.title && player.isPlaying} />
        <View style={styles.meta}>
          <NexusText variant="display" style={styles.title}>{album.title}</NexusText>
          <Pressable onPress={() => artistId && router.push({ pathname:'/artist', params:{ id: artistId } })}>
            <NexusText style={styles.artist}>{album.artist}</NexusText>
          </Pressable>
          <NexusText variant="caption" muted>{album.year} · {albumTracks.length} tracks · 8 min</NexusText>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            player.playTrack(albumTracks[0]);
            player.openPlayer();
          }}
          style={styles.play}>
          <NexusIcon ios="play.fill" android="play_arrow" size={24} color="#111519" />
          <NexusText variant="caption" style={{ color:'#111519' }}>Play album</NexusText>
        </Pressable>
        <View style={styles.secondary}>
          <NexusIcon ios="shuffle" android="shuffle" size={19} />
          <NexusText variant="caption">Shuffle</NexusText>
        </View>
      </View>

      <View style={styles.trackList}>
        {albumTracks.map((track, index) => <NexusTrackRow key={track.id} track={track} index={index} />)}
      </View>

      <View style={styles.notes}>
        <NexusText variant="micro" muted>ALBUM NOTE</NexusText>
        <NexusText muted>A quiet, tactile record built around distance, reflection and late-night motion.</NexusText>
      </View>
    </NexusScreen>
  );
}

const styles=StyleSheet.create({
  backdrop:{position:'absolute',top:-80,left:-20,right:-20,height:420,opacity:0.5},
  nav:{height:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:16},
  hero:{alignItems:'center',gap:22},
  meta:{alignItems:'center',gap:5},
  title:{textAlign:'center',fontSize:34,lineHeight:39},
  artist:{color:'#DADDE0',fontSize:15,fontWeight:'600'},
  actions:{marginTop:28,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:10},
  play:{height:48,borderRadius:24,paddingHorizontal:20,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'#F3F5F6'},
  secondary:{height:48,borderRadius:24,paddingHorizontal:18,flexDirection:'row',alignItems:'center',gap:8,backgroundColor:'rgba(255,255,255,0.07)'},
  trackList:{marginTop:24},
  notes:{marginTop:30,gap:8,paddingTop:20,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:nexusTokens.colors.hairline},
});
