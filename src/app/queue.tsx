import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import type { Track } from '@/data/library';
import { usePlayer } from '@/providers/player-provider';
import {
  NexusArtwork,
  NexusIcon,
  NexusIconButton,
  NexusSurface,
  NexusText,
} from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';
import { nexusHaptics } from '@/services/haptics';

function QueueRow({
  track,
  index,
  current,
  played,
  onMove,
  onPlay,
  onRemove,
}: {
  track: Track;
  index: number;
  current: boolean;
  played: boolean;
  onMove: (from: number, to: number) => void;
  onPlay: () => void;
  onRemove: () => void;
}) {
  const y = useSharedValue(0);
  const dragging = useSharedValue(0);

  const gesture = Gesture.Pan()
    .activateAfterLongPress(180)
    .onStart(() => {
      dragging.value = 1;
      runOnJS(nexusHaptics.lift)();
    })
    .onUpdate((event) => {
      y.value = event.translationY;
    })
    .onEnd(() => {
      const offset = Math.round(y.value / 68);
      const to = Math.max(0, index + offset);
      runOnJS(onMove)(index, to);
      y.value = withSpring(0, { damping: 18, stiffness: 220 });
      dragging.value = 0;
    });

  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }, { scale: dragging.value ? 1.018 : 1 }],
    zIndex: dragging.value ? 10 : 0,
    elevation: dragging.value ? 18 : 0,
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.row, animated, current && styles.currentRow, played && styles.playedRow]}>
        <View style={styles.handle}>
          <NexusIcon ios="line.3.horizontal" android="drag_handle" size={19} color="#667078" />
        </View>

        <Pressable onPress={onPlay} style={styles.trackPress}>
          <NexusArtwork
            palette={track.palette}
            artworkUri={track.artworkUri}
            size={42}
            radius={13}
            active={current}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <NexusText numberOfLines={1}>{track.title}</NexusText>
            <NexusText variant="caption" muted numberOfLines={1}>
              {current ? 'NOW PLAYING · ' : played ? 'PLAYED · ' : ''}
              {track.artist}
            </NexusText>
          </View>
          <NexusText variant="caption" muted>{track.duration}</NexusText>
        </Pressable>

        {!current ? (
          <Pressable
            onPress={onRemove}
            accessibilityRole="button"
            accessibilityLabel={'Remove ' + track.title + ' from queue'}
            style={styles.remove}>
            <NexusIcon ios="minus.circle" android="remove_circle_outline" size={18} color="#747D84" />
          </Pressable>
        ) : (
          <View style={styles.liveDotWrap}>
            <View style={styles.liveDot} />
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

export default function QueueScreen() {
  const router = useRouter();
  const player = usePlayer();
  const currentIndex = Math.max(0, player.queue.findIndex((track) => track.id === player.track.id));
  const upcomingCount = Math.max(0, player.queue.length - currentIndex - 1);

  return (
    <NexusScreen>
      <View style={styles.nav}>
        <NexusIconButton
          ios="chevron.left"
          android="arrow_back"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          size={44}
        />
        <NexusText variant="micro" muted>SESSION QUEUE</NexusText>
        <NexusIconButton
          ios="plus"
          android="add"
          accessibilityLabel="Add music to queue"
          onPress={() => router.push('/queue-add')}
          size={44}
        />
      </View>

      <View style={styles.header}>
        <NexusText variant="display">Up next</NexusText>
        <NexusText muted>Hold and move to reshape the session. Tap any track to jump there.</NexusText>
      </View>

      <NexusSurface style={styles.status} intensity="soft">
        <View style={styles.statusItem}>
          <NexusIcon ios="shuffle" android="shuffle" size={16} color={player.shuffleEnabled ? player.theme.accent : '#808890'} />
          <NexusText variant="micro" muted={!player.shuffleEnabled}>
            {player.shuffleEnabled ? 'SHUFFLE ON' : 'SHUFFLE OFF'}
          </NexusText>
        </View>
        <View style={styles.divider} />
        <View style={styles.statusItem}>
          <NexusIcon
            ios={player.repeatMode === 'one' ? 'repeat.1' : 'repeat'}
            android={player.repeatMode === 'one' ? 'repeat_one' : 'repeat'}
            size={16}
            color={player.repeatMode !== 'off' ? player.theme.accent : '#808890'}
          />
          <NexusText variant="micro" muted={player.repeatMode === 'off'}>
            {player.repeatMode === 'one' ? 'REPEAT ONE' : player.repeatMode === 'all' ? 'REPEAT ALL' : 'REPEAT OFF'}
          </NexusText>
        </View>
      </NexusSurface>

      <View style={styles.utility}>
        <NexusText variant="micro" muted>
          {currentIndex} PLAYED · {upcomingCount} UPCOMING
        </NexusText>
        {upcomingCount > 0 ? (
          <Pressable onPress={player.clearUpcoming} style={styles.clearButton}>
            <NexusText variant="micro" muted>CLEAR UPCOMING</NexusText>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.list}>
        {player.queue.map((track, index) => (
          <QueueRow
            key={track.id}
            track={track}
            index={index}
            current={track.id === player.track.id}
            played={index < currentIndex}
            onPlay={() => {
              player.playTrack(track);
              nexusHaptics.transport();
            }}
            onRemove={() => player.removeFromQueue(track.id)}
            onMove={(from, to) => player.moveQueueItem(from, Math.min(player.queue.length - 1, to))}
          />
        ))}
      </View>

      <Pressable onPress={() => router.push('/queue-add')} style={styles.addMore}>
        <NexusIcon ios="plus.circle.fill" android="add_circle" size={20} color="#A6AEB5" />
        <View style={{ flex: 1, gap: 2 }}>
          <NexusText variant="caption">Add music</NexusText>
          <NexusText variant="micro" muted>PLAY NEXT OR APPEND TO THIS SESSION</NexusText>
        </View>
        <NexusIcon ios="chevron.right" android="chevron_right" size={18} color="#737C83" />
      </Pressable>
    </NexusScreen>
  );
}

const styles = StyleSheet.create({
  nav: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  header: { marginTop: 10, gap: 6, marginBottom: 18 },
  status: { minHeight: 52, borderRadius: 22, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  statusItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  divider: { width: StyleSheet.hairlineWidth, height: 24, backgroundColor: 'rgba(255,255,255,0.08)' },
  utility: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clearButton: { paddingVertical: 10, paddingLeft: 12 },
  list: { gap: 2 },
  row: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.065)', backgroundColor: 'transparent' },
  currentRow: { backgroundColor: 'rgba(255,255,255,0.045)', borderRadius: 18, borderBottomColor: 'transparent' },
  playedRow: { opacity: 0.52 },
  handle: { width: 28, alignItems: 'center' },
  trackPress: { flex: 1, minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11 },
  remove: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  liveDotWrap: { width: 38, height: 44, alignItems: 'center', justifyContent: 'center' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#E6EBEE' },
  addMore: { minHeight: 72, marginTop: 18, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.07)', flexDirection: 'row', alignItems: 'center', gap: 12 },
});
