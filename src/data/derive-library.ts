import type { Album, Artist, Track } from './library';

const hashId = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = (Math.imul(31, hash) + value.charCodeAt(i)) | 0;
  return Math.abs(hash).toString(36);
};

export function deriveAlbums(tracks: Track[]): Album[] {
  const groups = new Map<string, Track[]>();
  tracks.forEach((track) => {
    const key = track.artist + '\u0000' + track.album;
    const group = groups.get(key) ?? [];
    group.push(track);
    groups.set(key, group);
  });

  return [...groups.entries()].map(([key, group]) => ({
    id: 'album:' + (group[0].albumId || hashId(key)),
    title: group[0].album,
    artist: group[0].artist,
    year: group.find((track) => track.year)?.year ?? 0,
    palette: group[0].palette,
    artworkUri: group.find((track) => track.artworkUri)?.artworkUri,
    trackIds: group.map((track) => track.id),
  }));
}

export function deriveArtists(tracks: Track[]): Artist[] {
  const groups = new Map<string, Track[]>();
  tracks.forEach((track) => {
    const group = groups.get(track.artist) ?? [];
    group.push(track);
    groups.set(track.artist, group);
  });

  return [...groups.entries()].map(([name, group]) => ({
    id: 'artist:' + hashId(name),
    name,
    palette: group[0].palette,
    artworkUri: group.find((track) => track.artworkUri)?.artworkUri,
    monthlyMood: group.length + (group.length === 1 ? ' track' : ' tracks') + ' on device',
  }));
}
