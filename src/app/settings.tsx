import { useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';

import { nexusTokens } from '@/design/nexus-tokens';
import { usePlayer } from '@/providers/player-provider';
import { NexusIcon, NexusIconButton, NexusSurface, NexusText } from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';

type SettingRowProps={ title:string; subtitle?:string; value?:boolean; onValueChange?:(value:boolean)=>void; icon:{ios:string;android:string} };
function SettingRow({title,subtitle,value,onValueChange,icon}:SettingRowProps){
  const theme=usePlayer().theme;
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}><NexusIcon ios={icon.ios} android={icon.android} size={18} color="#B9C0C6"/></View>
      <View style={{flex:1,gap:2}}>
        <NexusText>{title}</NexusText>
        {subtitle ? <NexusText variant="caption" muted>{subtitle}</NexusText> : null}
      </View>
      {typeof value==='boolean' ? (
        <Switch value={value} onValueChange={onValueChange} thumbColor={value?'#F5F6F7':'#B0B4B8'} trackColor={{false:'#343A40',true:theme.primaryAmbient}}/>
      ) : <NexusIcon ios="chevron.right" android="chevron_right" size={18} color="#6F777E"/>}
    </View>
  );
}

export default function SettingsScreen(){
  const router=useRouter();
  const player=usePlayer();
  const [dynamic,setDynamic]=useState(true);
  const [amoled,setAmoled]=useState(false);
  const [motion,setMotion]=useState(true);
  const [haptics,setHaptics]=useState(true);
  const [gapless,setGapless]=useState(true);
  const [quality,setQuality]=useState<'Low'|'Balanced'|'Ultra'>('Balanced');

  return (
    <NexusScreen>
      <View style={styles.nav}>
        <NexusIconButton ios="chevron.left" android="arrow_back" accessibilityLabel="Back" onPress={()=>router.back()} size={44}/>
        <NexusText variant="micro" muted>SETTINGS</NexusText>
        <View style={{width:44}}/>
      </View>
      <NexusText variant="display" style={styles.title}>Tune the experience</NexusText>

      <View style={styles.section}>
        <NexusText variant="micro" muted style={styles.label}>APPEARANCE</NexusText>
        <NexusSurface style={styles.group} intensity="soft">
          <SettingRow title="Nexus Dynamic" subtitle="Derive atmosphere from artwork" value={dynamic} onValueChange={setDynamic} icon={{ios:'sparkles',android:'auto_awesome'}}/>
          <SettingRow title="Pure AMOLED" subtitle="True black idle surfaces" value={amoled} onValueChange={setAmoled} icon={{ios:'moon.fill',android:'dark_mode'}}/>
          <SettingRow title="Reduce motion" subtitle="Keep transitions, remove depth drift" value={!motion} onValueChange={(v)=>setMotion(!v)} icon={{ios:'figure.walk.motion',android:'motion_photos_off'}}/>
        </NexusSurface>
      </View>

      <View style={styles.section}>
        <NexusText variant="micro" muted style={styles.label}>AUDIO & FEEDBACK</NexusText>
        <NexusSurface style={styles.group} intensity="soft">
          <SettingRow title="Gapless playback" value={gapless} onValueChange={setGapless} icon={{ios:'waveform',android:'graphic_eq'}}/>
          <SettingRow title="Haptics" subtitle="Sparse tactile cues for meaningful actions" value={haptics} onValueChange={setHaptics} icon={{ios:'hand.tap.fill',android:'vibration'}}/>
          <SettingRow
            title="Audio-reactive visuals"
            subtitle={player.audioReactiveEnabled ? 'PCM analysis is live' : 'Bass, mids and highs drive the environment'}
            value={player.audioReactiveEnabled}
            onValueChange={(enabled)=>{ if (enabled) player.enableAudioReactive(); }}
            icon={{ios:'waveform.path.ecg',android:'graphic_eq'}}
          />
          <SettingRow title="Crossfade" subtitle="Off" icon={{ios:'arrow.triangle.merge',android:'merge'}}/>
        </NexusSurface>
      </View>

      <View style={styles.section}>
        <NexusText variant="micro" muted style={styles.label}>VISUALIZER QUALITY</NexusText>
        <View style={styles.quality}>
          {(['Low','Balanced','Ultra'] as const).map((item)=>(
            <Pressable key={item} onPress={()=>setQuality(item)} style={[styles.qualityItem,quality===item&&styles.qualityActive]}>
              <NexusText variant="caption" style={{color:quality===item?'#F7F8F9':'#7F878E'}}>{item}</NexusText>
            </Pressable>
          ))}
        </View>
        <NexusText variant="caption" muted style={styles.qualityHint}>Balanced adapts bloom, aura layers and visualizer density to the device frame budget.</NexusText>
      </View>

      <View style={styles.section}>
        <NexusText variant="micro" muted style={styles.label}>LIBRARY</NexusText>
        <NexusSurface style={styles.group} intensity="soft">
          <SettingRow title="Scan folders" subtitle="Choose where Nexus looks for music" icon={{ios:'folder.fill',android:'folder'}}/>
          <Pressable onPress={() => player.scanLibrary(true)}>
            <SettingRow title="Rescan library" subtitle="Refresh local metadata and artwork" icon={{ios:'arrow.clockwise',android:'refresh'}}/>
          </Pressable>
        </NexusSurface>
      </View>

      <View style={styles.about}>
        <NexusText variant="heading">NEXUS PLAYER</NexusText>
        <NexusText variant="caption" muted>Audio should become the interface.</NexusText>
        <NexusText variant="micro" muted>DESIGN LANGUAGE · NEXUS GLASS ENGINE</NexusText>
      </View>
    </NexusScreen>
  );
}

const styles=StyleSheet.create({
  nav:{height:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  title:{marginTop:12,maxWidth:300},
  section:{marginTop:30,gap:10},
  label:{letterSpacing:1.15,paddingLeft:2},
  group:{borderRadius:26,paddingHorizontal:14},
  row:{minHeight:68,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:'rgba(255,255,255,0.06)'},
  rowIcon:{width:34,height:34,borderRadius:14,backgroundColor:'rgba(255,255,255,0.055)',alignItems:'center',justifyContent:'center'},
  quality:{height:48,flexDirection:'row',gap:4,padding:4,borderRadius:24,backgroundColor:'rgba(255,255,255,0.045)'},
  qualityItem:{flex:1,borderRadius:20,alignItems:'center',justifyContent:'center'},
  qualityActive:{backgroundColor:'rgba(255,255,255,0.10)'},
  qualityHint:{lineHeight:18,paddingHorizontal:2},
  about:{marginTop:38,alignItems:'center',gap:5,paddingVertical:28,opacity:0.78},
});
