import { useEffect } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePlayer } from '@/providers/player-provider';
import { gradientBackground, nexusTokens } from '@/design/nexus-tokens';
import { nexusHaptics } from '@/services/haptics';
import {
  NexusArtwork,
  NexusAura,
  NexusIcon,
  NexusIconButton,
  NexusOrb,
  NexusText,
  NexusWaveform,
} from './nexus-primitives';

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const rounded = Math.floor(seconds);
  return Math.floor(rounded / 60) + ':' + String(rounded % 60).padStart(2, '0');
}

export function NexusPlayerLayer() {
  const player = usePlayer();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const expansion = useSharedValue(player.expanded ? 1 : 0);
  const playPulse = useSharedValue(0);
  const gestureStart = useSharedValue(0);
  const openQueue = () => {
    player.closePlayer();
    router.push('/queue');
  };
  const openLyrics = () => {
    player.closePlayer();
    router.push('/lyrics');
  };
  const openVisualizer = async () => {
    if (!player.audioReactiveEnabled) {
      const enabled = await player.enableAudioReactive();
      if (!enabled) return;
    }
    player.closePlayer();
    router.push('/visualizer');
  };

  useEffect(() => {
    expansion.value = withSpring(player.expanded ? 1 : 0, {
      damping: player.expanded ? 24 : 28,
      stiffness: player.expanded ? 150 : 210,
      mass: 0.85,
    });
  }, [player.expanded, expansion]);

  useEffect(() => {
    if (player.isPlaying) {
      playPulse.value = withSequence(
        withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 760, easing: Easing.out(Easing.quad) }),
      );
    }
  }, [player.isPlaying, playPulse]);

  const shellStyle = useAnimatedStyle(() => ({
    left: interpolate(expansion.value, [0, 1], [14, 0]),
    right: interpolate(expansion.value, [0, 1], [14, 0]),
    bottom: interpolate(expansion.value, [0, 1], [insets.bottom + 80, 0]),
    height: interpolate(expansion.value, [0, 1], [72, height]),
    borderRadius: interpolate(expansion.value, [0, 1], [28, 0]),
  }));

  const artStyle = useAnimatedStyle(() => {
    const fullSize = Math.min(width - 64, 310);
    return {
      left: interpolate(expansion.value, [0, 1], [12, (width - fullSize) / 2]),
      top: interpolate(expansion.value, [0, 1], [12, insets.top + 86]),
      width: interpolate(expansion.value, [0, 1], [48, fullSize]),
      height: interpolate(expansion.value, [0, 1], [48, fullSize]),
      borderRadius: interpolate(expansion.value, [0, 1], [14, 30]),
      transform: [
        { perspective: 900 },
        { scale: interpolate(playPulse.value, [0, 1], [1, 1.018]) },
        { rotateX: interpolate(playPulse.value, [0, 1], [0, -1.1]) + 'deg' },
      ],
    };
  });

  const miniStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expansion.value, [0, 0.45], [1, 0]),
    transform: [{ translateY: interpolate(expansion.value, [0, 1], [0, 10]) }],
  }));

  const fullStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expansion.value, [0.45, 0.8, 1], [0, 0.35, 1]),
    transform: [{ translateY: interpolate(expansion.value, [0.45, 1], [22, 0]) }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expansion.value, [0, 0.55, 1], [0, 0.6, 1]),
  }));

  const verticalPan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onStart(() => {
      gestureStart.value = expansion.value;
    })
    .onUpdate((event) => {
      const travel = Math.max(280, height * 0.52);
      const next = gestureStart.value < 0.5
        ? -event.translationY / travel
        : 1 - event.translationY / travel;
      expansion.value = Math.max(0, Math.min(1, next));
    })
    .onEnd((event) => {
      const shouldOpen = expansion.value > 0.38 || event.velocityY < -520;
      const shouldClose = expansion.value < 0.72 || event.velocityY > 620;
      if (gestureStart.value < 0.5) {
        if (shouldOpen) runOnJS(player.openPlayer)();
        else expansion.value = withSpring(0, { damping: 24, stiffness: 220 });
      } else {
        if (shouldClose) runOnJS(player.closePlayer)();
        else expansion.value = withSpring(1, { damping: 24, stiffness: 190 });
      }
    });

  const artworkSwipe = Gesture.Pan()
    .activeOffsetX([-26, 26])
    .failOffsetY([-30, 30])
    .onEnd((event) => {
      if (Math.abs(event.translationX) < 54 && Math.abs(event.velocityX) < 420) return;
      if (event.translationX < 0) runOnJS(player.next)();
      else runOnJS(player.previous)();
      runOnJS(nexusHaptics.transport)();
    });

  const favoriteTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(240)
    .onEnd((_event, success) => {
      if (success) {
        runOnJS(player.toggleFavorite)();
        runOnJS(nexusHaptics.favorite)();
      }
    });

  const longPress = Gesture.LongPress()
    .minDuration(520)
    .onStart(() => {
      runOnJS(nexusHaptics.lift)();
      runOnJS(openQueue)();
    });

  const artworkGesture = Gesture.Exclusive(favoriteTap, longPress, artworkSwipe);

  return (
    <GestureDetector gesture={verticalPan}>
      <Animated.View
        pointerEvents="auto"
        style={[styles.shell, shellStyle, { backgroundColor: player.theme.glassTint }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFillObject,
            backdropStyle,
            gradientBackground([
              player.theme.backgroundTint,
              player.track.palette[2] + 'EE',
              '#07090B',
            ], 165),
          ]}>
          <NexusAura
            palette={player.track.palette}
            active={player.isPlaying}
            bands={player.audioBands}
            size={Math.max(width, height) * 0.78}
            style={styles.fullAura}
          />
        </Animated.View>

        <GestureDetector gesture={artworkGesture}>
          <Animated.View style={[styles.artAbsolute, artStyle]}>
            <NexusArtwork
              palette={player.track.palette}
              artworkUri={player.track.artworkUri}
              size={width}
              radius={0}
              active={player.isPlaying}
              style={styles.artFill}
            />
          </Animated.View>
        </GestureDetector>

        <Animated.View pointerEvents={player.expanded ? 'none' : 'auto'} style={[styles.miniContent, miniStyle]}>
          <Pressable
            onPress={player.openPlayer}
            accessibilityRole="button"
            accessibilityLabel={'Open Now Playing for ' + player.track.title}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.miniText}>
            <NexusText variant="caption" numberOfLines={1}>{player.track.title}</NexusText>
            <NexusText variant="micro" muted numberOfLines={1}>{player.track.artist}</NexusText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={player.isPlaying ? 'Pause' : 'Play'}
            onPress={(event) => {
              event.stopPropagation();
              nexusHaptics.play();
              player.togglePlayback();
            }}
            style={styles.miniPlay}>
            <NexusIcon
              ios={player.isPlaying ? 'pause.fill' : 'play.fill'}
              android={player.isPlaying ? 'pause' : 'play_arrow'}
              size={24}
            />
          </Pressable>
        </Animated.View>

        <Animated.View
          pointerEvents={player.expanded ? 'auto' : 'none'}
          style={[styles.fullContent, fullStyle, { paddingTop: insets.top + 18, paddingBottom: Math.max(22, insets.bottom + 10) }]}>
          <View style={styles.topRow}>
            <NexusIconButton
              ios="chevron.down"
              android="keyboard_arrow_down"
              accessibilityLabel="Close player"
              onPress={player.closePlayer}
              size={44}
            />
            <NexusText variant="micro" muted style={styles.nowLabel}>NOW PLAYING</NexusText>
            <NexusIconButton
              ios="text.line.first.and.arrowtriangle.forward"
              android="queue_music"
              accessibilityLabel="Open queue"
              onPress={openQueue}
              size={44}
            />
          </View>

          <View style={styles.spacer} />

          <View style={styles.metaRow}>
            <View style={styles.trackMeta}>
              <NexusText variant="title" numberOfLines={1}>{player.track.title}</NexusText>
              <NexusText muted style={styles.artist}>{player.track.artist} · {player.track.album}</NexusText>
            </View>
            <Pressable
              onPress={player.toggleFavorite}
              accessibilityRole="button"
              accessibilityLabel={player.favorite ? 'Remove from favorites' : 'Add to favorites'}
              style={styles.favorite}>
              <NexusIcon
                ios={player.favorite ? 'heart.fill' : 'heart'}
                android={player.favorite ? 'favorite' : 'favorite_border'}
                color={player.favorite ? player.theme.accent : nexusTokens.colors.white}
                size={24}
              />
            </Pressable>
          </View>

          <View style={styles.waveBlock}>
            <NexusWaveform progress={player.progress} onSeek={player.seek} accent={player.theme.accent} />
            <View style={styles.timeRow}>
              <NexusText variant="micro" muted>{formatTime(player.currentTime)}</NexusText>
              <NexusText variant="micro" muted>{player.track.duration}</NexusText>
            </View>
          </View>

          <View style={styles.controlField}>
            <NexusIconButton ios="shuffle" android="shuffle" accessibilityLabel="Shuffle" size={44} />
            <NexusIconButton ios="backward.end.fill" android="skip_previous" accessibilityLabel="Previous" onPress={player.previous} size={52} />
            <NexusIconButton
              ios={player.isPlaying ? 'pause.fill' : 'play.fill'}
              android={player.isPlaying ? 'pause' : 'play_arrow'}
              accessibilityLabel={player.isPlaying ? 'Pause' : 'Play'}
              onPress={player.togglePlayback}
              size={72}
              primary
            />
            <NexusIconButton ios="forward.end.fill" android="skip_next" accessibilityLabel="Next" onPress={player.next} size={52} />
            <NexusIconButton ios="repeat" android="repeat" accessibilityLabel="Repeat" size={44} />
          </View>

          <View style={styles.bottomModes}>
            <Pressable onPress={openLyrics} style={styles.modeLink}>
              <NexusText variant="caption">Lyrics</NexusText>
              <NexusText variant="micro" muted>FOCUS MODE</NexusText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={player.audioReactiveEnabled ? 'Audio reactive visuals enabled' : 'Enable audio reactive visuals'}
              onPress={openVisualizer}
              style={styles.orbMode}>
              <NexusOrb palette={player.track.palette} active={player.isPlaying} bands={player.audioBands} size={68} />
              <NexusText variant="micro" muted>{player.audioReactiveEnabled ? 'AUDIO LIVE' : 'TAP FOR LIVE'}</NexusText>
            </Pressable>
            <Pressable onPress={openQueue} style={[styles.modeLink, styles.modeRight]}>
              <NexusText variant="caption">Up next</NexusText>
              <NexusText variant="micro" muted>{player.queue.length} TRACKS</NexusText>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    overflow: 'hidden',
    zIndex: 50,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.13)',
    elevation: 22,
  },
  artAbsolute: {
    position: 'absolute',
    overflow: 'hidden',
    zIndex: 4,
    elevation: 14,
  },
  artFill: {
    width: '100%',
    height: '100%',
  },
  miniContent: {
    flex: 1,
    paddingLeft: 72,
    paddingRight: 58,
    justifyContent: 'center',
  },
  miniText: { gap: 1 },
  miniPlay: {
    position: 'absolute',
    right: 10,
    top: 11,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullContent: {
    flex: 1,
    paddingHorizontal: 24,
    zIndex: 8,
  },
  fullAura: {
    position: 'absolute',
    alignSelf: 'center',
    top: -80,
    left: -110,
  },
  topRow: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nowLabel: {
    letterSpacing: 1.4,
  },
  spacer: {
    flex: 1,
    minHeight: 326,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
  },
  trackMeta: { flex: 1, gap: 4 },
  artist: { fontSize: 14 },
  favorite: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  waveBlock: { marginTop: 20 },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  controlField: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomModes: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeLink: { width: 92, gap: 2 },
  modeRight: { alignItems: 'flex-end' },
  orbMode: { alignItems: 'center', gap: 5, marginTop: -5 },
});
