import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import {
  getRecordingPermissionsAsync,
  requestNotificationPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioSampleListener,
} from 'expo-audio';

import { createNexusAudioAnalyzer, silentBands, type AudioBands } from '@/audio/audio-analysis';
import { deriveAlbums, deriveArtists } from '@/data/derive-library';
import { tracks as demoTracks, type Album, type Artist, type Track } from '@/data/library';
import { deriveNexusTheme } from '@/design/nexus-tokens';
import { getNexusQualityProfile } from '@/design/quality-profile';
import { useNexusSettings } from '@/providers/settings-provider';
import {
  getMusicPermission,
  requestMusicPermission,
  resolveTrackArtwork,
  resolveTrackWaveform,
  scanDeviceMusic,
  type LibraryPermission,
} from '@/services/library-service';
import {
  loadNexusPlaybackSession,
  reconcileTrackOrder,
  saveNexusPlaybackSession,
  type NexusPlaybackSession,
  type NexusRepeatMode,
} from '@/services/session-store';

export type LibraryStatus = 'checking' | 'permission' | 'scanning' | 'ready' | 'empty' | 'error';

type PlayerContextValue = {
  track: Track;
  queue: Track[];
  libraryTracks: Track[];
  libraryAlbums: Album[];
  libraryArtists: Artist[];
  recentTracks: Track[];
  favoriteTracks: Track[];
  playCounts: Record<string, number>;
  shuffleEnabled: boolean;
  repeatMode: NexusRepeatMode;
  libraryStatus: LibraryStatus;
  libraryPermission: LibraryPermission;
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  expanded: boolean;
  favorite: boolean;
  theme: ReturnType<typeof deriveNexusTheme>;
  audioBands: AudioBands;
  waveform: number[];
  audioReactiveEnabled: boolean;
  playTrack: (track: Track) => void;
  playQueue: (tracks: Track[], startTrackId?: string) => void;
  togglePlayback: () => void;
  next: () => void;
  previous: () => void;
  seek: (value: number) => void;
  openPlayer: () => void;
  closePlayer: () => void;
  toggleFavorite: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  moveQueueItem: (from: number, to: number) => void;
  scanLibrary: (requestPermission?: boolean) => Promise<void>;
  enableAudioReactive: () => Promise<boolean>;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: PropsWithChildren) {
  const { settings } = useNexusSettings();
  const quality = getNexusQualityProfile(settings.visualQuality);
  const audioPlayer = useAudioPlayer(null, { updateInterval: settings.visualQuality === 'ultra' ? 70 : 100 });
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  const analyzer = useRef(createNexusAudioAnalyzer());
  const lastBandUpdate = useRef(0);
  const playIntent = useRef(false);
  const notificationAsked = useRef(false);
  const pendingRestore = useRef<{ trackId: string; positionSec: number } | null>(null);
  const lastHistoryTrack = useRef<string | null>(null);
  const sessionPromise = useRef<Promise<NexusPlaybackSession> | null>(null);
  if (!sessionPromise.current) sessionPromise.current = loadNexusPlaybackSession();
  const sessionSnapshot = useRef<{
    currentTrackId: string | null;
    positionSec: number;
    queueIds: string[];
    favoriteIds: string[];
    recentIds: string[];
    playCounts: Record<string, number>;
    shuffleEnabled: boolean;
    repeatMode: NexusRepeatMode;
  }>({
    currentTrackId: null,
    positionSec: 0,
    queueIds: [],
    favoriteIds: [],
    recentIds: [],
    playCounts: {},
    shuffleEnabled: false,
    repeatMode: 'off',
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [queue, setQueue] = useState<Track[]>(demoTracks);
  const [deviceTracks, setDeviceTracks] = useState<Track[]>([]);
  const [demoPlaying, setDemoPlaying] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0.36);
  const [expanded, setExpanded] = useState(false);
  const [favorites, setFavorites] = useState(() => new Set(demoTracks.filter((t) => t.favorite).map((t) => t.id)));
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [playCounts, setPlayCounts] = useState<Record<string, number>>({});
  const [shuffleEnabled, setShuffleEnabled] = useState(false);
  const [repeatMode, setRepeatMode] = useState<NexusRepeatMode>('off');
  const [sessionHydrated, setSessionHydrated] = useState(false);
  const [libraryStatus, setLibraryStatus] = useState<LibraryStatus>('checking');
  const [libraryPermission, setLibraryPermission] = useState<LibraryPermission>('undetermined');
  const [audioBands, setAudioBands] = useState<AudioBands>(silentBands);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [audioReactiveEnabled, setAudioReactiveEnabled] = useState(false);

  const track = queue[currentIndex] ?? queue[0] ?? demoTracks[0];
  const isRealTrack = Boolean(track?.uri && track.source === 'device');
  const isPlaying = isRealTrack ? audioStatus.playing : demoPlaying;
  const duration = isRealTrack
    ? audioStatus.duration || (track.durationMs ?? 0) / 1000
    : (track.durationMs ?? 0) / 1000;
  const currentTime = isRealTrack ? audioStatus.currentTime : demoProgress * duration;
  const progress = isRealTrack && duration > 0
    ? Math.max(0, Math.min(1, audioStatus.currentTime / duration))
    : demoProgress;

  const libraryTracks = deviceTracks.length ? deviceTracks : demoTracks;
  const libraryAlbums = useMemo(() => deriveAlbums(libraryTracks), [libraryTracks]);
  const libraryArtists = useMemo(() => deriveArtists(libraryTracks), [libraryTracks]);
  const recentTracks = useMemo(() => {
    const byId = new Map(libraryTracks.map((item) => [item.id, item] as const));
    return recentIds.map((id) => byId.get(id)).filter((item): item is Track => Boolean(item));
  }, [libraryTracks, recentIds]);
  const favoriteTracks = useMemo(
    () => libraryTracks.filter((item) => favorites.has(item.id)),
    [favorites, libraryTracks],
  );

  useEffect(() => {
    let active = true;
    sessionPromise.current?.then((saved) => {
      if (!active) return;
      if (saved.favoriteIds.length) setFavorites(new Set(saved.favoriteIds));
      setRecentIds(saved.recentIds);
      setPlayCounts(saved.playCounts);
      setShuffleEnabled(saved.shuffleEnabled);
      setRepeatMode(saved.repeatMode);

      const orderedDemo = reconcileTrackOrder(demoTracks, saved.queueIds);
      if (orderedDemo.length) {
        setQueue((current) => current.some((item) => item.source === 'device') ? current : orderedDemo);
        const savedIndex = orderedDemo.findIndex((item) => item.id === saved.currentTrackId);
        if (savedIndex >= 0) {
          setCurrentIndex(savedIndex);
          const label = orderedDemo[savedIndex].duration.split(':');
          const seconds = (Number(label[0]) || 0) * 60 + (Number(label[1]) || 0);
          if (seconds > 0) setDemoProgress(Math.min(1, saved.positionSec / seconds));
        }
      }
      setSessionHydrated(true);
    }).catch(() => setSessionHydrated(true));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    }).catch(() => undefined);
  }, []);

  const scanLibrary = useCallback(async (shouldRequestPermission = true) => {
    try {
      setLibraryStatus('checking');
      let permission = await getMusicPermission();
      if (permission !== 'granted' && shouldRequestPermission) {
        permission = await requestMusicPermission();
      }
      setLibraryPermission(permission);
      if (permission !== 'granted') {
        setLibraryStatus('permission');
        return;
      }

      setLibraryStatus('scanning');
      const scanned = await scanDeviceMusic();
      setDeviceTracks(scanned);
      if (scanned.length) {
        const saved = await sessionPromise.current;
        const restoredQueue = reconcileTrackOrder(scanned, saved?.queueIds ?? []);
        const restoredIndex = Math.max(
          0,
          restoredQueue.findIndex((item) => item.id === saved?.currentTrackId),
        );
        setQueue(restoredQueue);
        setCurrentIndex(restoredIndex);
        setDemoPlaying(false);
        playIntent.current = false;
        if (saved?.currentTrackId && saved.positionSec > 0) {
          pendingRestore.current = {
            trackId: saved.currentTrackId,
            positionSec: saved.positionSec,
          };
        }
        setLibraryStatus('ready');
      } else {
        setLibraryStatus('empty');
      }
    } catch {
      setLibraryStatus('error');
    }
  }, []);

  useEffect(() => {
    scanLibrary(false);
  }, [scanLibrary]);

  useEffect(() => {
    getRecordingPermissionsAsync()
      .then((permission) => setAudioReactiveEnabled(permission.granted))
      .catch(() => undefined);
  }, []);

  const enableAudioReactive = useCallback(async () => {
    try {
      const current = await getRecordingPermissionsAsync();
      if (current.granted) {
        setAudioReactiveEnabled(true);
        return true;
      }
      const requested = await requestRecordingPermissionsAsync();
      setAudioReactiveEnabled(requested.granted);
      return requested.granted;
    } catch {
      return false;
    }
  }, []);

  useAudioSampleListener(audioPlayer, (sample) => {
    if (!audioReactiveEnabled || !audioStatus.playing) return;
    const now = Date.now();
    if (now - lastBandUpdate.current < quality.sampleIntervalMs) return;
    lastBandUpdate.current = now;
    setAudioBands(analyzer.current(sample));
  });

  useEffect(() => {
    if (!audioStatus.playing && audioBands.rms > 0.001) {
      setAudioBands((current) => ({
        bass: current.bass * 0.65,
        mid: current.mid * 0.65,
        high: current.high * 0.6,
        rms: current.rms * 0.62,
        transient: 0,
      }));
    }
  }, [audioStatus.playing, audioBands.rms]);

  useEffect(() => {
    if (!isRealTrack) {
      audioPlayer.pause();
      audioPlayer.setActiveForLockScreen(false);
      return;
    }

    audioPlayer.replace({ uri: track.uri! });
    audioPlayer.setActiveForLockScreen(true, {
      title: track.title,
      artist: track.artist,
      albumTitle: track.album,
      artworkUrl: track.artworkUri ?? undefined,
    });
    if (playIntent.current) audioPlayer.play();
  }, [audioPlayer, isRealTrack, track.id, track.uri]);

  useEffect(() => {
    const restore = pendingRestore.current;
    if (!isRealTrack || !audioStatus.isLoaded || !restore || restore.trackId !== track.id) return;
    pendingRestore.current = null;
    audioPlayer.seekTo(Math.min(restore.positionSec, Math.max(0, audioStatus.duration - 0.25))).catch(() => undefined);
  }, [audioPlayer, audioStatus.duration, audioStatus.isLoaded, isRealTrack, track.id]);

  useEffect(() => {
    if (!isRealTrack) return;
    audioPlayer.setActiveForLockScreen(true, {
      title: track.title,
      artist: track.artist,
      albumTitle: track.album,
      artworkUrl: track.artworkUri ?? undefined,
    });
  }, [audioPlayer, isRealTrack, track.title, track.artist, track.album, track.artworkUri]);

  useEffect(() => {
    if (!audioStatus.didJustFinish || !isRealTrack) return;

    if (repeatMode === 'one') {
      playIntent.current = true;
      audioPlayer.seekTo(0).then(() => audioPlayer.play()).catch(() => undefined);
      return;
    }

    if (shuffleEnabled && queue.length > 1) {
      playIntent.current = true;
      setCurrentIndex((index) => {
        let nextIndex = index;
        while (nextIndex === index) nextIndex = Math.floor(Math.random() * queue.length);
        return nextIndex;
      });
      return;
    }

    setCurrentIndex((index) => {
      if (index < queue.length - 1) {
        playIntent.current = true;
        return index + 1;
      }
      if (repeatMode === 'all') {
        playIntent.current = true;
        return 0;
      }
      playIntent.current = false;
      return index;
    });
  }, [
    audioPlayer,
    audioStatus.didJustFinish,
    isRealTrack,
    queue.length,
    repeatMode,
    shuffleEnabled,
  ]);

  useEffect(() => {
    let cancelled = false;
    setWaveform([]);
    resolveTrackWaveform(track, 52)
      .then((values) => {
        if (!cancelled) setWaveform(values);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [track.id, track.uri, track.source]);

  useEffect(() => {
    if (!track || track.source !== 'device' || track.artworkUri) return;
    let cancelled = false;
    resolveTrackArtwork(track)
      .then((resolved) => {
        if (cancelled) return;
        setQueue((current) =>
          current.map((item) =>
            item.albumId && item.albumId === track.albumId
              ? { ...item, artworkUri: resolved.artworkUri, palette: resolved.palette }
              : item.id === track.id
                ? { ...item, artworkUri: resolved.artworkUri, palette: resolved.palette }
                : item,
          ),
        );
        setDeviceTracks((current) =>
          current.map((item) =>
            item.albumId && item.albumId === track.albumId
              ? { ...item, artworkUri: resolved.artworkUri, palette: resolved.palette }
              : item.id === track.id
                ? { ...item, artworkUri: resolved.artworkUri, palette: resolved.palette }
                : item,
          ),
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [track.id, track.albumId, track.artworkUri, track.source]);

  useEffect(() => {
    if (!isPlaying || lastHistoryTrack.current === track.id) return;
    lastHistoryTrack.current = track.id;
    setRecentIds((current) => [track.id, ...current.filter((id) => id !== track.id)].slice(0, 40));
    setPlayCounts((current) => ({
      ...current,
      [track.id]: (current[track.id] ?? 0) + 1,
    }));
  }, [isPlaying, track.id]);

  useEffect(() => {
    if (!sessionHydrated) return;
    sessionSnapshot.current = {
      currentTrackId: track.id,
      positionSec: currentTime,
      queueIds: queue.map((item) => item.id),
      favoriteIds: [...favorites],
      recentIds,
      playCounts,
      shuffleEnabled,
      repeatMode,
    };
  }, [
    currentTime,
    favorites,
    playCounts,
    queue,
    recentIds,
    repeatMode,
    sessionHydrated,
    shuffleEnabled,
    track.id,
  ]);

  useEffect(() => {
    if (!sessionHydrated) return;
    const persist = () => saveNexusPlaybackSession(sessionSnapshot.current).catch(() => undefined);
    const interval = setInterval(persist, 5000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') persist();
    });
    return () => {
      clearInterval(interval);
      subscription.remove();
      persist();
    };
  }, [sessionHydrated]);

  const ensureNotificationPermission = useCallback(() => {
    if (Platform.OS !== 'android' || notificationAsked.current) return;
    notificationAsked.current = true;
    requestNotificationPermissionsAsync().catch(() => undefined);
  }, []);

  const playTrack = useCallback((nextTrack: Track) => {
    const index = queue.findIndex((item) => item.id === nextTrack.id);
    playIntent.current = true;
    if (index >= 0) {
      if (index === currentIndex && nextTrack.uri) {
        ensureNotificationPermission();
        audioPlayer.play();
      } else {
        setCurrentIndex(index);
      }
    }
    if (!nextTrack.uri) setDemoPlaying(true);
  }, [audioPlayer, currentIndex, ensureNotificationPermission, queue]);

  const playQueue = useCallback((tracks: Track[], startTrackId?: string) => {
    if (!tracks.length) return;
    const startIndex = Math.max(
      0,
      startTrackId ? tracks.findIndex((item) => item.id === startTrackId) : 0,
    );
    playIntent.current = true;
    setQueue(tracks);
    setCurrentIndex(startIndex);
    setDemoProgress(0);
    if (!tracks[startIndex]?.uri) setDemoPlaying(true);
  }, []);

  const togglePlayback = useCallback(() => {
    if (isRealTrack) {
      if (audioStatus.playing) {
        playIntent.current = false;
        audioPlayer.pause();
      } else {
        playIntent.current = true;
        ensureNotificationPermission();
        audioPlayer.setActiveForLockScreen(true, {
          title: track.title,
          artist: track.artist,
          albumTitle: track.album,
          artworkUrl: track.artworkUri ?? undefined,
        });
        audioPlayer.play();
      }
      return;
    }
    setDemoPlaying((playing) => {
      playIntent.current = !playing;
      return !playing;
    });
  }, [audioPlayer, audioStatus.playing, ensureNotificationPermission, isRealTrack, track]);

  const next = useCallback(() => {
    playIntent.current = isPlaying;
    setCurrentIndex((index) => {
      if (shuffleEnabled && queue.length > 1) {
        let nextIndex = index;
        while (nextIndex === index) nextIndex = Math.floor(Math.random() * queue.length);
        return nextIndex;
      }
      if (index < queue.length - 1) return index + 1;
      return repeatMode === 'all' ? 0 : index;
    });
    setDemoProgress(0);
  }, [isPlaying, queue.length, repeatMode, shuffleEnabled]);

  const previous = useCallback(() => {
    if (isRealTrack && audioStatus.currentTime > 4) {
      audioPlayer.seekTo(0).catch(() => undefined);
      return;
    }
    playIntent.current = isPlaying;
    setCurrentIndex((index) => {
      if (index > 0) return index - 1;
      return repeatMode === 'all' ? Math.max(0, queue.length - 1) : 0;
    });
    setDemoProgress(0);
  }, [audioPlayer, audioStatus.currentTime, isPlaying, isRealTrack, queue.length, repeatMode]);

  const seek = useCallback((value: number) => {
    const normalized = Math.min(1, Math.max(0, value));
    if (isRealTrack && duration > 0) {
      audioPlayer.seekTo(normalized * duration).catch(() => undefined);
    } else {
      setDemoProgress(normalized);
    }
  }, [audioPlayer, duration, isRealTrack]);

  const value = useMemo<PlayerContextValue>(() => ({
    track,
    queue,
    libraryTracks,
    libraryAlbums,
    libraryArtists,
    recentTracks,
    favoriteTracks,
    playCounts,
    shuffleEnabled,
    repeatMode,
    libraryStatus,
    libraryPermission,
    isPlaying,
    progress,
    currentTime,
    duration,
    expanded,
    favorite: favorites.has(track.id),
    theme: deriveNexusTheme(track.palette),
    audioBands,
    waveform,
    audioReactiveEnabled,
    playTrack,
    playQueue,
    togglePlayback,
    next,
    previous,
    seek,
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
    toggleShuffle: () => setShuffleEnabled((current) => !current),
    toggleRepeat: () =>
      setRepeatMode((current) => current === 'off' ? 'all' : current === 'all' ? 'one' : 'off'),
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
    scanLibrary,
    enableAudioReactive,
  }), [
    track,
    queue,
    libraryTracks,
    libraryAlbums,
    libraryArtists,
    recentTracks,
    favoriteTracks,
    playCounts,
    shuffleEnabled,
    repeatMode,
    libraryStatus,
    libraryPermission,
    isPlaying,
    progress,
    currentTime,
    duration,
    expanded,
    favorites,
    audioBands,
    waveform,
    audioReactiveEnabled,
    playTrack,
    playQueue,
    togglePlayback,
    next,
    previous,
    seek,
    scanLibrary,
    enableAudioReactive,
  ]);

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used inside PlayerProvider');
  return context;
}
