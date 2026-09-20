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
  clearPreloadedSource,
  createAudioPlayer,
  getRecordingPermissionsAsync,
  preload,
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

type PlayerActionsContextValue = {
  playTrack: (track: Track) => void;
  hydrateArtworkWindow: (tracks: Track[]) => void;
};

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
  isTransitioning: boolean;
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
  playNext: (track: Track) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (trackId: string) => void;
  clearUpcoming: () => void;
  moveQueueItem: (from: number, to: number) => void;
  scanLibrary: (requestPermission?: boolean) => Promise<void>;
  enableAudioReactive: () => Promise<boolean>;
  hydrateArtworkWindow: (tracks: Track[]) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);
const PlayerActionsContext = createContext<PlayerActionsContextValue | null>(null);

export function PlayerProvider({ children }: PropsWithChildren) {
  const { settings, effectiveVisualQuality } = useNexusSettings();
  const quality = getNexusQualityProfile(effectiveVisualQuality);
  const audioPlayer = useAudioPlayer(null, { updateInterval: effectiveVisualQuality === 'ultra' ? 70 : 100 });
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  const analyzer = useRef(createNexusAudioAnalyzer());
  const lastBandUpdate = useRef(0);
  const lastPublishedBands = useRef<AudioBands>(silentBands);
  const playIntent = useRef(false);
  const notificationAsked = useRef(false);
  const transitionPlayer = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const transitioningRef = useRef(false);
  const handoffRef = useRef<{
    player: ReturnType<typeof createAudioPlayer>;
    trackId: string;
  } | null>(null);
  const preloadedUri = useRef<string | null>(null);
  const artworkHydrated = useRef(new Set<string>());
  const artworkPending = useRef(new Set<string>());
  const artworkQueue = useRef<Track[]>([]);
  const artworkWorkers = useRef(0);
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
  const [isTransitioning, setIsTransitioning] = useState(false);

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
  const theme = useMemo(() => deriveNexusTheme(track.palette), [track.palette]);
  const openPlayer = useCallback(() => setExpanded(true), []);
  const closePlayer = useCallback(() => setExpanded(false), []);

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

  const resolveNextIndex = useCallback(
    (index: number, allowShuffle = true) => {
      if (!queue.length) return -1;
      if (allowShuffle && shuffleEnabled && queue.length > 1) {
        let nextIndex = index;
        while (nextIndex === index) nextIndex = Math.floor(Math.random() * queue.length);
        return nextIndex;
      }
      if (index < queue.length - 1) return index + 1;
      return repeatMode === 'all' ? 0 : -1;
    },
    [queue.length, repeatMode, shuffleEnabled],
  );

  useEffect(() => {
    return () => {
      if (transitionTimer.current) clearInterval(transitionTimer.current);
      transitionPlayer.current?.remove();
      transitionPlayer.current = null;
      if (preloadedUri.current) {
        clearPreloadedSource(preloadedUri.current).catch(() => undefined);
        preloadedUri.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!settings.gapless || !isRealTrack || !queue.length) return;
    const nextIndex = resolveNextIndex(currentIndex, false);
    const nextTrack = nextIndex >= 0 ? queue[nextIndex] : null;
    const nextUri = nextTrack?.uri;
    if (!nextUri || nextUri === preloadedUri.current) return;

    const previous = preloadedUri.current;
    preloadedUri.current = nextUri;
    if (previous) clearPreloadedSource(previous).catch(() => undefined);
    preload(nextUri, {
      preferredForwardBufferDuration: Math.max(8, settings.crossfadeSeconds + 6),
    }).catch(() => {
      if (preloadedUri.current === nextUri) preloadedUri.current = null;
    });
  }, [
    currentIndex,
    isRealTrack,
    queue,
    resolveNextIndex,
    settings.crossfadeSeconds,
    settings.gapless,
  ]);

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

    const next = analyzer.current(sample);
    const previous = lastPublishedBands.current;
    const threshold =
      effectiveVisualQuality === 'low'
        ? 0.055
        : effectiveVisualQuality === 'ultra'
          ? 0.018
          : 0.032;
    const delta = Math.max(
      Math.abs(next.bass - previous.bass),
      Math.abs(next.mid - previous.mid),
      Math.abs(next.high - previous.high),
      Math.abs(next.rms - previous.rms),
    );

    if (delta < threshold && next.transient < 0.16 && previous.transient < 0.16) return;
    lastPublishedBands.current = next;
    setAudioBands(next);
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
    const handoff = handoffRef.current;
    if (!handoff || handoff.trackId !== track.id || !audioStatus.isLoaded) return;

    const secondary = handoff.player;
    const position = Math.max(0, secondary.currentTime);
    let cancelled = false;

    audioPlayer.volume = 0;
    audioPlayer.seekTo(position)
      .then(() => {
        if (cancelled) return;
        audioPlayer.play();
        const startedAt = Date.now();
        const durationMs = 180;
        const timer = setInterval(() => {
          const t = Math.min(1, (Date.now() - startedAt) / durationMs);
          audioPlayer.volume = Math.sin(t * Math.PI * 0.5);
          secondary.volume = Math.cos(t * Math.PI * 0.5);
          if (t >= 1) {
            clearInterval(timer);
            secondary.pause();
            secondary.remove();
            if (transitionPlayer.current === secondary) transitionPlayer.current = null;
            handoffRef.current = null;
            transitioningRef.current = false;
            setIsTransitioning(false);
            audioPlayer.volume = 1;
          }
        }, 30);
      })
      .catch(() => {
        secondary.pause();
        secondary.remove();
        handoffRef.current = null;
        transitionPlayer.current = null;
        transitioningRef.current = false;
        setIsTransitioning(false);
        audioPlayer.volume = 1;
      });

    return () => {
      cancelled = true;
    };
  }, [audioPlayer, audioStatus.isLoaded, track.id]);

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
    if (!audioStatus.didJustFinish || !isRealTrack || transitioningRef.current) return;

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

  const artworkKey = useCallback(
    (item: Track) => item.albumId ? 'album:' + item.albumId : 'track:' + item.id,
    [],
  );

  const pumpArtworkQueue = useCallback(() => {
    while (artworkWorkers.current < 2 && artworkQueue.current.length) {
      const item = artworkQueue.current.shift();
      if (!item) break;
      const key = item.albumId ? 'album:' + item.albumId : 'track:' + item.id;
      artworkWorkers.current += 1;

      resolveTrackArtwork(item)
        .then((resolved) => {
          const applyResolved = (candidate: Track) =>
            candidate.albumId && item.albumId && candidate.albumId === item.albumId
              ? { ...candidate, artworkUri: resolved.artworkUri, palette: resolved.palette }
              : candidate.id === item.id
                ? { ...candidate, artworkUri: resolved.artworkUri, palette: resolved.palette }
                : candidate;

          setQueue((current) => current.map(applyResolved));
          setDeviceTracks((current) => current.map(applyResolved));
          artworkHydrated.current.add(key);
        })
        .catch(() => {
          artworkHydrated.current.add(key);
        })
        .finally(() => {
          artworkPending.current.delete(key);
          artworkWorkers.current = Math.max(0, artworkWorkers.current - 1);
          pumpArtworkQueue();
        });
    }
  }, []);

  const hydrateArtworkWindow = useCallback((items: Track[]) => {
    let queued = false;
    for (const item of items.slice(0, 16)) {
      if (item.source !== 'device' || item.artworkUri) continue;
      const key = artworkKey(item);
      if (artworkHydrated.current.has(key) || artworkPending.current.has(key)) continue;
      artworkPending.current.add(key);
      artworkQueue.current.push(item);
      queued = true;
    }
    if (queued) pumpArtworkQueue();
  }, [artworkKey, pumpArtworkQueue]);

  useEffect(() => {
    hydrateArtworkWindow([track]);
  }, [hydrateArtworkWindow, track]);

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

  const cancelTransition = useCallback(() => {
    if (transitionTimer.current) {
      clearInterval(transitionTimer.current);
      transitionTimer.current = null;
    }
    const secondary = handoffRef.current?.player ?? transitionPlayer.current;
    if (secondary) {
      try {
        secondary.pause();
        secondary.remove();
      } catch {
        // Native player may already have been released during a completed handoff.
      }
    }
    handoffRef.current = null;
    transitionPlayer.current = null;
    transitioningRef.current = false;
    setIsTransitioning(false);
    audioPlayer.volume = 1;
  }, [audioPlayer]);

  const startCrossfade = useCallback(
    (targetIndex: number, requestedSeconds: number) => {
      if (
        transitioningRef.current ||
        targetIndex < 0 ||
        targetIndex >= queue.length ||
        targetIndex === currentIndex
      ) return false;

      const nextTrack = queue[targetIndex];
      if (!isRealTrack || !nextTrack?.uri || !audioStatus.playing) return false;

      const seconds = Math.max(0.22, Math.min(8, requestedSeconds));
      transitioningRef.current = true;
      setIsTransitioning(true);

      const secondary = createAudioPlayer(nextTrack.uri, { updateInterval: 50 });
      transitionPlayer.current?.remove();
      transitionPlayer.current = secondary;
      secondary.volume = 0;
      secondary.play();

      const startedAt = Date.now();
      const durationMs = seconds * 1000;
      if (transitionTimer.current) clearInterval(transitionTimer.current);
      transitionTimer.current = setInterval(() => {
        const t = Math.min(1, (Date.now() - startedAt) / durationMs);
        audioPlayer.volume = Math.cos(t * Math.PI * 0.5);
        secondary.volume = Math.sin(t * Math.PI * 0.5);

        if (t >= 1) {
          if (transitionTimer.current) clearInterval(transitionTimer.current);
          transitionTimer.current = null;
          audioPlayer.pause();
          audioPlayer.volume = 0;
          handoffRef.current = { player: secondary, trackId: nextTrack.id };
          playIntent.current = true;
          setCurrentIndex(targetIndex);
          setDemoProgress(0);
        }
      }, 34);

      return true;
    },
    [audioPlayer, audioStatus.playing, currentIndex, isRealTrack, queue],
  );

  useEffect(() => {
    if (
      !isRealTrack ||
      !audioStatus.playing ||
      settings.crossfadeSeconds <= 0 ||
      repeatMode === 'one' ||
      transitioningRef.current ||
      audioStatus.duration <= settings.crossfadeSeconds + 0.35
    ) return;

    const remaining = audioStatus.duration - audioStatus.currentTime;
    if (remaining > settings.crossfadeSeconds) return;

    const nextIndex = resolveNextIndex(currentIndex, true);
    if (nextIndex >= 0) startCrossfade(nextIndex, settings.crossfadeSeconds);
  }, [
    audioStatus.currentTime,
    audioStatus.duration,
    audioStatus.playing,
    currentIndex,
    isRealTrack,
    repeatMode,
    resolveNextIndex,
    settings.crossfadeSeconds,
    startCrossfade,
    cancelTransition,
  ]);

  const playTrack = useCallback((nextTrack: Track) => {
    if (transitioningRef.current) cancelTransition();
    let index = queue.findIndex((item) => item.id === nextTrack.id);
    let targetQueue = queue;

    if (index < 0) {
      targetQueue = libraryTracks;
      index = targetQueue.findIndex((item) => item.id === nextTrack.id);
      if (index < 0) {
        targetQueue = [nextTrack];
        index = 0;
      }
      setQueue(targetQueue);
    }

    playIntent.current = true;
    ensureNotificationPermission();

    if (targetQueue === queue && index === currentIndex && nextTrack.uri) {
      audioPlayer.play();
      return;
    }

    if (
      targetQueue === queue &&
      settings.crossfadeSeconds > 0 &&
      startCrossfade(index, Math.min(0.72, settings.crossfadeSeconds))
    ) return;

    setCurrentIndex(index);
    setDemoProgress(0);
    if (!nextTrack.uri) setDemoPlaying(true);
  }, [
    audioPlayer,
    currentIndex,
    ensureNotificationPermission,
    libraryTracks,
    queue,
    settings.crossfadeSeconds,
    startCrossfade,
    cancelTransition,
  ]);

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
    if (transitioningRef.current) cancelTransition();
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
  }, [
    audioPlayer,
    audioStatus.playing,
    cancelTransition,
    ensureNotificationPermission,
    isRealTrack,
    track,
  ]);

  const next = useCallback(() => {
    if (transitioningRef.current) cancelTransition();
    const nextIndex = resolveNextIndex(currentIndex, true);
    if (nextIndex < 0) return;
    playIntent.current = isPlaying;

    if (
      settings.crossfadeSeconds > 0 &&
      startCrossfade(nextIndex, Math.min(0.72, settings.crossfadeSeconds))
    ) return;

    setCurrentIndex(nextIndex);
    setDemoProgress(0);
  }, [
    currentIndex,
    isPlaying,
    resolveNextIndex,
    settings.crossfadeSeconds,
    startCrossfade,
  ]);

  const previous = useCallback(() => {
    if (transitioningRef.current) cancelTransition();
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
  }, [
    audioPlayer,
    audioStatus.currentTime,
    cancelTransition,
    isPlaying,
    isRealTrack,
    queue.length,
    repeatMode,
  ]);

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
    theme,
    audioBands,
    waveform,
    audioReactiveEnabled,
    isTransitioning,
    playTrack,
    playQueue,
    togglePlayback,
    next,
    previous,
    seek,
    openPlayer,
    closePlayer,
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
    playNext: (item) => {
      if (item.id === track.id) return;
      setQueue((current) => {
        const activeId = track.id;
        const nextQueue = current.filter((entry) => entry.id !== item.id);
        const activeIndex = nextQueue.findIndex((entry) => entry.id === activeId);
        const insertAt = activeIndex >= 0
          ? activeIndex + 1
          : Math.min(currentIndex + 1, nextQueue.length);
        nextQueue.splice(insertAt, 0, item);
        const restoredActiveIndex = nextQueue.findIndex((entry) => entry.id === activeId);
        if (restoredActiveIndex >= 0) setCurrentIndex(restoredActiveIndex);
        return nextQueue;
      });
    },
    addToQueue: (item) => {
      setQueue((current) => current.some((entry) => entry.id === item.id) ? current : [...current, item]);
    },
    removeFromQueue: (trackId) => {
      if (trackId === track.id) return;
      setQueue((current) => {
        const nextQueue = current.filter((entry) => entry.id !== trackId);
        const activeIndex = nextQueue.findIndex((entry) => entry.id === track.id);
        if (activeIndex >= 0) setCurrentIndex(activeIndex);
        return nextQueue;
      });
    },
    clearUpcoming: () => {
      setQueue((current) => {
        const activeIndex = current.findIndex((entry) => entry.id === track.id);
        if (activeIndex < 0) return current;
        return current.slice(0, activeIndex + 1);
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
    scanLibrary,
    enableAudioReactive,
    hydrateArtworkWindow,
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
    theme,
    audioBands,
    waveform,
    audioReactiveEnabled,
    isTransitioning,
    playTrack,
    playQueue,
    togglePlayback,
    next,
    previous,
    seek,
    openPlayer,
    closePlayer,
    scanLibrary,
    enableAudioReactive,
    hydrateArtworkWindow,
  ]);

  const actions = useMemo<PlayerActionsContextValue>(
    () => ({ playTrack, hydrateArtworkWindow }),
    [hydrateArtworkWindow, playTrack],
  );

  return (
    <PlayerActionsContext.Provider value={actions}>
      <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
    </PlayerActionsContext.Provider>
  );
}

export function usePlayerActions() {
  const context = useContext(PlayerActionsContext);
  if (!context) throw new Error('usePlayerActions must be used inside PlayerProvider');
  return context;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used inside PlayerProvider');
  return context;
}
