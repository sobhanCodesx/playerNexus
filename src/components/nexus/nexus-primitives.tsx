import { PropsWithChildren, ReactNode, useEffect, useMemo } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  TextStyle,
  Vibration,
  View,
  ViewStyle,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
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

import { gradientBackground, nexusTokens, type NexusPalette } from '@/design/nexus-tokens';

export function NexusText({
  variant = 'body',
  muted,
  style,
  ...props
}: TextProps & { variant?: keyof typeof nexusTokens.type; muted?: boolean }) {
  return (
    <Text
      {...props}
      allowFontScaling
      maxFontSizeMultiplier={1.35}
      style={[
        { color: muted ? nexusTokens.colors.muted : nexusTokens.colors.white },
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
  const alpha = intensity === 'soft' ? 0.045 : intensity === 'strong' ? 0.11 : 0.075;
  return (
    <View
      style={[
        styles.surface,
        { backgroundColor: 'rgba(255,255,255,' + alpha + ')' },
        style,
      ]}>
      <View pointerEvents="none" style={styles.surfaceHighlight} />
      {children}
    </View>
  );
}

export function NexusIcon({
  ios,
  android,
  size = 22,
  color = nexusTokens.colors.white,
}: {
  ios: string;
  android: string;
  size?: number;
  color?: string;
}) {
  return (
    <SymbolView
      name={{ ios, android, web: android } as any}
      tintColor={color}
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
          Vibration.vibrate(primary ? 10 : 5);
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
  size,
  radius = nexusTokens.radius.artwork,
  active = false,
  children,
  style,
}: PropsWithChildren<{
  palette: NexusPalette;
  size: number;
  radius?: number;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}>) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = active
      ? withRepeat(withSequence(withTiming(1, { duration: 1800 }), withTiming(0, { duration: 2200 })), -1, false)
      : withTiming(0, { duration: 500 });
  }, [active, pulse]);

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
        {children}
      </View>
    </Animated.View>
  );
}

export function NexusAura({
  palette,
  active,
  size = 420,
  style,
}: {
  palette: NexusPalette;
  active: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = withRepeat(
      withTiming(1, {
        duration: active ? nexusTokens.motion.ambientFast : nexusTokens.motion.ambientSlow,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true,
    );
  }, [active, phase]);

  const a = useAnimatedStyle(() => ({
    opacity: active ? interpolate(phase.value, [0, 1], [0.32, 0.48]) : 0.18,
    transform: [
      { translateX: interpolate(phase.value, [0, 1], [-22, 18]) },
      { translateY: interpolate(phase.value, [0, 1], [16, -18]) },
      { scale: interpolate(phase.value, [0, 1], [0.9, 1.08]) },
    ],
  }));
  const b = useAnimatedStyle(() => ({
    opacity: active ? interpolate(phase.value, [0, 1], [0.18, 0.3]) : 0.1,
    transform: [
      { translateX: interpolate(phase.value, [0, 1], [26, -20]) },
      { scale: interpolate(phase.value, [0, 1], [1.08, 0.9]) },
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
      <Animated.View
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
      />
      <View
        style={[
          styles.aura,
          {
            width: size * 0.42,
            height: size * 0.42,
            borderRadius: size,
            backgroundColor: palette[2],
            left: size * 0.1,
            bottom: size * 0.04,
            opacity: 0.18,
          },
        ]}
      />
    </View>
  );
}

export function NexusOrb({
  palette,
  active,
  size = 82,
}: {
  palette: NexusPalette;
  active: boolean;
  size?: number;
}) {
  const beat = useSharedValue(0);
  useEffect(() => {
    beat.value = withRepeat(
      withSequence(
        withTiming(1, { duration: active ? 520 : 1600, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: active ? 760 : 2200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [active, beat]);
  const style = useAnimatedStyle(() => ({
    transform: [
      { scaleX: interpolate(beat.value, [0, 1], [0.94, active ? 1.08 : 1]) },
      { scaleY: interpolate(beat.value, [0, 1], [1.04, active ? 0.93 : 1]) },
      { rotate: interpolate(beat.value, [0, 1], [-4, 7]) + 'deg' },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.orbOuter,
        { width: size, height: size, borderRadius: size / 2 },
        gradientBackground([palette[0] + 'CC', palette[1] + '99', palette[2] + 'DD'], 150),
        style,
      ]}>
      <View style={styles.orbInner}>
        <View style={[styles.orbLight, { backgroundColor: palette[0] }]} />
      </View>
    </Animated.View>
  );
}

const wave = [7, 14, 10, 22, 17, 29, 15, 9, 24, 33, 18, 11, 26, 37, 20, 15, 30, 18, 12, 28, 34, 17, 23, 9, 16, 30, 24, 13, 21, 35, 18, 12, 27, 20, 10, 24, 32, 15, 21, 11, 18, 28, 14, 22, 10, 17, 25, 13];

export function NexusWaveform({
  progress,
  onSeek,
  accent,
}: {
  progress: number;
  onSeek: (value: number) => void;
  accent: string;
}) {
  const width = useSharedValue(1);
  const played = Math.round(progress * wave.length);
  const onLayout = (event: LayoutChangeEvent) => {
    width.value = event.nativeEvent.layout.width;
  };
  return (
    <Pressable
      accessibilityRole="adjustable"
      accessibilityLabel="Track position"
      onLayout={onLayout}
      onPress={(event) => {
        const next = event.nativeEvent.locationX / Math.max(1, width.value);
        onSeek(next);
        Vibration.vibrate(3);
      }}
      style={styles.waveform}>
      {wave.map((height, index) => (
        <View
          key={index}
          style={[
            styles.waveBar,
            {
              height,
              backgroundColor: index <= played ? accent : 'rgba(255,255,255,0.18)',
              opacity: index <= played ? 0.95 : 0.7,
            },
          ]}
        />
      ))}
    </Pressable>
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
    borderColor: 'rgba(255,255,255,0.12)',
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
    ...StyleSheet.absoluteFillObject,
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
  aura: {
    position: 'absolute',
    opacity: 0.28,
    elevation: 0,
  },
  orbOuter: {
    padding: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
    elevation: 12,
  },
  orbInner: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 999,
    backgroundColor: 'rgba(5,8,10,0.32)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  orbLight: {
    position: 'absolute',
    width: '55%',
    height: '55%',
    borderRadius: 999,
    top: '4%',
    left: '8%',
    opacity: 0.55,
  },
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
