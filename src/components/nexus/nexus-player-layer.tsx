import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
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
import { useNexusCollections } from '@/providers/collections-provider';
import { useNexusSettings } from '@/providers/settings-provider';
import { useNexusDeviceParallax } from '@/hooks/use-nexus-device-parallax';
import { gradientBackground, nexusTokens } from '@/design/nexus-tokens';
import { nexusHaptics } from '@/services/haptics';
import {
  NexusArtwork,
  NexusAura,
  NexusIcon,
  NexusIconButton,
  NexusOrb,
  NexusSurface,
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
  const collections = useNexusCollections();
  const { effectiveReduceMotion, screenReaderEnabled, settings } = useNexusSettings();
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [playlistMode, setPlaylistMode] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const compactPlayer = height < 820;
  const expandedArtworkSize = Math.max(
    218,
    Math.min(width - 64, compactPlayer ? 276 : 310, height * (compactPlayer ? 0.34 : 0.38)),
  );
  const expandedArtworkTop = insets.top + (compactPlayer ? 62 : 78);
  const expansion = useSharedValue(player.expanded ? 1 : 0);
  const playPulse = useSharedValue(0);
  const parallax = useNexusDeviceParallax(
    player.expanded && settings.depthMotion && !effectiveReduceMotion,
  );
  const gestureStart = useSharedValue(0);
  const openQueue = () => {
    player.closePlayer();
    router.push('/queue');
  };
  const openLyrics = () => {
    player.closePlayer();
    router.push('/lyrics');
  };
  const openQuickActions = () => {
    player.openPlayer();
    setPlaylistMode(false);
    setQuickActionsOpen(true);
  };
  const closeQuickActions = () => {
    setQuickActionsOpen(false);
    setPlaylistMode(false);
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
    expansion.value = effectiveReduceMotion
      ? withTiming(player.expanded ? 1 : 0, { duration: 0 })
      : withSpring(player.expanded ? 1 : 0, {
          damping: player.expanded ? 24 : 28,
          stiffness: player.expanded ? 150 : 210,
          mass: 0.85,
        });
  }, [effectiveReduceMotion, player.expanded, expansion]);

  useEffect(() => {
    if (player.isPlaying && !effectiveReduceMotion) {
      playPulse.value = withSequence(
        withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 760, easing: Easing.out(Easing.quad) }),
      );
    }
  }, [effectiveReduceMotion, player.isPlaying, playPulse]);

  const shellStyle = useAnimatedStyle(() => ({
    left: interpolate(expansion.value, [0, 1], [14, 0]),
    right: interpolate(expansion.value, [0, 1], [14, 0]),
    bottom: interpolate(expansion.value, [0, 1], [insets.bottom + 80, 0]),
    height: interpolate(expansion.value, [0, 1], [72, height]),
    borderRadius: interpolate(expansion.value, [0, 1], [28, 0]),
  }));

  const artStyle = useAnimatedStyle(() => {
    return {
      left: interpolate(expansion.value, [0, 1], [12, (width - expandedArtworkSize) / 2]),
      top: interpolate(expansion.value, [0, 1], [12, expandedArtworkTop]),
      width: interpolate(expansion.value, [0, 1], [48, expandedArtworkSize]),
      height: interpolate(expansion.value, [0, 1], [48, expandedArtworkSize]),
      borderRadius: interpolate(expansion.value, [0, 1], [14, 30]),
      transform: [
        { perspective: 900 },
        { scale: interpolate(playPulse.value, [0, 1], [1, 1.018]) },
        {
          rotateX:
            (interpolate(playPulse.value, [0, 1], [0, -1.1]) - parallax.y.value * 2.2) + 'deg',
        },
        { rotateY: parallax.x.value * 2.5 + 'deg' },
        { translateX: parallax.x.value * 3.5 },
        { translateY: parallax.y.value * 2.5 },
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
    transform: [
      { translateX: parallax.x.value * -9 },
      { translateY: parallax.y.value * -7 },
      { scale: 1.035 },
    ],
  }));

  const verticalPan = Gesture.Pan()
    .enabled(!screenReaderEnabled)
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
    .enabled(!screenReaderEnabled)
    .activeOffsetX([-26, 26])
    .failOffsetY([-30, 30])
    .onEnd((event) => {
      if (Math.abs(event.translationX) < 54 && Math.abs(event.velocityX) < 420) return;
      if (event.translationX < 0) runOnJS(player.next)();
      else runOnJS(player.previous)();
      runOnJS(nexusHaptics.transport)();
    });

  const favoriteTap = Gesture.Tap()
    .enabled(!screenReaderEnabled)
    .numberOfTaps(2)
    .maxDuration(240)
    .onEnd((_event, success) => {
      if (success) {
        runOnJS(player.toggleFavorite)();
        runOnJS(nexusHaptics.favorite)();
      }
    });

  const longPress = Gesture.LongPress()
    .enabled(!screenReaderEnabled)
    .minDuration(520)
    .onStart(() => {
      runOnJS(nexusHaptics.lift)();
      runOnJS(openQuickActions)();
    });

  const artworkGesture = Gesture.Exclusive(favoriteTap, longPress, artworkSwipe);

  if (pathname === '/visualizer' || pathname === '/onboarding') return null;

  return (
    <GestureDetector gesture={verticalPan}>
      <Animated.View
        pointerEvents="auto"
        style={[styles.shell, shellStyle, { backgroundColor: player.theme.glassTint }]}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
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
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.miniText}>
            <NexusText variant="caption" numberOfLines={1}>{player.track.title}</NexusText>
            <NexusText
              variant="micro"
              muted
              accessibilityLiveRegion="polite"
              numberOfLines={1}>
              {player.playbackError ? 'Playback issue' : player.isBuffering ? 'Buffering' : player.track.artist}
            </NexusText>
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

        {player.isTransitioning ? (
          <Animated.View
            pointerEvents="none"
            entering={effectiveReduceMotion ? undefined : FadeIn.duration(180)}
            exiting={effectiveReduceMotion ? undefined : FadeOut.duration(260)}
            style={styles.transitionVeil}>
            <View style={[styles.transitionGlow, { backgroundColor: player.theme.primaryAmbient }]} />
            <NexusText variant="micro" muted style={styles.transitionLabel}>BLENDING</NexusText>
          </Animated.View>
        ) : null}

        <Animated.View
          pointerEvents={player.expanded ? 'auto' : 'none'}
          style={[
            styles.fullContent,
            fullStyle,
            {
              paddingTop: insets.top + (compactPlayer ? 10 : 18),
              paddingBottom: Math.max(compactPlayer ? 12 : 22, insets.bottom + 8),
            },
          ]}>
          <View style={styles.topRow}>
            <NexusIconButton
              ios="chevron.down"
              android="keyboard_arrow_down"
              accessibilityLabel="Close player"
              onPress={player.closePlayer}
              size={44}
            />
            <NexusText
              variant="micro"
              muted
              accessibilityLiveRegion="polite"
              style={styles.nowLabel}>
              {player.playbackError ? 'PLAYBACK ISSUE' : player.isBuffering ? 'BUFFERING' : 'NOW PLAYING'}
            </NexusText>
            <NexusIconButton
              ios="text.line.first.and.arrowtriangle.forward"
              android="queue_music"
              accessibilityLabel="Open queue"
              onPress={openQueue}
              size={44}
            />
          </View>

          <View style={styles.spacer} />

          <View style={[styles.metaRow, compactPlayer && styles.metaRowCompact]}>
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

          <View style={[styles.waveBlock, compactPlayer && styles.waveBlockCompact]}>
            <NexusWaveform
              progress={player.progress}
              onSeek={player.seek}
              accent={player.theme.accent}
              samples={player.waveform}
              duration={player.duration}
            />
            <View style={styles.timeRow}>
              <NexusText variant="micro" muted>{formatTime(player.currentTime)}</NexusText>
              <NexusText variant="micro" muted>{formatTime(player.duration)}</NexusText>
            </View>
          </View>

          <View style={[styles.controlField, compactPlayer && styles.controlFieldCompact]}>
            <NexusIconButton
              ios="shuffle"
              android="shuffle"
              accessibilityLabel={player.shuffleEnabled ? 'Disable shuffle' : 'Enable shuffle'}
              onPress={player.toggleShuffle}
              active={player.shuffleEnabled}
              accent={player.theme.accent}
              size={44}
            />
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
            <NexusIconButton
              ios={player.repeatMode === 'one' ? 'repeat.1' : 'repeat'}
              android={player.repeatMode === 'one' ? 'repeat_one' : 'repeat'}
              accessibilityLabel={
                player.repeatMode === 'off'
                  ? 'Repeat off'
                  : player.repeatMode === 'all'
                    ? 'Repeat all'
                    : 'Repeat one'
              }
              onPress={player.toggleRepeat}
              active={player.repeatMode !== 'off'}
              accent={player.theme.accent}
              size={44}
            />
          </View>

          <View style={[styles.bottomModes, compactPlayer && styles.bottomModesCompact]}>
            <Pressable onPress={openLyrics} style={styles.modeLink}>
              <NexusText variant="caption">Lyrics</NexusText>
              <NexusText variant="micro" muted>FOCUS MODE</NexusText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={player.audioReactiveEnabled ? 'Audio reactive visuals enabled' : 'Enable audio reactive visuals'}
              onPress={openVisualizer}
              style={styles.orbMode}>
              <NexusOrb
                palette={player.track.palette}
                active={player.isPlaying}
                bands={player.audioBands}
                size={compactPlayer ? 50 : 68}
              />
              <NexusText variant="micro" muted>{player.audioReactiveEnabled ? 'AUDIO LIVE' : 'TAP FOR LIVE'}</NexusText>
            </Pressable>
            <Pressable onPress={openQueue} style={[styles.modeLink, styles.modeRight]}>
              <NexusText variant="caption">Up next</NexusText>
              <NexusText variant="micro" muted>{player.queue.length} TRACKS</NexusText>
            </Pressable>
          </View>
        </Animated.View>

        {quickActionsOpen ? (
          <Animated.View
            entering={effectiveReduceMotion ? undefined : FadeIn.duration(160)}
            exiting={effectiveReduceMotion ? undefined : FadeOut.duration(150)}
            style={styles.quickOverlay}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close quick actions"
              onPress={closeQuickActions}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View
              entering={effectiveReduceMotion ? undefined : SlideInDown.duration(320)}
              exiting={effectiveReduceMotion ? undefined : SlideOutDown.duration(220)}
              style={styles.quickSheet}>
              <NexusSurface style={styles.quickSurface} intensity="strong">
                <View style={styles.quickHandle} />
                <View style={styles.quickHeader}>
                  <NexusArtwork
                    palette={player.track.palette}
                    artworkUri={player.track.artworkUri}
                    size={54}
                    radius={16}
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <NexusText variant="heading" numberOfLines={1}>{player.track.title}</NexusText>
                    <NexusText variant="caption" muted numberOfLines={1}>{player.track.artist}</NexusText>
                  </View>
                  <Pressable onPress={closeQuickActions} style={styles.quickClose}>
                    <NexusIcon ios="xmark" android="close" size={18} color="#8D959C" />
                  </Pressable>
                </View>

                {!playlistMode ? (
                  <View style={styles.quickActions}>
                    <Pressable
                      onPress={() => {
                        player.toggleFavorite();
                        nexusHaptics.favorite();
                      }}
                      style={styles.quickAction}>
                      <View style={styles.quickActionIcon}>
                        <NexusIcon
                          ios={player.favorite ? 'heart.slash.fill' : 'heart.fill'}
                          android={player.favorite ? 'heart_broken' : 'favorite'}
                          size={19}
                          color={player.favorite ? '#C2C8CD' : player.theme.accent}
                        />
                      </View>
                      <NexusText variant="caption">
                        {player.favorite ? 'Remove favorite' : 'Keep in favorites'}
                      </NexusText>
                    </Pressable>

                    <Pressable onPress={() => setPlaylistMode(true)} style={styles.quickAction}>
                      <View style={styles.quickActionIcon}>
                        <NexusIcon ios="text.badge.plus" android="playlist_add" size={19} color="#C2C8CD" />
                      </View>
                      <NexusText variant="caption">Add to playlist</NexusText>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        const album = player.libraryAlbums.find(
                          (item) => item.title === player.track.album && item.artist === player.track.artist,
                        );
                        if (!album) return;
                        closeQuickActions();
                        player.closePlayer();
                        router.push({ pathname: '/album', params: { id: album.id } });
                      }}
                      style={styles.quickAction}>
                      <View style={styles.quickActionIcon}>
                        <NexusIcon ios="square.stack.fill" android="album" size={19} color="#C2C8CD" />
                      </View>
                      <NexusText variant="caption">Open album</NexusText>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        const artist = player.libraryArtists.find((item) => item.name === player.track.artist);
                        if (!artist) return;
                        closeQuickActions();
                        player.closePlayer();
                        router.push({ pathname: '/artist', params: { id: artist.id } });
                      }}
                      style={styles.quickAction}>
                      <View style={styles.quickActionIcon}>
                        <NexusIcon ios="person.crop.circle.fill" android="person" size={19} color="#C2C8CD" />
                      </View>
                      <NexusText variant="caption">Open artist</NexusText>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        closeQuickActions();
                        openQueue();
                      }}
                      style={styles.quickAction}>
                      <View style={styles.quickActionIcon}>
                        <NexusIcon ios="text.line.first.and.arrowtriangle.forward" android="queue_music" size={19} color="#C2C8CD" />
                      </View>
                      <NexusText variant="caption">Open queue</NexusText>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.playlistPicker}>
                    <View style={styles.playlistPickerHeader}>
                      <Pressable onPress={() => setPlaylistMode(false)} style={styles.quickClose}>
                        <NexusIcon ios="chevron.left" android="arrow_back" size={18} color="#8D959C" />
                      </Pressable>
                      <View style={{ flex: 1 }}>
                        <NexusText variant="caption">Add to playlist</NexusText>
                        <NexusText variant="micro" muted>LOCAL COLLECTIONS</NexusText>
                      </View>
                    </View>
                    {collections.playlists.length ? (
                      collections.playlists.slice(0, 6).map((playlist) => {
                        const selected = playlist.trackIds.includes(player.track.id);
                        return (
                          <Pressable
                            key={playlist.id}
                            onPress={() => {
                              collections.toggleTrack(playlist.id, player.track.id);
                              nexusHaptics.lift();
                            }}
                            style={styles.playlistChoice}>
                            <View style={[styles.playlistMark, { backgroundColor: selected ? player.theme.accent + '28' : 'rgba(255,255,255,0.045)' }]}>
                              <NexusIcon
                                ios={selected ? 'checkmark' : 'music.note.list'}
                                android={selected ? 'check' : 'queue_music'}
                                size={16}
                                color={selected ? player.theme.accent : '#929AA1'}
                              />
                            </View>
                            <View style={{ flex: 1, gap: 2 }}>
                              <NexusText variant="caption" numberOfLines={1}>{playlist.name}</NexusText>
                              <NexusText variant="micro" muted>{playlist.trackIds.length} TRACKS</NexusText>
                            </View>
                          </Pressable>
                        );
                      })
                    ) : (
                      <View style={styles.noPlaylists}>
                        <NexusText variant="caption">No playlists yet</NexusText>
                        <NexusText variant="micro" muted>Create one from Library → Playlists.</NexusText>
                      </View>
                    )}
                  </View>
                )}
              </NexusSurface>
            </Animated.View>
          </Animated.View>
        ) : null}
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
    minHeight: 0,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
  },
  metaRowCompact: {
    marginTop: 6,
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
  waveBlockCompact: { marginTop: 10 },
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
  controlFieldCompact: {
    marginTop: 10,
  },
  bottomModes: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomModesCompact: {
    marginTop: 12,
  },
  modeLink: { width: 92, gap: 2 },
  modeRight: { alignItems: 'flex-end' },
  orbMode: { alignItems: 'center', gap: 5, marginTop: -5 },
  transitionVeil: {
    ...StyleSheet.absoluteFill,
    zIndex: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(5,8,10,0.12)',
  },
  transitionGlow: {
    position: 'absolute',
    width: '72%',
    height: 110,
    borderRadius: 999,
    opacity: 0.12,
    transform: [{ scaleX: 1.35 }],
  },
  transitionLabel: { letterSpacing: 2.2, opacity: 0.72 },
  quickOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 90,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.38)',
  },
  quickSheet: { paddingHorizontal: 10, paddingBottom: 10 },
  quickSurface: {
    borderRadius: 32,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  quickHandle: {
    alignSelf: 'center',
    width: 34,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 14,
  },
  quickHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 14 },
  quickClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  quickActions: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.07)' },
  quickAction: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.055)',
  },
  quickActionIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  playlistPicker: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.07)' },
  playlistPickerHeader: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10 },
  playlistChoice: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  playlistMark: { width: 34, height: 34, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  noPlaylists: { minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: 4 },
});
