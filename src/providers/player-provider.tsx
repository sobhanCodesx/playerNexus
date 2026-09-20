import { createContext, PropsWithChildren, useContext, useMemo, useState } from 'react';

import { tracks, type Track } from '@/data/library';
import { deriveNexusTheme } from '@/design/nexus-tokens';

type PlayerContextValue = {
  track: Track;
  queue: Track[];
  isPlaying: boolean;
  progress: number;
  expanded: boolean;
  favorite: boolean;
  theme: ReturnType<typeof deriveNexusTheme>;
  playTrack: (track: Track) => void;
  togglePlayback: () => void;
  next: () => void;
  previous: () => void;
  seek: (value: number) => void;
  openPlayer: () => void;
  closePlayer: () => void;
  toggleFavorite: () => void;
  moveQueueItem: (from: number, to: number) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: PropsWithChildren) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [queue, setQueue] = useState(tracks);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0.36);
  const [expanded, setExpanded] = useState(false);
  const [favorites, setFavorites] = useState(() => new Set(tracks.filter((t) => t.favorite).map((t) => t.id)));
  const track = queue[currentIndex] ?? tracks[0];

  const value = useMemo<PlayerContextValue>(() => ({
    track,
    queue,
    isPlaying,
    progress,
    expanded,
    favorite: favorites.has(track.id),
    theme: deriveNexusTheme(track.palette),
    playTrack: (nextTrack) => {
      const index = queue.findIndex((item) => item.id === nextTrack.id);
      if (index >= 0) setCurrentIndex(index);
      setProgress(0);
      setIsPlaying(true);
    },
    togglePlayback: () => setIsPlaying((v) => !v),
    next: () => {
      setCurrentIndex((i) => (i + 1) % queue.length);
      setProgress(0);
    },
    previous: () => {
      setCurrentIndex((i) => (i - 1 + queue.length) % queue.length);
      setProgress(0);
    },
    seek: (value) => setProgress(Math.min(1, Math.max(0, value))),
    openPlayer: () => setExpanded(true),
    closePlayer: () => setExpanded(false),
    toggleFavorite: () => {
      setFavorites((current) => {
        const copy = new Set(current);
        if (copy.has(track.id)) copy.delete(track.id);
        else copy.add(track.id);
        return copy;
      });
    },
    moveQueueItem: (from, to) => {
      const activeId = track.id;
      setQueue((current) => {
        if (from === to || from < 0 || to < 0 || from >= current.length || to >= current.length) return current;
        const copy = [...current];
        const [item] = copy.splice(from, 1);
        copy.splice(to, 0, item);
        const activeIndex = copy.findIndex((entry) => entry.id === activeId);
        if (activeIndex >= 0) setCurrentIndex(activeIndex);
        return copy;
      });
    },
  }), [track, queue, isPlaying, progress, expanded, favorites]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used inside PlayerProvider');
  return context;
}
