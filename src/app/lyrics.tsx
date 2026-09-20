import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { lyrics } from '@/data/library';
import { usePlayer } from '@/providers/player-provider';
import { NexusArtwork, NexusIconButton, NexusText } from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';

export default function LyricsScreen(){
  const router=useRouter();
  const player=usePlayer();
  const current=Math.min(lyrics.length-1,Math.floor(player.progress*lyrics.length));
  return (
    <NexusScreen>
      <View style={styles.nav}>
        <NexusIconButton ios="chevron.left" android="arrow_back" accessibilityLabel="Back" onPress={()=>router.back()} size={44}/>
        <NexusText variant="micro" muted>LYRICS · LIVE FOCUS</NexusText>
        <View style={{width:44}}/>
      </View>
      <View style={styles.trackStrip}>
        <NexusArtwork palette={player.track.palette} size={54} radius={16} active={player.isPlaying}/>
        <View style={{flex:1,gap:2}}>
          <NexusText variant="caption">{player.track.title}</NexusText>
          <NexusText variant="micro" muted>{player.track.artist.toUpperCase()}</NexusText>
        </View>
      </View>
      <View style={styles.lyrics}>
        {lyrics.map((line,index)=>{
          const distance=Math.abs(index-current);
          const isCurrent=index===current;
          return (
            <Pressable key={line} onPress={()=>player.seek(index/lyrics.length)} style={styles.lineWrap}>
              <NexusText
                style={[
                  styles.line,
                  isCurrent && styles.current,
                  distance===1 && styles.near,
                  distance>1 && styles.far,
                ]}>
                {line}
              </NexusText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.hint}>
        <NexusText variant="micro" muted>TAP A LINE TO SEEK · SWIPE DOWN ON PLAYER TO RETURN</NexusText>
      </View>
    </NexusScreen>
  );
}

const styles=StyleSheet.create({
  nav:{height:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  trackStrip:{marginTop:12,flexDirection:'row',alignItems:'center',gap:12},
  lyrics:{marginTop:38,gap:17},
  lineWrap:{paddingVertical:2},
  line:{fontSize:27,lineHeight:34,fontWeight:'600',letterSpacing:-0.6,color:'rgba(246,247,248,0.18)'},
  current:{fontSize:32,lineHeight:39,color:'#F6F7F8',fontWeight:'700'},
  near:{color:'rgba(246,247,248,0.45)'},
  far:{color:'rgba(246,247,248,0.16)'},
  hint:{marginTop:40,alignItems:'center',opacity:0.62},
});
