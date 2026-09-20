import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Album, Artist, Track } from '@/data/library';
import { nexusTokens } from '@/design/nexus-tokens';
import { usePlayer } from '@/providers/player-provider';
import { NexusArtwork, NexusIcon, NexusText } from './nexus-primitives';

export function NexusTrackRow({
  track,
  index,
  showNumber = true,
  onPress,
}: {
  track: Track;
  index?: number;
  showNumber?: boolean;
  onPress?: () => void;
}) {
  const { playTrack } = usePlayer();
  return (
    <Pressable
      onPress={onPress ?? (() => playTrack(track))}
      accessibilityRole="button"
      accessibilityLabel={track.title + ' by ' + track.artist}
      style={({ pressed }) => [styles.trackRow, pressed && styles.pressed]}>
      {showNumber ? (
        <NexusText variant="micro" muted style={styles.trackNumber}>
          {String((index ?? 0) + 1).padStart(2, '0')}
        </NexusText>
      ) : (
        <NexusArtwork palette={track.palette} size={42} radius={12} />
      )}
      <View style={styles.trackMeta}>
        <NexusText numberOfLines={1} style={styles.trackTitle}>{track.title}</NexusText>
        <NexusText variant="caption" muted numberOfLines={1}>{track.artist} · {track.album}</NexusText>
      </View>
      <NexusText variant="caption" muted>{track.duration}</NexusText>
      <View style={styles.more}>
        <NexusIcon ios="ellipsis" android="more_horiz" size={18} color="#7F878E" />
      </View>
    </Pressable>
  );
}

export function NexusAlbumTile({ album, width = 158 }: { album: Album; width?: number }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/album', params: { id: album.id } })}
      style={({ pressed }) => [{ width, gap: 9 }, pressed && styles.pressed]}>
      <NexusArtwork palette={album.palette} size={width} radius={22} />
      <View style={{ gap: 2 }}>
        <NexusText variant="caption" numberOfLines={1}>{album.title}</NexusText>
        <NexusText variant="micro" muted numberOfLines={1}>{album.artist.toUpperCase()}</NexusText>
      </View>
    </Pressable>
  );
}

export function NexusArtistBubble({ artist, size = 78 }: { artist: Artist; size?: number }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/artist', params: { id: artist.id } })}
      style={({ pressed }) => [styles.artist, pressed && styles.pressed]}>
      <View
        style={[
          styles.artistArt,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: artist.palette[2],
            borderColor: artist.palette[0] + 'AA',
          },
        ]}>
        <View style={[styles.artistGlow, { backgroundColor: artist.palette[0] }]} />
        <NexusText variant="heading" style={{ fontSize: size * 0.27 }}>
          {artist.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
        </NexusText>
      </View>
      <NexusText variant="caption" numberOfLines={1} style={{ maxWidth: size + 24 }}>{artist.name}</NexusText>
    </Pressable>
  );
}

export function TinyAction({ label, onPress }: { label: string; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tinyAction}>
      <NexusText variant="micro" muted>{label.toUpperCase()}</NexusText>
      <NexusIcon ios="chevron.right" android="chevron_right" size={14} color={nexusTokens.colors.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.74, transform: [{ scale: 0.99 }] },
  trackRow: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  trackNumber: { width: 24, textAlign: 'center' },
  trackMeta: { flex: 1, gap: 2 },
  trackTitle: { fontSize: 15, fontWeight: '600' },
  more: { width: 28, alignItems: 'flex-end' },
  artist: { alignItems: 'center', gap: 9 },
  artistArt: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  artistGlow: {
    position: 'absolute',
    width: '74%',
    height: '48%',
    borderRadius: 999,
    top: -8,
    right: -12,
    opacity: 0.36,
    transform: [{ rotate: '24deg' }],
  },
  tinyAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 8,
  },
});
