import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'nexus.playback-session.v1';

export type NexusRepeatMode = 'off' | 'all' | 'one';

export type NexusPlaybackSession = {
  currentTrackId: string | null;
  positionSec: number;
  queueIds: string[];
  favoriteIds: string[];
  recentIds: string[];
  playCounts: Record<string, number>;
  shuffleEnabled: boolean;
  repeatMode: NexusRepeatMode;
  updatedAt: number;
};

const emptySession = (): NexusPlaybackSession => ({
  currentTrackId: null,
  positionSec: 0,
  queueIds: [],
  favoriteIds: [],
  recentIds: [],
  playCounts: {},
  shuffleEnabled: false,
  repeatMode: 'off',
  updatedAt: 0,
});

export async function loadNexusPlaybackSession(): Promise<NexusPlaybackSession> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptySession();
    const parsed = JSON.parse(raw) as Partial<NexusPlaybackSession>;
    return {
      currentTrackId: typeof parsed.currentTrackId === 'string' ? parsed.currentTrackId : null,
      positionSec: Number.isFinite(parsed.positionSec) ? Math.max(0, Number(parsed.positionSec)) : 0,
      queueIds: Array.isArray(parsed.queueIds) ? parsed.queueIds.filter((id): id is string => typeof id === 'string') : [],
      favoriteIds: Array.isArray(parsed.favoriteIds) ? parsed.favoriteIds.filter((id): id is string => typeof id === 'string') : [],
      recentIds: Array.isArray(parsed.recentIds) ? parsed.recentIds.filter((id): id is string => typeof id === 'string').slice(0, 40) : [],
      playCounts: parsed.playCounts && typeof parsed.playCounts === 'object'
        ? Object.fromEntries(
            Object.entries(parsed.playCounts)
              .filter(([id, count]) => typeof id === 'string' && Number.isFinite(count))
              .map(([id, count]) => [id, Math.max(0, Number(count))]),
          )
        : {},
      shuffleEnabled: parsed.shuffleEnabled === true,
      repeatMode: parsed.repeatMode === 'all' || parsed.repeatMode === 'one' ? parsed.repeatMode : 'off',
      updatedAt: Number.isFinite(parsed.updatedAt) ? Number(parsed.updatedAt) : 0,
    };
  } catch {
    return emptySession();
  }
}

export async function saveNexusPlaybackSession(
  session: Omit<NexusPlaybackSession, 'updatedAt'>,
) {
  const payload: NexusPlaybackSession = {
    ...session,
    queueIds: session.queueIds.slice(0, 5000),
    favoriteIds: session.favoriteIds.slice(0, 5000),
    recentIds: session.recentIds.slice(0, 40),
    updatedAt: Date.now(),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(payload));
}

export function reconcileTrackOrder<T extends { id: string }>(
  tracks: T[],
  savedIds: string[],
): T[] {
  if (!savedIds.length) return tracks;
  const byId = new Map(tracks.map((track) => [track.id, track] as const));
  const ordered: T[] = [];
  for (const id of savedIds) {
    const match = byId.get(id);
    if (match) {
      ordered.push(match);
      byId.delete(id);
    }
  }
  for (const track of tracks) {
    if (byId.has(track.id)) {
      ordered.push(track);
      byId.delete(track.id);
    }
  }
  return ordered;
}
