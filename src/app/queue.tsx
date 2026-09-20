import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { Track } from '@/data/library';
import { usePlayer } from '@/providers/player-provider';
import { NexusIcon, NexusIconButton, NexusText } from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';
import { nexusHaptics } from '@/services/haptics';

function QueueRow({ track, index, current, onMove }:{ track:Track; index:number; current:boolean; onMove:(from:number,to:number)=>void }) {
  const y=useSharedValue(0);
  const dragging=useSharedValue(0);
  const gesture=Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart(()=>{
      dragging.value=1;
      runOnJS(nexusHaptics.lift)();
    })
    .onUpdate((event)=>{ y.value=event.translationY; })
    .onEnd(()=>{
      const offset=Math.round(y.value/66);
      const to=Math.max(0,index+offset);
      runOnJS(onMove)(index,to);
      y.value=withSpring(0,{damping:18,stiffness:220});
      dragging.value=0;
    });
  const animated=useAnimatedStyle(()=>({
    transform:[{translateY:y.value},{scale:dragging.value?1.018:1}],
    zIndex:dragging.value?10:0,
    elevation:dragging.value?18:0,
  }));
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.row,animated,current && styles.currentRow]}>
        <View style={styles.handle}><NexusIcon ios="line.3.horizontal" android="drag_handle" size={20} color="#697178" /></View>
        <View style={[styles.index,current && styles.indexCurrent]}><NexusText variant="micro" muted={!current}>{String(index+1).padStart(2,'0')}</NexusText></View>
        <View style={{flex:1,gap:2}}>
          <NexusText numberOfLines={1}>{track.title}</NexusText>
          <NexusText variant="caption" muted numberOfLines={1}>{track.artist}</NexusText>
        </View>
        <NexusText variant="caption" muted>{track.duration}</NexusText>
      </Animated.View>
    </GestureDetector>
  );
}

export default function QueueScreen(){
  const router=useRouter();
  const player=usePlayer();
  return (
    <NexusScreen>
      <View style={styles.nav}>
        <NexusIconButton ios="chevron.left" android="arrow_back" accessibilityLabel="Back" onPress={()=>router.back()} size={44}/>
        <NexusText variant="micro" muted>QUEUE</NexusText>
        <View style={{width:44}}/>
      </View>
      <View style={styles.header}>
        <NexusText variant="display">Up next</NexusText>
        <NexusText muted>Press, hold and move a track to reshape the session.</NexusText>
      </View>
      <View style={styles.list}>
        {player.queue.map((track,index)=>(
          <QueueRow
            key={track.id}
            track={track}
            index={index}
            current={track.id===player.track.id}
            onMove={(from,to)=>player.moveQueueItem(from,Math.min(player.queue.length-1,to))}
          />
        ))}
      </View>
    </NexusScreen>
  );
}

const styles=StyleSheet.create({
  nav:{height:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  header:{marginTop:10,gap:6,marginBottom:18},
  list:{gap:2},
  row:{height:64,flexDirection:'row',alignItems:'center',gap:10,paddingHorizontal:6,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'rgba(255,255,255,0.065)',backgroundColor:'transparent'},
  currentRow:{backgroundColor:'rgba(255,255,255,0.04)',borderRadius:16,borderBottomColor:'transparent'},
  handle:{width:26,alignItems:'center'},
  index:{width:30,height:30,borderRadius:15,alignItems:'center',justifyContent:'center'},
  indexCurrent:{backgroundColor:'rgba(255,255,255,0.08)'},
});
