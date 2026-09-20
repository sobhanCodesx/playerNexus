import { Platform } from 'react-native';
import * as MediaLibrary from 'expo-media-library/legacy';

import NexusMedia, {
  isNexusMediaAvailable,
  type NativeMusicTrack,
} from '../../modules/nexus-media';
import type { Track } from '@/data/library';
import type { NexusPalette } from '@/design/nexus-tokens';

export type LibraryPermission = 'granted' | 'denied' | 'undetermined';

const formatDuration = (milliseconds: number) => {
  const seconds = Math.max(0, Math.round(milliseconds / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes + ':' + String(seconds % 60).padStart(2, '0');
};

const fallbackPalette = (seed: string): NexusPalette => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const r = 72 + ((hash >>> 16) & 0x6f);
  const g = 64 + ((hash >>> 8) & 0x6f);
  const b = 72 + (hash & 0x6f);
  const hex = (red: number, green: number, blue: number) =>
    '#' + [red, green, blue]
      .map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, '0'))
      .join('');
  return [
    hex(r, g, b),
    hex(Math.round((r + 152) / 2), Math.round((g + 132) / 2), Math.round((b + 164) / 2)),
    hex(Math.round(r * 0.38), Math.round(g * 0.38), Math.round(b * 0.38)),
    '#090C0F',
    hex(Math.min(255, r + 35), Math.min(255, g + 28), Math.min(255, b + 24)),
  ];
};

const mapNativeTrack = (track: NativeMusicTrack): Track => ({
  id: 'device:' + track.id,
  nativeId: track.id,
  uri: track.uri,
  title: track.title,
  artist: track.artist,
  album: track.album,
  albumId: track.albumId,
  duration: formatDuration(track.durationMs),
  durationMs: track.durationMs,
  year: 0,
  dateAdded: track.dateAdded,
  folder: track.folder ?? undefined,
  palette: fallbackPalette(track.albumId || track.title),
  source: 'device',
});

const cleanFilename = (filename: string) =>
  filename.replace(/\.[a-z0-9]{1,6}$/i, '').replace(/[_-]+/g, ' ').trim() || 'Unknown track';

const mapExpoAsset = (asset: MediaLibrary.Asset): Track => {
  const title = cleanFilename(asset.filename);
  const albumId = asset.albumId ?? 'local-files';
  const durationMs = Math.max(0, Math.round((asset.duration ?? 0) * 1000));
  return {
    id: 'device:' + asset.id,
    nativeId: asset.id,
    uri: asset.uri,
    title,
    artist: 'Unknown artist',
    album: 'Local files',
    albumId,
    duration: formatDuration(durationMs),
    durationMs,
    year: 0,
    dateAdded: asset.creationTime || asset.modificationTime || Date.now(),
    palette: fallbackPalette(albumId + title),
    source: 'device',
  };
};

async function scanWithExpoMediaLibrary(limit: number): Promise<Track[]> {
  const result: Track[] = [];
  let after: string | undefined;

  while (result.length < limit) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: Math.min(500, limit - result.length),
      after,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });

    result.push(...page.assets.map(mapExpoAsset));

    if (!page.hasNextPage || !page.endCursor) break;
    after = page.endCursor;
  }

  return result;
}

export async function getMusicPermission(): Promise<LibraryPermission> {
  if (Platform.OS !== 'android') return 'granted';
  const response = await MediaLibrary.getPermissionsAsync(false, ['audio']);
  if (response.granted) return 'granted';
  return response.status === 'undetermined' ? 'undetermined' : 'denied';
}

export async function requestMusicPermission(): Promise<LibraryPermission> {
  if (Platform.OS !== 'android') return 'granted';
  const response = await MediaLibrary.requestPermissionsAsync(false, ['audio']);
  if (response.granted) return 'granted';
  return response.status === 'undetermined' ? 'undetermined' : 'denied';
}

export async function scanDeviceMusic(limit = 5000): Promise<Track[]> {
  if (Platform.OS !== 'android') return [];

  if (isNexusMediaAvailable && NexusMedia) {
    try {
      const result = await NexusMedia.scanMusic(limit);
      return result.map(mapNativeTrack);
    } catch {
      // A stale development build can expose the module but still fail at runtime.
      // Falling back keeps Nexus usable while the native client is rebuilt.
    }
  }

  return scanWithExpoMediaLibrary(limit);
}

export async function resolveTrackArtwork(track: Track) {
  if (
    Platform.OS !== 'android' ||
    !track.uri ||
    track.source !== 'device' ||
    !isNexusMediaAvailable ||
    !NexusMedia
  ) {
    return { artworkUri: track.artworkUri ?? null, palette: track.palette };
  }

  try {
    const resolved = await NexusMedia.resolveArtwork(track.uri, track.albumId || track.id);
    const colors = resolved.palette.filter((color) => /^#[0-9a-f]{6}$/i.test(color));
    const palette = (colors.length >= 3 ? colors : track.palette) as NexusPalette;
    return { artworkUri: resolved.artworkUri, palette };
  } catch {
    return { artworkUri: track.artworkUri ?? null, palette: track.palette };
  }
}

export function hasEnhancedNativeLibrary() {
  return isNexusMediaAvailable;
}
