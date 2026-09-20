import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';

import type { Track } from '@/data/library';
import { usePlayer, usePlayerActions } from '@/providers/player-provider';
import {
  NexusArtwork,
  NexusIcon,
  NexusIconButton,
  NexusSurface,
  NexusText,
} from '@/components/nexus/nexus-primitives';
import { NexusScreen } from '@/components/nexus/nexus-screen';
import { nexusHaptics } from '@/services/haptics';

export default function QueueAddScreen() {
  const router = useRouter();
  const player = usePlayer();
  const { hydrateArtworkWindow } = usePlayerActions();
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLowerCase();
  const queuedIds = useMemo(() => new Set(player.queue.map((track) => track.id)), [player.queue]);

  const tracks = useMemo(
    () =>
      player.libraryTracks.filter((track) =>
        !normalized ||
        (track.title + ' ' + track.artist + ' ' + track.album).toLowerCase().includes(normalized),
      ),
    [normalized, player.libraryTracks],
  );

  const renderItem = useCallback(
    ({ item: track }: { item: Track }) => {
      const queued = queuedIds.has(track.id);
      return (
        <View style={styles.row}>
          <NexusArtwork palette={track.palette} artworkUri={track.artworkUri} size={44} radius={13} />
          <View style={{ flex: 1, gap: 2 }}>
            <NexusText numberOfLines={1}>{track.title}</NexusText>
            <NexusText variant="caption" muted numberOfLines={1}>{track.artist} · {track.album}</NexusText>
          </View>

          <Pressable
            onPress={() => {
              player.playNext(track);
              nexusHaptics.settle();
            }}
            style={styles.nextAction}
            accessibilityRole="button"
            accessibilityLabel={'Play ' + track.title + ' next'}>
            <NexusIcon ios="text.insert" android="playlist_play" size={18} color="#AAB1B7" />
            <NexusText variant="micro" muted>NEXT</NexusText>
          </Pressable>

          <Pressable
            disabled={queued}
            onPress={() => {
              player.addToQueue(track);
              nexusHaptics.lift();
            }}
            style={[styles.addAction, queued && styles.addedAction]}
            accessibilityRole="button"
            accessibilityLabel={queued ? track.title + ' is already queued' : 'Add ' + track.title + ' to queue'}>
            <NexusIcon
              ios={queued ? 'checkmark' : 'plus'}
              android={queued ? 'check' : 'add'}
              size={16}
              color={queued ? '#111519' : '#AAB1B7'}
            />
          </Pressable>
        </View>
      );
    },
    [player.addToQueue, player.playNext, queuedIds],
  );

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: Array<{ item: Track }> }) => {
      hydrateArtworkWindow(viewableItems.map((token) => token.item));
    },
    [hydrateArtworkWindow],
  );

  return (
    <NexusScreen scroll={false} contentContainerStyle={styles.screen}>
      <View style={styles.nav}>
        <NexusIconButton
          ios="chevron.left"
          android="arrow_back"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          size={44}
        />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <NexusText variant="micro" muted>SESSION QUEUE</NexusText>
          <NexusText variant="caption">Add music</NexusText>
        </View>
        <Pressable onPress={() => router.back()} style={styles.done}>
          <NexusText variant="caption">Done</NexusText>
        </Pressable>
      </View>

      <NexusSurface style={styles.search} intensity="strong">
        <NexusIcon ios="magnifyingglass" android="search" size={19} color="#929AA1" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Find music"
          placeholderTextColor="#747C83"
          selectionColor="#F3F5F6"
          style={styles.input}
          autoFocus
          autoCorrect={false}
        />
      </NexusSurface>

      <FlashList
        data={tracks}
        renderItem={renderItem}
        keyExtractor={(track) => track.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 18 }}
        drawDistance={420}
      />
    </NexusScreen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 0 },
  nav: { height: 56, flexDirection: 'row', alignItems: 'center' },
  done: { paddingHorizontal: 10, height: 40, alignItems: 'center', justifyContent: 'center' },
  search: { height: 52, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, marginTop: 14, marginBottom: 8 },
  input: { flex: 1, color: '#F4F6F7', fontSize: 16, fontWeight: '500', paddingVertical: 0 },
  list: { paddingTop: 10, paddingBottom: 28 },
  row: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.065)' },
  nextAction: { minWidth: 52, height: 42, alignItems: 'center', justifyContent: 'center', gap: 1 },
  addAction: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  addedAction: { backgroundColor: '#F3F5F6', borderColor: '#F3F5F6' },
});
