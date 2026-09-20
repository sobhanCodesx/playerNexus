import { PropsWithChildren, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import {
  BlurMask,
  Canvas,
  Circle,
  Path,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import type { AudioBands } from '@/audio/audio-analysis';
import { silentBands } from '@/audio/audio-analysis';
import { gradientBackground, nexusTokens, type NexusPalette } from '@/design/nexus-tokens';
import { getNexusQualityProfile } from '@/design/quality-profile';
import { useNexusSettings } from '@/providers/settings-provider';
import { nexusHaptics } from '@/services/haptics';

export function NexusText({
  variant = 'body',
  muted,
  style,
  ...props
}: TextProps & { variant?: keyof typeof nexusTokens.type; muted?: boolean }) {
  const { settings } = useNexusSettings();
  const light = settings.themeMode === 'light';
  return (
    <Text
      {...props}
      allowFontScaling
      maxFontSizeMultiplier={1.35}
      style={[
        { color: muted ? (light ? '#6D7378' : nexusTokens.colors.muted) : (light ? '#15191D' : nexusTokens.colors.white) },
        nexusTokens.type[variant] as TextStyle,
        style,
      ]}
    />
  );
}

export function NexusSurface({
  children,
  style,
  intensity = 'medium',
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; intensity?: 'soft' | 'medium' | 'strong' }>) {
  const { settings } = useNexusSettings();
  const light = settings.themeMode === 'light';
  const quality = getNexusQualityProfile(settings.visualQuality);
  const alpha = intensity === 'soft' ? 0.045 : intensity === 'strong' ? 0.11 : 0.075;
  const baseBlur = intensity === 'soft' ? 10 : intensity === 'strong' ? 24 : 16;
  const blur = Math.round(baseBlur * (quality.visualizerBlurScale < 0.7 ? 0.72 : 1));
  return (
    <View
      style={[
        styles.surface,
        {
          backgroundColor: light
            ? 'rgba(255,255,255,' + (0.5 + alpha) + ')'
            : 'rgba(12,16,20,' + (0.48 + alpha) + ')',
          borderColor: light ? 'rgba(20,24,28,0.08)' : 'rgba(255,255,255,0.11)',
        },
        style,
      ]}>
      <BlurView pointerEvents="none" intensity={blur} tint={light ? 'light' : 'dark'} style={StyleSheet.absoluteFill} />
      <View
        pointerEvents="none"
        style={[
          styles.surfaceHighlight,
          { backgroundColor: light ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.34)' },
        ]}
      />
      {children}
    </View>
  );
}

export function NexusIcon({
  ios,
  android,
  size = 22,
  color,
}: {
  ios: string;
  android: string;
  size?: number;
  color?: string;
}) {
  const { settings } = useNexusSettings();
  const resolvedColor = color ?? (settings.themeMode === 'light' ? '#171B1F' : nexusTokens.colors.white);
  return (
    <SymbolView
      name={{ ios, android, web: android } as any}
      tintColor={resolvedColor}
      size={size}
      style={{ width: size, height: size }}
    />
  );
}

export function NexusIconButton({
  ios,
  android,
  onPress,
  size = 48,
  primary = false,
  accessibilityLabel,
}: {
  ios: string;
  android: string;
  onPress?: () => void;
  size?: number;
  primary?: boolean;
  accessibilityLabel: string;
}) {
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pressed.value, [0, 1], [1, 0.91]) }],
  }));
  return (
    <Animated.View style={animated}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPressIn={() => {
          pressed.value = withSpring(1, { damping: 18, stiffness: 260 });
        }}
        onPressOut={() => {
          pressed.value = withSpring(0, { damping: 16, stiffness: 220 });
        }}
        onPress={() => {
          if (primary) nexusHaptics.play();
          else nexusHaptics.transport();
          onPress?.();
        }}
        style={[
          styles.iconButton,
          { width: size, height: size, borderRadius: size / 2 },
          primary && styles.iconButtonPrimary,
        ]}>
        <NexusIcon
          ios={ios}
          android={android}
          size={primary ? Math.round(size * 0.43) : Math.round(size * 0.38)}
          color={primary ? '#101418' : nexusTokens.colors.white}
        />
      </Pressable>
    </Animated.View>
  );
}

export function NexusArtwork({
  palette,
  artworkUri,
  size,
  radius = nexusTokens.radius.artwork,
  active = false,
  children,
  style,
}: PropsWithChildren<{
  palette: NexusPalette;
  artworkUri?: string | null;
  size: number;
  radius?: number;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}>) {
  const { settings } = useNexusSettings();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (settings.reduceMotion) {
      pulse.value = withTiming(0, { duration: 180 });
      return;
    }
    pulse.value = active
      ? withRepeat(withSequence(withTiming(1, { duration: 1800 }), withTiming(0, { duration: 2200 })), -1, false)
      : withTiming(0, { duration: 500 });
  }, [active, pulse, settings.reduceMotion]);

  const animated = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { scale: interpolate(pulse.value, [0, 1], [1, 1.012]) },
      { rotateX: interpolate(pulse.value, [0, 1], [0, -0.7]) + 'deg' },
      { rotateY: interpolate(pulse.value, [0, 1], [0, 0.9]) + 'deg' },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.artworkShadow,
        { width: size, height: size, borderRadius: radius },
        animated,
        style,
      ]}>
      <View
        style={[
          styles.artwork,
          { borderRadius: radius },
          gradientBackground([palette[0], palette[1], palette[2], palette[3] ?? '#080A0C'], 138),
        ]}>
        <View style={styles.artworkVignette} />
        <View style={[styles.artworkOrb, { backgroundColor: palette[0] }]} />
        <View style={[styles.artworkOrbSmall, { backgroundColor: palette[1] }]} />
        <View style={styles.artworkCut} />
        {artworkUri ? (
          <Image
            source={{ uri: artworkUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={240}
            cachePolicy="memory-disk"
          />
        ) : null}
        <View pointerEvents="none" style={styles.artworkGlass} />
        {children}
      </View>
    </Animated.View>
  );
}

export function NexusAura({
  palette,
  active,
  bands = silentBands,
  size = 420,
  style,
}: {
  palette: NexusPalette;
  active: boolean;
  bands?: AudioBands;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { settings } = useNexusSettings();
  const quality = getNexusQualityProfile(settings.visualQuality);
  const phase = useSharedValue(0);
  const bass = useSharedValue(bands.bass);
  const mid = useSharedValue(bands.mid);
  useEffect(() => {
    if (settings.reduceMotion) {
      phase.value = withTiming(0.5, { duration: 180 });
      return;
    }
    phase.value = withRepeat(
      withTiming(1, {
        duration: active ? nexusTokens.motion.ambientFast : nexusTokens.motion.ambientSlow,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [active, phase, settings.reduceMotion]);
  useEffect(() => {
    bass.value = withTiming(bands.bass, { duration: 90 });
    mid.value = withTiming(bands.mid, { duration: 130 });
  }, [bands.bass, bands.mid, bass, mid]);

  const a = useAnimatedStyle(() => ({
    opacity: active
      ? (interpolate(phase.value, [0, 1], [0.28, 0.42]) + bass.value * 0.14) * quality.auraEnergy
      : 0.17 * quality.auraEnergy,
    transform: [
      { translateX: interpolate(phase.value, [0, 1], [-22, 18]) },
      { translateY: interpolate(phase.value, [0, 1], [16, -18]) },
      { scale: interpolate(phase.value, [0, 1], [0.9, 1.06]) + bass.value * 0.09 * quality.auraEnergy },
    ],
  }));
  const b = useAnimatedStyle(() => ({
    opacity: active
      ? (interpolate(phase.value, [0, 1], [0.16, 0.26]) + mid.value * 0.12) * quality.auraEnergy
      : 0.09 * quality.auraEnergy,
    transform: [
      { translateX: interpolate(phase.value, [0, 1], [26, -20]) },
      { scale: interpolate(phase.value, [0, 1], [1.06, 0.91]) + mid.value * 0.06 },
    ],
  }));

  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, style]}>
      <Animated.View
        style={[
          styles.aura,
          a,
          { width: size * 0.76, height: size * 0.76, borderRadius: size, backgroundColor: palette[0] },
        ]}
      />
      {quality.auraLayers >= 2 ? <Animated.View
        style={[
          styles.aura,
          b,
          {
            width: size * 0.58,
            height: size * 0.58,
            borderRadius: size,
            backgroundColor: palette[1],
            right: 0,
            bottom: 0,
          },
        ]}
      /> : null}
      {quality.auraLayers >= 3 ? <View
        style={[
          styles.aura,
          {
            width: size * 0.42,
            height: size * 0.42,
            borderRadius: size,
            backgroundColor: palette[2],
            left: size * 0.1,
            bottom: size * 0.04,
            opacity: 0.16 + bands.high * 0.12,
          },
        ]}
      /> : null}
    </View>
  );
}

function organicPath(size: number, bands: AudioBands) {
  const count = 14;
  const center = size / 2;
  const base = size * 0.31;
  const points = Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const midWave = Math.sin(index * 1.83 + bands.mid * 2.6);
    const highWave = Math.sin(index * 4.1 + bands.high * 3.8);
    const radius =
      base *
      (1 +
        bands.bass * 0.16 +
        midWave * (0.035 + bands.mid * 0.055) +
        highWave * bands.high * 0.022);
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    };
  });

  const midpoint = (a: typeof points[number], b: typeof points[number]) => ({
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  });

  const start = midpoint(points[count - 1], points[0]);
  let path = 'M ' + start.x.toFixed(2) + ' ' + start.y.toFixed(2);
  for (let index = 0; index < count; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % count];
    const mid = midpoint(current, next);
    path += ' Q ' + current.x.toFixed(2) + ' ' + current.y.toFixed(2) + ' ' + mid.x.toFixed(2) + ' ' + mid.y.toFixed(2);
  }
  return path + ' Z';
}

export function NexusOrb({
  palette,
  active,
  bands = silentBands,
  size = 82,
}: {
  palette: NexusPalette;
  active: boolean;
  bands?: AudioBands;
  size?: number;
}) {
  const { settings } = useNexusSettings();
  const quality = getNexusQualityProfile(settings.visualQuality);
  const idle = useSharedValue(0);
  useEffect(() => {
    if (settings.reduceMotion) {
      idle.value = withTiming(0.5, { duration: 180 });
      return;
    }
    idle.value = withRepeat(
      withSequence(
        withTiming(1, { duration: active ? 1700 : 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: active ? 1900 : 3400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [active, idle, settings.reduceMotion]);

  const path = useMemo(() => organicPath(size, bands), [size, bands]);
  const animated = useAnimatedStyle(() => ({
    transform: [
      { rotate: interpolate(idle.value, [0, 1], [-2.5, 3.5]) + 'deg' },
      { scale: 1 + bands.bass * 0.035 + bands.transient * 0.025 },
    ],
  }));

  return (
    <Animated.View style={[{ width: size, height: size }, animated]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Path path={path} color={palette[0] + '52'}>
          <BlurMask blur={(8 + bands.bass * 8) * quality.orbBlurScale} style="normal" />
        </Path>
        <Path path={path}>
          <RadialGradient
            c={vec(size * 0.36, size * 0.29)}
            r={size * 0.66}
            colors={[
              palette[0] + 'F0',
              palette[1] + 'C8',
              palette[2] + 'B8',
              '#090D12F2',
            ]}
          />
        </Path>
        <Path
          path={path}
          style="stroke"
          strokeWidth={1 + bands.high * 0.7}
          color={'rgba(255,255,255,' + (0.28 + bands.high * 0.22) + ')'}
        />
        <Circle c={vec(size * 0.37, size * 0.31)} r={size * (0.11 + bands.high * 0.018)}>
          <RadialGradient
            c={vec(size * 0.35, size * 0.29)}
            r={size * 0.16}
            colors={['rgba(255,255,255,0.58)', 'rgba(255,255,255,0)']}
          />
        </Circle>
        {quality.orbParticles > 0 && bands.high > 0.08 ? (
          <>
            <Circle c={vec(size * 0.72, size * 0.33)} r={1.1 + bands.high * 1.8} color={palette[0] + 'C0'} />
            <Circle c={vec(size * 0.27, size * 0.69)} r={0.8 + bands.high * 1.4} color={palette[1] + 'A8'} />
            {quality.orbParticles >= 3 ? (
              <Circle c={vec(size * 0.68, size * 0.73)} r={0.7 + bands.transient * 2.0} color="rgba(255,255,255,0.48)" />
            ) : null}
          </>
        ) : null}
      </Canvas>
    </Animated.View>
  );
}

const fallbackWave = [0.18,0.38,0.27,0.58,0.46,0.72,0.36,0.22,0.61,0.82,0.48,0.3,0.66,0.9,0.52,0.37,0.74,0.45,0.29,0.7,0.84,0.43,0.59,0.2,0.4,0.75,0.6,0.31,0.52,0.86,0.45,0.28,0.68,0.5,0.24,0.61,0.8,0.36,0.55,0.26,0.45,0.7,0.32,0.57,0.23,0.41,0.64,0.3,0.51,0.78,0.42,0.25];

const formatSeekTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const value = Math.floor(seconds);
  return Math.floor(value / 60) + ':' + String(value % 60).padStart(2, '0');
};

export function NexusWaveform({
  progress,
  onSeek,
  accent,
  samples,
  duration = 0,
}: {
  progress: number;
  onSeek: (value: number) => void;
  accent: string;
  samples?: number[];
  duration?: number;
}) {
  const width = useRef(1);
  const lastTick = useRef(-1);
  const [scrubbing, setScrubbing] = useState(false);
  const [preview, setPreview] = useState(progress);
  const expand = useSharedValue(0);

  useEffect(() => {
    if (!scrubbing) setPreview(progress);
  }, [progress, scrubbing]);

  const data = samples?.length ? samples : fallbackWave;
  const displayed = scrubbing ? preview : progress;
  const played = Math.round(displayed * Math.max(0, data.length - 1));

  const updatePreview = (locationX: number, commit = false) => {
    const normalized = Math.max(0, Math.min(1, locationX / Math.max(1, width.current)));
    setPreview(normalized);
    const tick = Math.round(normalized * 20);
    if (tick !== lastTick.current) {
      lastTick.current = tick;
      nexusHaptics.seek();
    }
    if (commit) onSeek(normalized);
  };

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_event, gesture) =>
          Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) < 10,
        onPanResponderGrant: (event) => {
          setScrubbing(true);
          expand.value = withSpring(1, { damping: 18, stiffness: 240 });
          updatePreview(event.nativeEvent.locationX);
        },
        onPanResponderMove: (event) => {
          updatePreview(event.nativeEvent.locationX);
        },
        onPanResponderRelease: (event) => {
          updatePreview(event.nativeEvent.locationX, true);
          setScrubbing(false);
          expand.value = withSpring(0, { damping: 20, stiffness: 220 });
        },
        onPanResponderTerminate: () => {
          setScrubbing(false);
          expand.value = withSpring(0, { damping: 20, stiffness: 220 });
        },
      }),
    [onSeek],
  );

  const waveformStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: interpolate(expand.value, [0, 1], [1, 1.2]) }],
  }));

  const onLayout = (event: LayoutChangeEvent) => {
    width.current = event.nativeEvent.layout.width;
  };

  return (
    <View style={styles.waveformShell} onLayout={onLayout} {...responder.panHandlers}>
      {scrubbing ? (
        <View
          pointerEvents="none"
          style={[
            styles.seekBubble,
            { left: Math.max(0, Math.min(width.current - 52, preview * width.current - 26)) },
          ]}>
          <NexusText variant="micro" style={styles.seekBubbleText}>
            {formatSeekTime(preview * duration)}
          </NexusText>
        </View>
      ) : null}
      <Animated.View style={[styles.waveform, waveformStyle]}>
        {data.map((value, index) => (
          <View
            key={index}
            style={[
              styles.waveBar,
              {
                height: 7 + Math.max(0.05, Math.min(1, value)) * 31,
                backgroundColor: index <= played ? accent : 'rgba(255,255,255,0.18)',
                opacity: index <= played ? 0.95 : 0.68,
              },
            ]}
          />
        ))}
      </Animated.View>
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <NexusText variant="heading">{title}</NexusText>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.11)',
    elevation: 10,
  },
  surfaceHighlight: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  iconButtonPrimary: {
    backgroundColor: '#F5F7F8',
    elevation: 12,
  },
  artworkShadow: {
    elevation: 26,
    shadowColor: '#000',
    shadowOpacity: 0.48,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
  },
  artwork: {
    flex: 1,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  artworkVignette: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  artworkOrb: {
    position: 'absolute',
    width: '58%',
    height: '58%',
    borderRadius: 999,
    top: '9%',
    right: '-7%',
    opacity: 0.52,
    transform: [{ rotate: '22deg' }],
  },
  artworkOrbSmall: {
    position: 'absolute',
    width: '32%',
    height: '50%',
    borderRadius: 999,
    left: '10%',
    bottom: '-9%',
    opacity: 0.38,
    transform: [{ rotate: '-28deg' }],
  },
  artworkCut: {
    position: 'absolute',
    width: '74%',
    height: '26%',
    backgroundColor: 'rgba(5,8,10,0.24)',
    left: '-12%',
    top: '42%',
    transform: [{ rotate: '-14deg' }],
  },
  artworkGlass: {
    ...StyleSheet.absoluteFill,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.13)',
    backgroundColor: 'rgba(255,255,255,0.018)',
  },
  aura: {
    position: 'absolute',
    opacity: 0.28,
    elevation: 0,
  },
  waveformShell: {
    height: 58,
    justifyContent: 'flex-end',
  },
  seekBubble: {
    position: 'absolute',
    top: -22,
    width: 52,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245,247,248,0.94)',
    elevation: 8,
  },
  seekBubbleText: { color: '#101418' },
  waveform: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 2,
  },
  waveBar: {
    width: 2.5,
    borderRadius: 2,
  },
  sectionHeader: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
