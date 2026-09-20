import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { usePlayer } from '@/providers/player-provider';
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}>
        {tracks.map((track) => {
          const queued = queuedIds.has(track.id);
          return (
            <View key={track.id} style={styles.row}>
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
        })}
      </ScrollView>
    </NexusScreen>
  );
}

const styles = StyleSheet.create({
  nav: { height: 56, flexDirection: 'row', alignItems: 'center' },
  done: { paddingHorizontal: 10, height: 40, alignItems: 'center', justifyContent: 'center' },
  search: { height: 52, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15, marginTop: 14 },
  input: { flex: 1, color: '#F4F6F7', fontSize: 16, fontWeight: '500', paddingVertical: 0 },
  list: { paddingTop: 18, paddingBottom: 100 },
  row: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.065)' },
  nextAction: { minWidth: 52, height: 42, alignItems: 'center', justifyContent: 'center', gap: 1 },
  addAction: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.18)' },
  addedAction: { backgroundColor: '#F3F5F6', borderColor: '#F3F5F6' },
});
