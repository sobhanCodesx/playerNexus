import { Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';

import { nexusTokens } from '@/design/nexus-tokens';
import { usePlayer } from '@/providers/player-provider';
import { NexusAlbumTile, NexusArtistBubble, TinyAction } from '@/components/nexus/nexus-cards';
import {
  NexusArtwork,
  NexusIcon,
  NexusIconButton,
  NexusSurface,
  NexusText,
  SectionHeader,
} from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';

export default function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const player = usePlayer();
  const tracks = player.libraryTracks;
  const albums = player.libraryAlbums;
  const artists = player.libraryArtists;
  const recentTracks = player.recentTracks.filter((item) => item.id !== player.track.id);
  const recent = (recentTracks.length ? recentTracks : tracks.filter((item) => item.id !== player.track.id)).slice(0, 3);
  const favoriteCount = player.favoriteTracks.length;
  const favoritePalette = player.favoriteTracks[0]?.palette ?? player.track.palette;
  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'GOOD MORNING' : greetingHour < 18 ? 'GOOD AFTERNOON' : 'GOOD EVENING';
  const artSize = Math.min(width - 72, 292);
  const albumWidth = Math.min(164, (width - 56) / 2);

  return (
    <NexusScreen>
      <View style={styles.header}>
        <View>
          <NexusText variant="micro" muted style={styles.eyebrow}>{greeting}</NexusText>
          <NexusText variant="title">Your listening space</NexusText>
        </View>
        <NexusIconButton
          ios="gearshape.fill"
          android="settings"
          accessibilityLabel="Settings"
          onPress={() => router.push('/settings')}
          size={44}
        />
      </View>

      {player.libraryStatus === 'permission' ? (
        <NexusSurface style={styles.libraryGate} intensity="strong">
          <View style={{ flex: 1, gap: 4 }}>
            <NexusText variant="caption">Your music is still outside Nexus</NexusText>
            <NexusText variant="micro" muted>GRANT AUDIO ACCESS · LOCAL ONLY</NexusText>
          </View>
          <Pressable onPress={() => player.scanLibrary(true)} style={styles.scanButton}>
            <NexusText variant="micro" style={{ color: '#111519' }}>SCAN MUSIC</NexusText>
          </Pressable>
        </NexusSurface>
      ) : null}

      <Pressable
        onPress={player.openPlayer}
        accessibilityRole="button"
        accessibilityLabel={'Continue listening to ' + player.track.title}
        style={styles.hero}>
        <View style={styles.heroOrbit}>
          <View style={[styles.heroHalo, { backgroundColor: player.track.palette[0] }]} />
          <NexusArtwork
            palette={player.track.palette}
            artworkUri={player.track.artworkUri}
            size={artSize}
            active={player.isPlaying}
            style={styles.heroArtwork}
          />
          <NexusSurface style={styles.heroChip} intensity="strong">
            <View style={[styles.liveDot, { backgroundColor: player.theme.accent }]} />
            <NexusText variant="micro">CONTINUE LISTENING</NexusText>
          </NexusSurface>
        </View>
        <View style={styles.heroMeta}>
          <View style={{ flex: 1, gap: 4 }}>
            <NexusText variant="display" numberOfLines={1} style={styles.heroTitle}>{player.track.title}</NexusText>
            <NexusText muted>{player.track.artist} · {player.track.album}</NexusText>
          </View>
          <View style={styles.heroArrow}>
            <NexusIcon ios="arrow.up.right" android="north_east" size={22} />
          </View>
        </View>
      </Pressable>

      <View style={styles.section}>
        <SectionHeader title="Recently played" action={<TinyAction label="All" onPress={() => router.push('/library')} />} />
        <View style={styles.coverFlow}>
          {recent.map((track, index) => (
            <Pressable
              key={track.id}
              onPress={() => {
                player.playTrack(track);
                player.openPlayer();
              }}
              style={[
                styles.flowItem,
                index === 0 && { transform: [{ rotate: '-5deg' }, { translateX: 10 }, { scale: 0.91 }], opacity: 0.68 },
                index === 1 && { zIndex: 3, transform: [{ translateY: -8 }] },
                index === 2 && { transform: [{ rotate: '5deg' }, { translateX: -10 }, { scale: 0.91 }], opacity: 0.68 },
              ]}>
              <NexusArtwork palette={track.palette} artworkUri={track.artworkUri} size={118} radius={24} />
              {index === 1 && (
                <View style={styles.flowLabel}>
                  <NexusText variant="caption" numberOfLines={1}>{track.title}</NexusText>
                  <NexusText variant="micro" muted>{track.artist.toUpperCase()}</NexusText>
                </View>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Albums" action={<TinyAction label="Library" onPress={() => router.push('/library')} />} />
        <View style={styles.albumGrid}>
          {albums.map((album) => <NexusAlbumTile key={album.id} album={album} width={albumWidth} />)}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Artists" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.artistRail}>
          {artists.map((artist) => <NexusArtistBubble key={artist.id} artist={artist} />)}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Favorites" />
        <Pressable onPress={() => router.push('/library')}>
          <View style={styles.favoriteStack}>
            <View style={[styles.stackPlate, styles.stackBack, { backgroundColor: favoritePalette[1] }]} />
            <View style={[styles.stackPlate, styles.stackMid, { backgroundColor: favoritePalette[0] }]} />
            <NexusSurface style={styles.favoriteFront} intensity="strong">
              <View style={styles.favoriteIcon}>
                <NexusIcon ios="heart.fill" android="favorite" size={22} color={player.theme.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <NexusText variant="heading">Your pulse</NexusText>
                <NexusText variant="caption" muted>
                  {favoriteCount ? favoriteCount + (favoriteCount === 1 ? ' track stayed with you' : ' tracks that stayed with you') : 'Double-tap artwork to build your pulse'}
                </NexusText>
              </View>
              <NexusIcon ios="chevron.right" android="chevron_right" size={20} color="#8F969D" />
            </NexusSurface>
          </View>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <NexusText variant="micro" muted>NEXUS PLAYER · LOCAL FIRST</NexusText>
      </View>
    </NexusScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 64,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginBottom: 22,
  },
  eyebrow: { marginBottom: 5, letterSpacing: 1.2 },
  libraryGate: {
    minHeight: 68,
    borderRadius: 24,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  scanButton: {
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F5F6',
  },
  hero: { alignItems: 'center', marginBottom: 34 },
  heroOrbit: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  heroHalo: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 999,
    opacity: 0.13,
    transform: [{ scaleX: 1.26 }, { scaleY: 0.84 }],
  },
  heroArtwork: {
    transform: [{ rotate: '-1.1deg' }],
  },
  heroChip: {
    position: 'absolute',
    bottom: -2,
    borderRadius: 999,
    height: 34,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  heroMeta: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    marginTop: 24,
  },
  heroTitle: { fontSize: 34, lineHeight: 39 },
  heroArrow: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginTop: 30, gap: 16 },
  coverFlow: {
    height: 172,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  flowItem: { width: 112, alignItems: 'center' },
  flowLabel: {
    position: 'absolute',
    top: 122,
    width: 150,
    alignItems: 'center',
    gap: 1,
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
  },
  artistRail: { gap: 22, paddingRight: 20 },
  favoriteStack: { height: 106, justifyContent: 'flex-end', paddingTop: 18 },
  stackPlate: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 76,
    borderRadius: 24,
    opacity: 0.16,
  },
  stackBack: { top: 0, transform: [{ scaleX: 0.91 }] },
  stackMid: { top: 9, transform: [{ scaleX: 0.96 }], opacity: 0.11 },
  favoriteFront: {
    height: 82,
    borderRadius: nexusTokens.radius.lg,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  favoriteIcon: {
    width: 46,
    height: 46,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  footer: { marginTop: 42, alignItems: 'center', opacity: 0.55 },
});
