import { PermissionsAndroid, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';

import NexusMedia, {
  isNexusMediaAvailable,
  type NativeMusicTrack,
} from '../../modules/nexus-media';
import type { Track } from '@/data/library';
import type { NexusPalette } from '@/design/nexus-tokens';

export type LibraryPermission = 'granted' | 'denied' | 'blocked' | 'undetermined';

export type MusicAccessDiagnosticSnapshot = {
  sdkInt: number;
  permission: string;
  declared: boolean | null;
  granted: boolean;
  nativeScanner: boolean;
  expoGo: boolean;
};

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
  displayName: track.displayName,
  palette: fallbackPalette(track.albumId || track.title),
  source: 'device',
});

const cleanFilename = (filename: string) =>
  filename.replace(/\.[a-z0-9]{1,6}$/i, '').replace(/[_-]+/g, ' ').trim() || 'Unknown track';

type ExpoAudioAsset = {
  id: string;
  filename: string;
  albumId?: string | null;
  duration?: number;
  creationTime?: number;
  modificationTime?: number;
  uri: string;
};

const mapExpoAsset = (asset: ExpoAudioAsset): Track => {
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
    displayName: asset.filename,
    palette: fallbackPalette(albumId + title),
    source: 'device',
  };
};

async function scanWithExpoMediaLibrary(limit: number): Promise<Track[]> {
  const MediaLibrary = await import('expo-media-library/legacy');
  const result: Track[] = [];
  let after: string | undefined;

  while (result.length < limit) {
    const page = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.audio,
      first: Math.min(500, limit - result.length),
      after,
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    });

    result.push(...page.assets.map((asset) => mapExpoAsset(asset as ExpoAudioAsset)));

    if (!page.hasNextPage || !page.endCursor) break;
    after = page.endCursor;
  }

  return result;
}

const isExpoGo = Constants.appOwnership === 'expo';

export function isExpoGoRuntime() {
  return isExpoGo;
}

export async function pickMusicFilesForExpoGo(): Promise<Track[]> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'audio/*',
    multiple: true,
    copyToCacheDirectory: true,
  });

  if (result.canceled) return [];

  const now = Date.now();
  return result.assets.map((asset, index) => {
    const title = cleanFilename(asset.name);
    const seed = asset.name + ':' + asset.size + ':' + index;
    return {
      id: 'device:picker:' + encodeURIComponent(asset.uri),
      nativeId: undefined,
      uri: asset.uri,
      title,
      artist: 'Unknown artist',
      album: 'Selected files',
      albumId: 'selected-files',
      duration: '0:00',
      durationMs: 0,
      year: 0,
      dateAdded: now - index,
      displayName: asset.name,
      folder: 'Selected files',
      palette: fallbackPalette(seed),
      source: 'device' as const,
    };
  });
}

const androidAudioPermission = () =>
  Number(Platform.Version) >= 33
    ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO
    : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

export async function getMusicPermission(): Promise<LibraryPermission> {
  if (Platform.OS !== 'android') return 'granted';

  try {
    if (isExpoGo) return 'granted';

    const MediaLibrary = await import('expo-media-library/legacy');
    const permission = androidAudioPermission();
    const nativeGranted = await PermissionsAndroid.check(permission);
    if (nativeGranted) return 'granted';

    const response = await MediaLibrary.getPermissionsAsync(false, ['audio']);
    if (response.granted) return 'granted';
    if (response.canAskAgain === false) return 'blocked';
    return response.status === 'undetermined' ? 'undetermined' : 'denied';
  } catch {
    return 'undetermined';
  }
}

export async function requestMusicPermission(): Promise<LibraryPermission> {
  if (Platform.OS !== 'android') return 'granted';

  try {
    if (isExpoGo) return 'granted';

    const MediaLibrary = await import('expo-media-library/legacy');
    const permission = androidAudioPermission();
    const nativeResult = await PermissionsAndroid.request(permission);

    if (nativeResult === PermissionsAndroid.RESULTS.GRANTED) return 'granted';
    if (nativeResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) return 'blocked';

    const response = await MediaLibrary.requestPermissionsAsync(false, ['audio']);
    if (response.granted) return 'granted';
    if (response.canAskAgain === false) return 'blocked';
    return response.status === 'undetermined' ? 'undetermined' : 'denied';
  } catch {
    return 'blocked';
  }
}

export async function getMusicAccessDiagnostics(): Promise<MusicAccessDiagnosticSnapshot> {
  const permission =
    Platform.OS === 'android'
      ? androidAudioPermission()
      : 'not-required';

  let granted = Platform.OS !== 'android';
  if (Platform.OS === 'android') {
    granted = await PermissionsAndroid.check(permission).catch(() => false);
  }

  if (Platform.OS === 'android' && isNexusMediaAvailable && NexusMedia) {
    try {
      const native = await NexusMedia.musicAccessDiagnostics();
      return {
        sdkInt: native.sdkInt,
        permission: native.permission,
        declared: native.declared,
        granted: native.granted,
        nativeScanner: true,
        expoGo: false,
      };
    } catch {
      // Keep the JS diagnostics path available for stale dev clients.
    }
  }

  return {
    sdkInt: Platform.OS === 'android' ? Number(Platform.Version) : 0,
    permission,
    declared: isExpoGo ? true : null,
    granted,
    nativeScanner: false,
    expoGo: isExpoGo,
  };
}

export async function scanDeviceMusic(limit = 5000): Promise<Track[]> {
  if (Platform.OS !== 'android') return [];
  if (isExpoGo) return [];

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


const seededWaveform = (seed: string, buckets: number) => {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Array.from({ length: buckets }, (_, index) => {
    const a = Math.sin(index * 0.91 + (hash & 31)) * 0.22;
    const b = Math.sin(index * 0.37 + ((hash >>> 8) & 17)) * 0.16;
    const c = Math.sin(index * 1.73 + ((hash >>> 16) & 11)) * 0.09;
    return Math.max(0.1, Math.min(1, 0.46 + a + b + c));
  });
};

export async function resolveTrackWaveform(track: Track, buckets = 52): Promise<number[]> {
  const count = Math.max(24, Math.min(160, Math.round(buckets)));
  if (
    Platform.OS === 'android' &&
    track.uri &&
    track.source === 'device' &&
    isNexusMediaAvailable &&
    NexusMedia
  ) {
    try {
      const values = await NexusMedia.extractWaveform(track.uri, track.nativeId || track.id, count);
      if (values.length === count) {
        return values.map((value) => Math.max(0.06, Math.min(1, Number(value) || 0.06)));
      }
    } catch {
      // Keep scrubbing functional even in Expo Go or a stale Development Build.
    }
  }
  return seededWaveform(track.id, count);
}
