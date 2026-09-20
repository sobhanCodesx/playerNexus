import type { NexusPalette } from '@/design/nexus-tokens';

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  year: number;
  palette: NexusPalette;
  favorite?: boolean;
  source?: 'demo' | 'device';
  nativeId?: string;
  uri?: string;
  durationMs?: number;
  albumId?: string;
  artworkUri?: string | null;
  dateAdded?: number;
  folder?: string;
  displayName?: string;
};

export type Album = {
  id: string;
  title: string;
  artist: string;
  year: number;
  palette: NexusPalette;
  trackIds: string[];
  artworkUri?: string | null;
};

export type Artist = {
  id: string;
  name: string;
  palette: NexusPalette;
  monthlyMood: string;
  artworkUri?: string | null;
};

export const tracks: Track[] = [
  { id: 't1', title: 'Afterlight', artist: 'Arden Vale', album: 'Glass Horizon', duration: '4:18', year: 2026, palette: ['#D28B6A', '#5D6B78', '#17222D', '#0A0D11'], favorite: true },
  { id: 't2', title: 'Quiet Gravity', artist: 'Mira North', album: 'Night Geometry', duration: '3:46', year: 2025, palette: ['#B9A6CE', '#465A70', '#17202B', '#090B0F'] },
  { id: 't3', title: 'Cold Bloom', artist: 'Serein', album: 'Aperture', duration: '5:02', year: 2026, palette: ['#7BA7A2', '#D4C4A8', '#33444A', '#0B1012'], favorite: true },
  { id: 't4', title: 'Static Moon', artist: 'Kestrel', album: 'Signals', duration: '4:31', year: 2024, palette: ['#A68A79', '#765D72', '#27313F', '#0A0B0D'] },
  { id: 't5', title: 'Soft Collision', artist: 'Arden Vale', album: 'Glass Horizon', duration: '3:58', year: 2026, palette: ['#DBA66B', '#6F7D73', '#2B3136', '#0A0C0E'] },
  { id: 't6', title: 'Low Orbit', artist: 'Mira North', album: 'Night Geometry', duration: '4:06', year: 2025, palette: ['#7A809E', '#C0A8A0', '#353B50', '#090B10'] },
  { id: 't7', title: 'Velvet Current', artist: 'Serein', album: 'Aperture', duration: '3:37', year: 2026, palette: ['#77988E', '#C69F7E', '#30423F', '#080C0C'] },
  { id: 't8', title: 'Signal / Sleep', artist: 'Kestrel', album: 'Signals', duration: '5:21', year: 2024, palette: ['#9D786F', '#5D6380', '#29313C', '#080A0D'] },
];

export const albums: Album[] = [
  { id: 'a1', title: 'Glass Horizon', artist: 'Arden Vale', year: 2026, palette: tracks[0].palette, trackIds: ['t1', 't5'] },
  { id: 'a2', title: 'Night Geometry', artist: 'Mira North', year: 2025, palette: tracks[1].palette, trackIds: ['t2', 't6'] },
  { id: 'a3', title: 'Aperture', artist: 'Serein', year: 2026, palette: tracks[2].palette, trackIds: ['t3', 't7'] },
  { id: 'a4', title: 'Signals', artist: 'Kestrel', year: 2024, palette: tracks[3].palette, trackIds: ['t4', 't8'] },
];

export const artists: Artist[] = [
  { id: 'ar1', name: 'Arden Vale', palette: tracks[0].palette, monthlyMood: 'Warm nocturne' },
  { id: 'ar2', name: 'Mira North', palette: tracks[1].palette, monthlyMood: 'Slow architecture' },
  { id: 'ar3', name: 'Serein', palette: tracks[2].palette, monthlyMood: 'Organic pulse' },
  { id: 'ar4', name: 'Kestrel', palette: tracks[3].palette, monthlyMood: 'Analog dusk' },
];

export const lyrics = [
  'Stay where the afterlight bends',
  'A quiet line across the room',
  'We move like glass in warmer air',
  'No edges left for us to name',
  'Hold the signal under your breath',
  'Let the night become the frame',
];
