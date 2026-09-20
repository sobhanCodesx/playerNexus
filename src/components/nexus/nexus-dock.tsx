import { Pressable, StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { nexusTokens } from '@/design/nexus-tokens';
import { usePlayer } from '@/providers/player-provider';
import { NexusIcon, NexusSurface, NexusText } from './nexus-primitives';

const items = [
  { label: 'Home', path: '/', ios: 'house.fill', android: 'home' },
  { label: 'Library', path: '/library', ios: 'music.note.list', android: 'library_music' },
  { label: 'Search', path: '/search', ios: 'magnifyingglass', android: 'search' },
] as const;

export function NexusDock() {
  const router = useRouter();
  const path = usePathname();
  const insets = useSafeAreaInsets();
  const { expanded } = usePlayer();
  if (expanded || path === '/visualizer' || path === '/onboarding') return null;

  return (
    <NexusSurface style={[styles.dock, { bottom: insets.bottom + 12 }]} intensity="strong">
      {items.map((item) => {
        const active = path === item.path;
        return (
          <Pressable
            key={item.path}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => router.replace(item.path)}
            style={styles.item}>
            <View style={[styles.indicator, active && styles.indicatorActive]}>
              <NexusIcon
                ios={item.ios}
                android={item.android}
                size={20}
                color={active ? nexusTokens.colors.white : '#7D858C'}
              />
            </View>
            <NexusText
              variant="micro"
              style={{ color: active ? nexusTokens.colors.white : '#6F777F', letterSpacing: 0.35 }}>
              {item.label.toUpperCase()}
            </NexusText>
          </Pressable>
        );
      })}
    </NexusSurface>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: 46,
    right: 46,
    height: 60,
    borderRadius: 26,
    zIndex: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
  },
  item: {
    width: 76,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  indicator: {
    width: 38,
    height: 26,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorActive: {
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
});
