import { requireOptionalNativeModule } from 'expo-modules-core';

export type NativeMusicTrack = {
  id: string;
  uri: string;
  title: string;
  artist: string;
  album: string;
  albumId: string;
  durationMs: number;
  dateAdded: number;
  displayName: string;
  folder: string | null;
};

export type ResolvedArtwork = {
  artworkUri: string | null;
  palette: string[];
};

export type NexusMediaNativeModule = {
  scanMusic(limit: number): Promise<NativeMusicTrack[]>;
  resolveArtwork(uri: string, cacheKey: string): Promise<ResolvedArtwork>;
  extractWaveform(uri: string, cacheKey: string, bucketCount: number): Promise<number[]>;
  clearArtworkCache(): Promise<void>;
};

const NexusMedia = requireOptionalNativeModule<NexusMediaNativeModule>('NexusMedia');

export const isNexusMediaAvailable = NexusMedia !== null;
export default NexusMedia;
