import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Platform } from 'react-native';

import NexusMedia, { isNexusMediaAvailable } from '../../modules/nexus-media';
import type { Track } from '@/data/library';

export type NexusLyricLine = {
  id: string;
  text: string;
  timeMs: number | null;
};

export type NexusLyricsDocument = {
  trackId: string;
  lines: NexusLyricLine[];
  synced: boolean;
  source: 'sidecar' | 'imported';
  sourceName: string;
  offsetMs: number;
};

const keyForTrack = (trackId: string) => 'nexus.lyrics.v1.' + trackId;
const timestampPattern = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;
const offsetPattern = /^\[offset:([+-]?\d+)\]$/i;
const metadataPattern = /^\[(ar|ti|al|by|re|ve|length):.*\]$/i;

function fractionToMilliseconds(value?: string) {
  if (!value) return 0;
  if (value.length === 1) return Number(value) * 100;
  if (value.length === 2) return Number(value) * 10;
  return Number(value.slice(0, 3));
}

export function parseLyrics(
  raw: string,
  trackId: string,
  source: NexusLyricsDocument['source'],
  sourceName: string,
  durationMs = 0,
): NexusLyricsDocument {
  const sourceLines = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  let offsetMs = 0;
  const timed: NexusLyricLine[] = [];
  const plain: string[] = [];

  sourceLines.forEach((sourceLine, lineIndex) => {
    const line = sourceLine.trim();
    if (!line) return;

    const offset = line.match(offsetPattern);
    if (offset) {
      offsetMs = Number(offset[1]) || 0;
      return;
    }
    if (metadataPattern.test(line)) return;

    const timestamps = [...line.matchAll(timestampPattern)];
    const text = line
      .replace(timestampPattern, '')
      .replace(/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g, '')
      .trim();

    if (timestamps.length) {
      timestamps.forEach((match, timestampIndex) => {
        const minutes = Number(match[1]) || 0;
        const seconds = Number(match[2]) || 0;
        const milliseconds = fractionToMilliseconds(match[3]);
        timed.push({
          id: lineIndex + ':' + timestampIndex + ':' + minutes + ':' + seconds,
          text: text || '· · ·',
          timeMs: Math.max(0, minutes * 60_000 + seconds * 1000 + milliseconds + offsetMs),
        });
      });
    } else {
      plain.push(line);
    }
  });

  if (timed.length) {
    timed.sort((a, b) => (a.timeMs ?? 0) - (b.timeMs ?? 0));
    return { trackId, lines: timed, synced: true, source, sourceName, offsetMs };
  }

  const denominator = Math.max(1, plain.length - 1);
  return {
    trackId,
    lines: plain.map((text, index) => ({
      id: 'plain:' + index,
      text,
      timeMs: durationMs > 0 ? Math.round((index / denominator) * durationMs) : null,
    })),
    synced: false,
    source,
    sourceName,
    offsetMs: 0,
  };
}

async function loadCached(track: Track): Promise<NexusLyricsDocument | null> {
  try {
    const raw = await AsyncStorage.getItem(keyForTrack(track.id));
    if (!raw) return null;
    const cached = JSON.parse(raw) as { content?: string; sourceName?: string };
    if (!cached.content) return null;
    return parseLyrics(
      cached.content,
      track.id,
      'imported',
      cached.sourceName || 'Imported lyrics',
      track.durationMs ?? 0,
    );
  } catch {
    return null;
  }
}

export async function resolveLyrics(track: Track): Promise<NexusLyricsDocument | null> {
  const cached = await loadCached(track);
  if (cached) return cached;

  if (
    Platform.OS === 'android' &&
    track.source === 'device' &&
    track.displayName &&
    isNexusMediaAvailable &&
    NexusMedia
  ) {
    try {
      const resolved = await NexusMedia.resolveSidecarLyrics(
        track.displayName,
        track.title,
        track.folder ?? null,
      );
      if (resolved.content) {
        return parseLyrics(
          resolved.content,
          track.id,
          'sidecar',
          resolved.sourceName || 'Sidecar lyrics',
          track.durationMs ?? 0,
        );
      }
    } catch {
      // Manual import remains available when Android scoped storage hides the sidecar.
    }
  }

  return null;
}

export async function importLyricsForTrack(track: Track): Promise<NexusLyricsDocument | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*',
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  const lowerName = asset.name.toLowerCase();
  if (!lowerName.endsWith('.lrc') && !lowerName.endsWith('.txt')) {
    throw new Error('Choose an .lrc or .txt lyrics file.');
  }

  const content = await new File(asset.uri).text();
  if (!content.trim()) throw new Error('Lyrics file is empty.');

  await AsyncStorage.setItem(
    keyForTrack(track.id),
    JSON.stringify({ content, sourceName: asset.name, importedAt: Date.now() }),
  );

  return parseLyrics(content, track.id, 'imported', asset.name, track.durationMs ?? 0);
}

export async function removeImportedLyrics(trackId: string) {
  await AsyncStorage.removeItem(keyForTrack(trackId));
}


const timingKeyForTrack = (trackId: string) => 'nexus.lyrics.timing.v1.' + trackId;

export async function loadLyricsTimingAdjustment(trackId: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(timingKeyForTrack(trackId));
    const value = Number(raw);
    return Number.isFinite(value) ? Math.max(-5000, Math.min(5000, value)) : 0;
  } catch {
    return 0;
  }
}

export async function saveLyricsTimingAdjustment(trackId: string, milliseconds: number) {
  const value = Math.max(-5000, Math.min(5000, Math.round(milliseconds / 100) * 100));
  await AsyncStorage.setItem(timingKeyForTrack(trackId), String(value));
  return value;
}
