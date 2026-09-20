import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';

import { usePlayer } from '@/providers/player-provider';
import {
  useNexusSettings,
  type NexusThemeMode,
  type NexusVisualQuality,
} from '@/providers/settings-provider';
import { NexusIcon, NexusIconButton, NexusSurface, NexusText } from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';

type SettingRowProps = {
  title: string;
  subtitle?: string;
  value?: boolean;
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  icon: { ios: string; android: string };
};

function SettingRow({ title, subtitle, value, onValueChange, disabled, icon }: SettingRowProps) {
  const theme = usePlayer().theme;
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <NexusIcon ios={icon.ios} android={icon.android} size={18} color="#B9C0C6" />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <NexusText>{title}</NexusText>
        {subtitle ? <NexusText variant="caption" muted>{subtitle}</NexusText> : null}
      </View>
      {typeof value === 'boolean' ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          accessibilityLabel={title}
          accessibilityHint={subtitle}
          thumbColor={value ? '#F5F6F7' : '#B0B4B8'}
          trackColor={{ false: '#343A40', true: theme.primaryAmbient }}
        />
      ) : (
        <NexusIcon ios="chevron.right" android="chevron_right" size={18} color="#6F777E" />
      )}
    </View>
  );
}

const themeOptions: Array<{ id: NexusThemeMode; label: string }> = [
  { id: 'dynamic', label: 'Dynamic' },
  { id: 'amoled', label: 'AMOLED' },
  { id: 'obsidian', label: 'Obsidian' },
  { id: 'light', label: 'Light' },
];

const crossfadeOptions = [0, 2, 4, 6] as const;

const qualityOptions: Array<{ id: NexusVisualQuality; label: string }> = [
  { id: 'low', label: 'Low' },
  { id: 'balanced', label: 'Balanced' },
  { id: 'ultra', label: 'Ultra' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const player = usePlayer();
  const {
    effectiveReduceMotion,
    highTextContrastEnabled,
    screenReaderEnabled,
    settings,
    updateSetting,
    resetOnboarding,
  } = useNexusSettings();
  const systemReduceMotion = effectiveReduceMotion && !settings.reduceMotion;

  return (
    <NexusScreen>
      <View style={styles.nav}>
        <NexusIconButton ios="chevron.left" android="arrow_back" accessibilityLabel="Back" onPress={() => router.back()} size={44} />
        <NexusText variant="micro" muted>SETTINGS</NexusText>
        <View style={{ width: 44 }} />
      </View>

      <NexusText variant="display" style={styles.title}>Tune the experience</NexusText>

      <View style={styles.section}>
        <NexusText variant="micro" muted style={styles.label}>MATERIAL</NexusText>
        <View style={styles.segmented}>
          {themeOptions.map((item) => {
            const selected = settings.themeMode === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.label + ' theme'}
                accessibilityState={{ selected }}
                onPress={() => updateSetting('themeMode', item.id)}
                style={[styles.segment, selected && styles.segmentActive]}>
                <NexusText variant="micro" style={{ color: selected ? '#F7F8F9' : '#7F878E' }}>{item.label.toUpperCase()}</NexusText>
              </Pressable>
            );
          })}
        </View>
        <NexusSurface style={styles.group} intensity="soft">
          <SettingRow
            title="Reduce motion"
            subtitle={
              systemReduceMotion
                ? 'Enabled by Android system preference'
                : 'Preserve state changes, remove ambient drift'
            }
            value={effectiveReduceMotion}
            disabled={systemReduceMotion}
            onValueChange={(value) => updateSetting('reduceMotion', value)}
            icon={{ ios: 'figure.walk.motion', android: 'motion_photos_off' }}
          />
          <SettingRow
            title="Depth motion"
            subtitle="Use device orientation for subtle artwork parallax"
            value={settings.depthMotion}
            onValueChange={(value) => updateSetting('depthMotion', value)}
            icon={{ ios: 'gyroscope', android: 'screen_rotation' }}
          />
        </NexusSurface>
      </View>

      <View style={styles.section}>
        <NexusText variant="micro" muted style={styles.label}>AUDIO & FEEDBACK</NexusText>
        <NexusSurface style={styles.group} intensity="soft">
          <SettingRow
            title="Seamless preload"
            subtitle="Pre-buffer the next local track for near-instant transitions"
            value={settings.gapless}
            onValueChange={(value) => updateSetting('gapless', value)}
            icon={{ ios: 'waveform', android: 'graphic_eq' }}
          />
          <SettingRow
            title="Haptics"
            subtitle="Sparse tactile cues for meaningful actions"
            value={settings.haptics}
            onValueChange={(value) => updateSetting('haptics', value)}
            icon={{ ios: 'hand.tap.fill', android: 'vibration' }}
          />
          <SettingRow
            title="Audio-reactive visuals"
            subtitle={player.audioReactiveEnabled ? 'PCM analysis is live' : 'Bass, mids and highs drive the environment'}
            value={player.audioReactiveEnabled}
            onValueChange={(enabled) => {
              if (enabled) player.enableAudioReactive();
            }}
            icon={{ ios: 'waveform.path.ecg', android: 'graphic_eq' }}
          />
          <View style={styles.crossfadeRow}>
            <View style={styles.rowIcon}>
              <NexusIcon ios="arrow.triangle.merge" android="merge" size={18} color="#B9C0C6" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.crossfadeHeader}>
                <NexusText>Crossfade</NexusText>
                <NexusText variant="micro" muted>
                  {settings.crossfadeSeconds ? settings.crossfadeSeconds + ' SEC' : 'OFF'}
                </NexusText>
              </View>
              <View style={styles.crossfadeSegments}>
                {crossfadeOptions.map((seconds) => {
                  const active = settings.crossfadeSeconds === seconds;
                  return (
                    <Pressable
                      key={seconds}
                      accessibilityRole="button"
                      accessibilityLabel={seconds === 0 ? 'Crossfade off' : 'Crossfade ' + seconds + ' seconds'}
                      accessibilityState={{ selected: active }}
                      onPress={() => updateSetting('crossfadeSeconds', seconds)}
                      style={[styles.crossfadeSegment, active && styles.crossfadeSegmentActive]}>
                      <NexusText
                        variant="micro"
                        style={{ color: active ? '#F5F7F8' : '#737B82' }}>
                        {seconds === 0 ? 'OFF' : seconds + 'S'}
                      </NexusText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </NexusSurface>
      </View>

      <View style={styles.section}>
        <NexusText variant="micro" muted style={styles.label}>VISUAL COMPLEXITY</NexusText>
        <View style={styles.quality}>
          {qualityOptions.map((item) => {
            const selected = settings.visualQuality === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.label + ' visual quality'}
                accessibilityState={{ selected }}
                onPress={() => updateSetting('visualQuality', item.id)}
                style={[styles.qualityItem, selected && styles.qualityActive]}>
                <NexusText variant="caption" style={{ color: selected ? '#F7F8F9' : '#7F878E' }}>{item.label}</NexusText>
              </Pressable>
            );
          })}
        </View>
        <NexusText variant="caption" muted style={styles.qualityHint}>
          Low removes secondary light fields. Balanced is the default. Ultra increases contour density, bloom and audio sampling cadence.
        </NexusText>
      </View>

      <View style={styles.section}>
        <NexusText variant="micro" muted style={styles.label}>LIBRARY</NexusText>
        <NexusSurface style={styles.group} intensity="soft">
          <SettingRow title="Scan folders" subtitle="Folder scoping arrives with the library indexing pass" icon={{ ios: 'folder.fill', android: 'folder' }} />
          <Pressable onPress={() => player.scanLibrary(true)}>
            <SettingRow title="Rescan library" subtitle="Refresh local metadata and artwork" icon={{ ios: 'arrow.clockwise', android: 'refresh' }} />
          </Pressable>
        </NexusSurface>
      </View>

      <View style={styles.section}>
        <NexusText variant="micro" muted style={styles.label}>EXPERIENCE</NexusText>
        <Pressable
          onPress={() => {
            resetOnboarding();
            router.replace('/onboarding');
          }}>
          <NexusSurface style={styles.replay} intensity="soft">
            <View style={{ flex: 1, gap: 3 }}>
              <NexusText variant="caption">Replay first launch</NexusText>
              <NexusText variant="micro" muted>PERMISSION + MATERIAL INTRO</NexusText>
            </View>
            <NexusIcon ios="arrow.clockwise" android="refresh" size={18} color="#8E969D" />
          </NexusSurface>
        </Pressable>
      </View>

      {(screenReaderEnabled || highTextContrastEnabled || systemReduceMotion) ? (
        <NexusSurface
          accessibilityRole="summary"
          style={styles.accessibilityStatus}
          intensity="soft">
          <NexusText variant="caption">System accessibility is active</NexusText>
          <NexusText variant="micro" muted>
            {[
              screenReaderEnabled ? 'TALKBACK' : null,
              highTextContrastEnabled ? 'HIGH CONTRAST' : null,
              systemReduceMotion ? 'REDUCE MOTION' : null,
            ].filter(Boolean).join(' · ')}
          </NexusText>
        </NexusSurface>
      ) : null}

      <View style={styles.about}>
        <NexusText variant="heading">NEXUS PLAYER</NexusText>
        <NexusText variant="caption" muted>Audio should become the interface.</NexusText>
        <NexusText variant="micro" muted>DESIGN LANGUAGE · NEXUS GLASS ENGINE</NexusText>
      </View>
    </NexusScreen>
  );
}

const styles = StyleSheet.create({
  nav: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { marginTop: 12, maxWidth: 300 },
  section: { marginTop: 30, gap: 10 },
  label: { letterSpacing: 1.15, paddingLeft: 2 },
  group: { borderRadius: 26, paddingHorizontal: 14 },
  row: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.055)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmented: {
    minHeight: 46,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 23,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  segment: { flex: 1, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: 'rgba(255,255,255,0.105)' },
  quality: {
    height: 48,
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  qualityItem: { flex: 1, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  qualityActive: { backgroundColor: 'rgba(255,255,255,0.10)' },
  crossfadeRow: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  crossfadeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  crossfadeSegments: { height: 34, flexDirection: 'row', gap: 4 },
  crossfadeSegment: { flex: 1, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.035)' },
  crossfadeSegmentActive: { backgroundColor: 'rgba(255,255,255,0.11)' },
  qualityHint: { lineHeight: 18, paddingHorizontal: 2 },
  accessibilityStatus: {
    marginTop: 30,
    minHeight: 64,
    borderRadius: 22,
    paddingHorizontal: 16,
    justifyContent: 'center',
    gap: 3,
  },
  replay: {
    minHeight: 68,
    borderRadius: 24,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  about: { marginTop: 38, alignItems: 'center', gap: 5, paddingVertical: 28, opacity: 0.78 },
});
