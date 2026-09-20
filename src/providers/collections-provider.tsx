import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type NexusPlaylist = {
  id: string;
  name: string;
  trackIds: string[];
  createdAt: number;
  updatedAt: number;
};

type CollectionsContextValue = {
  hydrated: boolean;
  playlists: NexusPlaylist[];
  createPlaylist: (name: string) => string;
  renamePlaylist: (id: string, name: string) => void;
  deletePlaylist: (id: string) => void;
  addTrack: (playlistId: string, trackId: string) => void;
  removeTrack: (playlistId: string, trackId: string) => void;
  toggleTrack: (playlistId: string, trackId: string) => void;
  moveTrack: (playlistId: string, from: number, to: number) => void;
};

const KEY = 'nexus.collections.v1';
const CollectionsContext = createContext<CollectionsContextValue | null>(null);

const makeId = () =>
  'playlist-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);

export function NexusCollectionsProvider({ children }: PropsWithChildren) {
  const [hydrated, setHydrated] = useState(false);
  const [playlists, setPlaylists] = useState<NexusPlaylist[]>([]);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!active || !raw) return;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        setPlaylists(
          parsed
            .filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string')
            .map((item) => ({
              id: item.id,
              name: item.name,
              trackIds: Array.isArray(item.trackIds)
                ? item.trackIds.filter((id: unknown): id is string => typeof id === 'string')
                : [],
              createdAt: Number(item.createdAt) || Date.now(),
              updatedAt: Number(item.updatedAt) || Date.now(),
            })),
        );
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setHydrated(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(KEY, JSON.stringify(playlists)).catch(() => undefined);
  }, [hydrated, playlists]);

  const createPlaylist = useCallback((name: string) => {
    const id = makeId();
    const now = Date.now();
    setPlaylists((current) => [
      { id, name: name.trim() || 'Untitled', trackIds: [], createdAt: now, updatedAt: now },
      ...current,
    ]);
    return id;
  }, []);

  const renamePlaylist = useCallback((id: string, name: string) => {
    const next = name.trim();
    if (!next) return;
    setPlaylists((current) =>
      current.map((playlist) =>
        playlist.id === id ? { ...playlist, name: next, updatedAt: Date.now() } : playlist,
      ),
    );
  }, []);

  const deletePlaylist = useCallback((id: string) => {
    setPlaylists((current) => current.filter((playlist) => playlist.id !== id));
  }, []);

  const addTrack = useCallback((playlistId: string, trackId: string) => {
    setPlaylists((current) =>
      current.map((playlist) =>
        playlist.id === playlistId && !playlist.trackIds.includes(trackId)
          ? { ...playlist, trackIds: [...playlist.trackIds, trackId], updatedAt: Date.now() }
          : playlist,
      ),
    );
  }, []);

  const removeTrack = useCallback((playlistId: string, trackId: string) => {
    setPlaylists((current) =>
      current.map((playlist) =>
        playlist.id === playlistId
          ? {
              ...playlist,
              trackIds: playlist.trackIds.filter((id) => id !== trackId),
              updatedAt: Date.now(),
            }
          : playlist,
      ),
    );
  }, []);

  const toggleTrack = useCallback((playlistId: string, trackId: string) => {
    setPlaylists((current) =>
      current.map((playlist) => {
        if (playlist.id !== playlistId) return playlist;
        const exists = playlist.trackIds.includes(trackId);
        return {
          ...playlist,
          trackIds: exists
            ? playlist.trackIds.filter((id) => id !== trackId)
            : [...playlist.trackIds, trackId],
          updatedAt: Date.now(),
        };
      }),
    );
  }, []);

  const moveTrack = useCallback((playlistId: string, from: number, to: number) => {
    setPlaylists((current) =>
      current.map((playlist) => {
        if (
          playlist.id !== playlistId ||
          from === to ||
          from < 0 ||
          to < 0 ||
          from >= playlist.trackIds.length ||
          to >= playlist.trackIds.length
        ) return playlist;
        const trackIds = [...playlist.trackIds];
        const [item] = trackIds.splice(from, 1);
        trackIds.splice(to, 0, item);
        return { ...playlist, trackIds, updatedAt: Date.now() };
      }),
    );
  }, []);

  const value = useMemo<CollectionsContextValue>(
    () => ({
      hydrated,
      playlists,
      createPlaylist,
      renamePlaylist,
      deletePlaylist,
      addTrack,
      removeTrack,
      toggleTrack,
      moveTrack,
    }),
    [
      addTrack,
      createPlaylist,
      deletePlaylist,
      hydrated,
      moveTrack,
      playlists,
      removeTrack,
      renamePlaylist,
      toggleTrack,
    ],
  );

  return <CollectionsContext.Provider value={value}>{children}</CollectionsContext.Provider>;
}

export function useNexusCollections() {
  const context = useContext(CollectionsContext);
  if (!context) throw new Error('useNexusCollections must be used inside NexusCollectionsProvider');
  return context;
}
