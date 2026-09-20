import type { Album, Artist, Track } from '@/data/library';
import type { NexusPlaylist } from '@/providers/collections-provider';

export type FolderSearchItem = { name: string; count: number };

const normalize = (value: string) =>
  value
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const textScore = (value: string, query: string, weights: [number, number, number]) => {
  const normalized = normalize(value);
  if (!normalized || !query) return 0;
  if (normalized === query) return weights[0];
  if (normalized.startsWith(query)) return weights[1];
  if (normalized.includes(query)) return weights[2];
  return 0;
};

export function rankTracks(
  tracks: Track[],
  query: string,
  playCounts: Record<string, number>,
  recentIds: string[],
  limit = 18,
) {
  const q = normalize(query);
  if (!q) return [];

  const recency = new Map(recentIds.map((id, index) => [id, Math.max(0, 14 - index)] as const));

  return tracks
    .map((track) => {
      const score =
        textScore(track.title, q, [150, 105, 66]) +
        textScore(track.artist, q, [112, 74, 45]) +
        textScore(track.album, q, [88, 58, 34]) +
        textScore(track.folder ?? '', q, [30, 22, 14]) +
        Math.min(22, Math.log2((playCounts[track.id] ?? 0) + 1) * 5) +
        (recency.get(track.id) ?? 0);
      return { item: track, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit);
}

export function rankAlbums(albums: Album[], query: string, limit = 10) {
  const q = normalize(query);
  if (!q) return [];
  return albums
    .map((album) => ({
      item: album,
      score:
        textScore(album.title, q, [130, 92, 58]) +
        textScore(album.artist, q, [96, 64, 38]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, limit);
}

export function rankArtists(artists: Artist[], query: string, limit = 10) {
  const q = normalize(query);
  if (!q) return [];
  return artists
    .map((artist) => ({
      item: artist,
      score:
        textScore(artist.name, q, [140, 100, 62]) +
        textScore(artist.monthlyMood, q, [28, 20, 12]),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit);
}

export function rankPlaylists(playlists: NexusPlaylist[], query: string, limit = 8) {
  const q = normalize(query);
  if (!q) return [];
  return playlists
    .map((playlist) => ({
      item: playlist,
      score: textScore(playlist.name, q, [125, 88, 54]) + Math.min(12, playlist.trackIds.length),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || b.item.updatedAt - a.item.updatedAt)
    .slice(0, limit);
}

export function rankFolders(folders: FolderSearchItem[], query: string, limit = 8) {
  const q = normalize(query);
  if (!q) return [];
  return folders
    .map((folder) => {
      const leaf = folder.name.split('/').filter(Boolean).at(-1) ?? folder.name;
      return {
        item: folder,
        score:
          textScore(leaf, q, [110, 78, 48]) +
          textScore(folder.name, q, [66, 44, 28]) +
          Math.min(10, Math.log2(folder.count + 1) * 2),
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, limit);
}
