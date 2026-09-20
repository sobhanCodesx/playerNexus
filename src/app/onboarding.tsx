import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NexusOrb, NexusSurface, NexusText } from '@/components/nexus/nexus-primitives';
import { gradientBackground, nexusTokens } from '@/design/nexus-tokens';
import { usePlayer } from '@/providers/player-provider';
import {
  useNexusSettings,
  type NexusThemeMode,
} from '@/providers/settings-provider';
import { nexusHaptics } from '@/services/haptics';

const themes: Array<{ id: NexusThemeMode; label: string; note: string; colors: [string,string,string] }> = [
  { id: 'dynamic', label: 'Nexus Dynamic', note: 'Artwork becomes atmosphere', colors: ['#B38671','#556672','#0A0D10'] },
  { id: 'amoled', label: 'Pure AMOLED', note: 'Light suspended in true black', colors: ['#000000','#161A1F','#D8DDE0'] },
  { id: 'obsidian', label: 'Obsidian', note: 'Neutral cinematic depth', colors: ['#0A0C0F','#242A2F','#8D969C'] },
  { id: 'light', label: 'Minimal Light', note: 'Quiet mineral glass', colors: ['#F1EEE8','#D8D5CF','#767C80'] },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const player = usePlayer();
  const { completeOnboarding, effectiveReduceMotion } = useNexusSettings();
  const [step, setStep] = useState(0);
  const [theme, setTheme] = useState<NexusThemeMode>('dynamic');
  const [requesting, setRequesting] = useState(false);
  const phase = useSharedValue(0);

  useEffect(() => {
    phase.value = withTiming(step, { duration: effectiveReduceMotion ? 0 : 420 });
  }, [effectiveReduceMotion, phase, step]);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(phase.value, [0, 1, 2], [0, -18, -30]) },
      { scale: interpolate(phase.value, [0, 1, 2], [1, 0.84, 0.68]) },
    ],
    opacity: interpolate(phase.value, [0, 1.7, 2], [1, 0.92, 0.72]),
  }));

  const next = () => {
    nexusHaptics.settle();
    setStep((current) => Math.min(2, current + 1));
  };

  const requestLibrary = async () => {
    setRequesting(true);
    await player.scanLibrary(true);
    setRequesting(false);
    next();
  };

  const finish = () => {
    nexusHaptics.play();
    completeOnboarding(theme);
    router.replace('/');
  };

  return (
    <View
      style={[
        styles.root,
        gradientBackground(['#07090B', '#10151A', '#07090B'], 165),
        { paddingTop: insets.top + 18, paddingBottom: Math.max(22, insets.bottom + 14) },
      ]}>
      <View style={styles.top}>
        <NexusText variant="micro" muted style={styles.brand}>NEXUS PLAYER</NexusText>
        <View style={styles.progress}>
          {[0,1,2].map((index) => (
            <View key={index} style={[styles.progressDot, index <= step && styles.progressDotActive]} />
          ))}
        </View>
      </View>

      <Animated.View style={[styles.orbStage, orbStyle]}>
        <View style={styles.orbHalo} />
        <NexusOrb
          palette={['#C18F72','#6D7F8B','#27343E','#0A0D10']}
          active
          size={Math.min(210, width * 0.5)}
        />
      </Animated.View>

      <View style={styles.content}>
        {step === 0 ? (
          <Animated.View
            entering={effectiveReduceMotion ? undefined : FadeIn.duration(420)}
            exiting={effectiveReduceMotion ? undefined : FadeOut.duration(180)}
            style={styles.copyBlock}>
            <NexusText variant="micro" muted style={styles.eyebrow}>MUSIC SHOULD BECOME THE INTERFACE</NexusText>
            <NexusText variant="display" style={styles.headline}>Not a player. A space around sound.</NexusText>
            <NexusText muted style={styles.body}>
              Nexus lets artwork, motion and audio energy reshape the environment while the music stays local to your device.
            </NexusText>
          </Animated.View>
        ) : null}

        {step === 1 ? (
          <Animated.View
            entering={effectiveReduceMotion ? undefined : FadeIn.duration(420)}
            exiting={effectiveReduceMotion ? undefined : FadeOut.duration(180)}
            style={styles.copyBlock}>
            <NexusText variant="micro" muted style={styles.eyebrow}>YOUR LIBRARY · YOUR DEVICE</NexusText>
            <NexusText variant="display" style={styles.headline}>Bring your music into the room.</NexusText>
            <NexusText muted style={styles.body}>
              Nexus only asks for audio access to index local tracks, artwork and metadata. No account. No cloud library.
            </NexusText>
            <NexusSurface style={styles.permissionCard} intensity="strong">
              <View style={styles.permissionPulse} />
              <View style={{ flex: 1, gap: 3 }}>
                <NexusText variant="caption">
                  {player.libraryStatus === 'ready'
                    ? player.libraryTracks.length + ' tracks discovered'
                    : player.libraryStatus === 'scanning'
                      ? 'Reading your music library'
                      : 'Android music library'}
                </NexusText>
                <NexusText variant="micro" muted>
                  {player.libraryStatus === 'ready' ? 'INDEX READY' : 'LOCAL ACCESS ONLY'}
                </NexusText>
              </View>
            </NexusSurface>
          </Animated.View>
        ) : null}

        {step === 2 ? (
          <Animated.View
            entering={effectiveReduceMotion ? undefined : FadeIn.duration(420)}
            style={styles.copyBlock}>
            <NexusText variant="micro" muted style={styles.eyebrow}>CHOOSE THE FIRST MATERIAL</NexusText>
            <NexusText variant="display" style={styles.headline}>How should Nexus wake up?</NexusText>
            <View style={styles.themeGrid}>
              {themes.map((item) => {
                const selected = theme === item.id;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="radio"
                    accessibilityLabel={item.label}
                    accessibilityHint={item.note}
                    accessibilityState={{ selected }}
                    onPress={() => {
                      nexusHaptics.transport();
                      setTheme(item.id);
                    }}
                    style={[styles.themeCard, selected && styles.themeCardSelected]}>
                    <View style={[styles.themePreview, gradientBackground(item.colors, 145)]}>
                      <View style={styles.themeGlass} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <NexusText variant="caption">{item.label}</NexusText>
                      <NexusText variant="micro" muted>{item.note.toUpperCase()}</NexusText>
                    </View>
                    <View style={[styles.radio, selected && styles.radioSelected]}>
                      {selected ? <View style={styles.radioCore} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.bottom}>
        {step === 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Enter Nexus" onPress={next} style={styles.primary}>
            <NexusText variant="caption" style={styles.primaryText}>Enter Nexus</NexusText>
          </Pressable>
        ) : null}

        {step === 1 ? (
          <View style={styles.actionStack}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={player.libraryStatus === 'ready' ? 'Continue' : 'Allow music access'}
              disabled={requesting}
              onPress={requestLibrary}
              style={styles.primary}>
              <NexusText variant="caption" style={styles.primaryText}>
                {requesting ? 'Scanning…' : player.libraryStatus === 'ready' ? 'Continue' : 'Allow music access'}
              </NexusText>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Not now, use preview library" onPress={next} style={styles.secondary}>
              <NexusText variant="caption" muted>Not now — use the preview library</NexusText>
            </Pressable>
          </View>
        ) : null}

        {step === 2 ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Start listening" onPress={finish} style={styles.primary}>
            <NexusText variant="caption" style={styles.primaryText}>Start listening</NexusText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 22, backgroundColor: nexusTokens.colors.obsidian },
  top: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { letterSpacing: 1.8 },
  progress: { flexDirection: 'row', gap: 6 },
  progressDot: { width: 17, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)' },
  progressDotActive: { backgroundColor: 'rgba(255,255,255,0.72)' },
  orbStage: { height: 260, alignItems: 'center', justifyContent: 'center' },
  orbHalo: {
    position: 'absolute',
    width: 220,
    height: 130,
    borderRadius: 999,
    backgroundColor: 'rgba(161,122,101,0.12)',
    transform: [{ scaleX: 1.28 }],
  },
  content: { flex: 1 },
  copyBlock: { flex: 1, justifyContent: 'flex-start', gap: 10 },
  eyebrow: { letterSpacing: 1.15 },
  headline: { maxWidth: 350, fontSize: 36, lineHeight: 41 },
  body: { maxWidth: 330, fontSize: 15, lineHeight: 22 },
  permissionCard: {
    minHeight: 76,
    borderRadius: 26,
    marginTop: 18,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  permissionPulse: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  themeGrid: { marginTop: 8, gap: 8 },
  themeCard: {
    minHeight: 66,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  themeCardSelected: {
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.075)',
  },
  themePreview: { width: 48, height: 48, borderRadius: 17, overflow: 'hidden' },
  themeGlass: {
    position: 'absolute',
    width: 28,
    height: 12,
    borderRadius: 12,
    right: 5,
    top: 7,
    backgroundColor: 'rgba(255,255,255,0.22)',
    transform: [{ rotate: '-12deg' }],
  },
  radio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: 'rgba(255,255,255,0.72)' },
  radioCore: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#F4F6F7' },
  bottom: { minHeight: 78, justifyContent: 'flex-end' },
  actionStack: { gap: 8 },
  primary: {
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F3F5F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#101418' },
  secondary: { height: 40, alignItems: 'center', justifyContent: 'center' },
});
