import { requireNativeModule } from 'expo-modules-core';

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

type NexusMediaNativeModule = {
  scanMusic(limit: number): Promise<NativeMusicTrack[]>;
  resolveArtwork(uri: string, cacheKey: string): Promise<ResolvedArtwork>;
  clearArtworkCache(): Promise<void>;
};

export default requireNativeModule<NexusMediaNativeModule>('NexusMedia');
