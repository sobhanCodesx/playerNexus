import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useRouter } from 'expo-router';

import { usePlayer } from '@/providers/player-provider';
import {
  importLyricsForTrack,
  loadLyricsTimingAdjustment,
  resolveLyrics,
  saveLyricsTimingAdjustment,
  type NexusLyricLine,
  type NexusLyricsDocument,
} from '@/services/lyrics-service';
import {
  NexusArtwork,
  NexusIcon,
  NexusIconButton,
  NexusSurface,
  NexusText,
} from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';
import { nexusHaptics } from '@/services/haptics';

export default function LyricsScreen() {
  const router = useRouter();
  const player = usePlayer();
  const listRef = useRef<FlatList<NexusLyricLine>>(null);
  const [document, setDocument] = useState<NexusLyricsDocument | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [importing, setImporting] = useState(false);
  const [timingOffsetMs, setTimingOffsetMs] = useState(0);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setStatus('loading');
    setDocument(null);
    loadLyricsTimingAdjustment(player.track.id)
      .then((value) => {
        if (id === requestId.current) setTimingOffsetMs(value);
      })
      .catch(() => undefined);
    resolveLyrics(player.track)
      .then((resolved) => {
        if (id !== requestId.current) return;
        setDocument(resolved);
        setStatus(resolved?.lines.length ? 'ready' : 'empty');
      })
      .catch(() => {
        if (id === requestId.current) setStatus('error');
      });
  }, [player.track.id]);

  const activeIndex = useMemo(() => {
    if (!document?.lines.length) return -1;
    const now = player.currentTime * 1000 + timingOffsetMs;
    let low = 0;
    let high = document.lines.length - 1;
    let answer = 0;
    while (low <= high) {
      const middle = Math.floor((low + high) / 2);
      const time = document.lines[middle].timeMs;
      if (time == null || time <= now) {
        answer = middle;
        low = middle + 1;
      } else {
        high = middle - 1;
      }
    }
    return answer;
  }, [document, player.currentTime, timingOffsetMs]);

  useEffect(() => {
    if (!document?.synced || activeIndex < 0 || !player.isPlaying) return;
    listRef.current?.scrollToIndex({
      index: activeIndex,
      animated: true,
      viewPosition: 0.42,
    });
  }, [activeIndex, document?.synced, player.isPlaying]);

  const importLyrics = async () => {
    setImporting(true);
    try {
      const imported = await importLyricsForTrack(player.track);
      if (imported) {
        setDocument(imported);
        setStatus(imported.lines.length ? 'ready' : 'empty');
        nexusHaptics.settle();
      }
    } catch {
      setStatus('error');
    } finally {
      setImporting(false);
    }
  };

  const seekLine = (line: NexusLyricLine) => {
    if (line.timeMs == null || player.duration <= 0) return;
    nexusHaptics.seek();
    player.seek(Math.max(0, line.timeMs - timingOffsetMs) / (player.duration * 1000));
  };

  const renderLine = ({ item, index }: ListRenderItemInfo<NexusLyricLine>) => {
    const distance = Math.abs(index - activeIndex);
    const current = index === activeIndex;
    return (
      <Pressable
        onPress={() => seekLine(item)}
        disabled={item.timeMs == null}
        accessibilityRole="button"
        accessibilityLabel={
          item.timeMs == null
            ? item.text
            : item.text + ', seek to ' + Math.floor(item.timeMs / 1000) + ' seconds'
        }
        style={styles.lineWrap}>
        <NexusText
          style={[
            styles.line,
            current && styles.current,
            distance === 1 && styles.near,
            distance > 1 && styles.far,
          ]}>
          {item.text}
        </NexusText>
      </Pressable>
    );
  };

  return (
    <NexusScreen scroll={false}>
      <View style={styles.nav}>
        <NexusIconButton
          ios="chevron.left"
          android="arrow_back"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          size={44}
        />
        <View style={styles.navTitle}>
          <NexusText variant="micro" muted>LYRICS · LIVE FOCUS</NexusText>
          {document ? (
            <NexusText variant="micro" muted>
              {document.synced ? 'SYNCED' : 'UNSYNCED'} · {document.sourceName.toUpperCase()}
            </NexusText>
          ) : null}
        </View>
        <NexusIconButton
          ios="square.and.arrow.down"
          android="file_open"
          accessibilityLabel={document ? 'Import different lyrics' : 'Import lyrics'}
          onPress={importLyrics}
          size={44}
        />
      </View>

      <View style={styles.trackStrip}>
        <NexusArtwork
          palette={player.track.palette}
          artworkUri={player.track.artworkUri}
          size={54}
          radius={16}
          active={player.isPlaying}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <NexusText variant="caption" numberOfLines={1}>{player.track.title}</NexusText>
          <NexusText variant="micro" muted numberOfLines={1}>{player.track.artist.toUpperCase()}</NexusText>
        </View>
        <Pressable
          onPress={player.togglePlayback}
          accessibilityRole="button"
          accessibilityLabel={player.isPlaying ? 'Pause' : 'Play'}
          style={styles.play}>
          <NexusIcon
            ios={player.isPlaying ? 'pause.fill' : 'play.fill'}
            android={player.isPlaying ? 'pause' : 'play_arrow'}
            size={20}
          />
        </Pressable>
      </View>

      {status === 'ready' && document ? (
        <>
          {document.synced ? (
            <View style={styles.timingBar}>
              <NexusText variant="micro" muted>TIMING</NexusText>
              <Pressable
                onPress={async () => {
                  const value = await saveLyricsTimingAdjustment(player.track.id, timingOffsetMs - 500);
                  setTimingOffsetMs(value);
                  nexusHaptics.seek();
                }}
                style={styles.timingButton}>
                <NexusText variant="micro">−0.5S</NexusText>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const value = await saveLyricsTimingAdjustment(player.track.id, 0);
                  setTimingOffsetMs(value);
                  nexusHaptics.settle();
                }}
                style={styles.timingValue}>
                <NexusText variant="micro" muted>
                  {timingOffsetMs === 0
                    ? 'SYNC'
                    : (timingOffsetMs > 0 ? '+' : '') + (timingOffsetMs / 1000).toFixed(1) + 'S'}
                </NexusText>
              </Pressable>
              <Pressable
                onPress={async () => {
                  const value = await saveLyricsTimingAdjustment(player.track.id, timingOffsetMs + 500);
                  setTimingOffsetMs(value);
                  nexusHaptics.seek();
                }}
                style={styles.timingButton}>
                <NexusText variant="micro">+0.5S</NexusText>
              </Pressable>
            </View>
          ) : null}
          <FlatList
          ref={listRef}
          data={document.lines}
          renderItem={renderLine}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.lyrics}
          onScrollToIndexFailed={({ index, averageItemLength }) => {
            listRef.current?.scrollToOffset({
              offset: Math.max(0, index * averageItemLength),
              animated: true,
            });
          }}
          ListFooterComponent={
            <View style={styles.hint}>
              <NexusText variant="micro" muted>
                {document.synced
                  ? 'TAP A LINE TO SEEK · AUTO FOCUS FOLLOWS PLAYBACK'
                  : 'PLAIN TEXT · SEEK POSITIONS ARE ESTIMATED'}
              </NexusText>
            </View>
          }
        />
        </>
      ) : (
        <View style={styles.emptyWrap}>
          <NexusSurface style={styles.empty} intensity="soft">
            <View style={styles.emptyGlyph}>
              <NexusIcon ios="quote.bubble.fill" android="lyrics" size={27} color="#AAB2B9" />
            </View>
            <NexusText variant="heading">
              {status === 'loading'
                ? 'Looking beside the track…'
                : status === 'error'
                  ? 'Lyrics could not be opened'
                  : 'No local lyrics found'}
            </NexusText>
            <NexusText muted style={styles.emptyCopy}>
              Nexus looks for an LRC or TXT file beside the audio first. You can also attach one manually and it stays linked to this track on this device.
            </NexusText>
            <Pressable onPress={importLyrics} disabled={importing || status === 'loading'} style={styles.importButton}>
              <NexusIcon ios="doc.badge.plus" android="note_add" size={18} color="#111519" />
              <NexusText variant="caption" style={{ color: '#111519' }}>
                {importing ? 'Importing…' : 'Import LRC / TXT'}
              </NexusText>
            </Pressable>
          </NexusSurface>
        </View>
      )}
    </NexusScreen>
  );
}

const styles = StyleSheet.create({
  nav: { height: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navTitle: { flex: 1, alignItems: 'center', gap: 2 },
  trackStrip: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  play: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.065)' },
  timingBar: {
    minHeight: 42,
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  timingButton: {
    height: 30,
    borderRadius: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  timingValue: {
    minWidth: 58,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  lyrics: { paddingTop: 22, paddingBottom: 190, gap: 12 },
  lineWrap: { paddingVertical: 5 },
  line: { fontSize: 25, lineHeight: 33, fontWeight: '600', letterSpacing: -0.5, color: 'rgba(246,247,248,0.18)' },
  current: { fontSize: 31, lineHeight: 39, color: '#F6F7F8', fontWeight: '700' },
  near: { color: 'rgba(246,247,248,0.46)' },
  far: { color: 'rgba(246,247,248,0.16)' },
  hint: { marginTop: 28, alignItems: 'center', opacity: 0.62, paddingBottom: 24 },
  emptyWrap: { flex: 1, justifyContent: 'center', paddingBottom: 80 },
  empty: { minHeight: 270, borderRadius: 32, padding: 28, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyGlyph: { width: 64, height: 64, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 7 },
  emptyCopy: { maxWidth: 310, textAlign: 'center', lineHeight: 21 },
  importButton: { marginTop: 10, height: 46, borderRadius: 23, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#F3F5F6' },
});
