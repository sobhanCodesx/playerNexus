import {
  createContext,
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
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
import {
  getMusicPermission,
  requestMusicPermission,
  resolveTrackArtwork,
  scanDeviceMusic,
  type LibraryPermission,
} from '@/services/library-service';

export type LibraryStatus = 'checking' | 'permission' | 'scanning' | 'ready' | 'empty' | 'error';

type PlayerContextValue = {
  track: Track;
  queue: Track[];
  libraryTracks: Track[];
  libraryAlbums: Album[];
  libraryArtists: Artist[];
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
  audioReactiveEnabled: boolean;
  playTrack: (track: Track) => void;
  togglePlayback: () => void;
  next: () => void;
  previous: () => void;
  seek: (value: number) => void;
  openPlayer: () => void;
  closePlayer: () => void;
  toggleFavorite: () => void;
  moveQueueItem: (from: number, to: number) => void;
  scanLibrary: (requestPermission?: boolean) => Promise<void>;
  enableAudioReactive: () => Promise<boolean>;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: PropsWithChildren) {
  const audioPlayer = useAudioPlayer(null, { updateInterval: 100 });
  const audioStatus = useAudioPlayerStatus(audioPlayer);
  const analyzer = useRef(createNexusAudioAnalyzer());
  const lastBandUpdate = useRef(0);
  const playIntent = useRef(false);
  const notificationAsked = useRef(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [queue, setQueue] = useState<Track[]>(demoTracks);
  const [deviceTracks, setDeviceTracks] = useState<Track[]>([]);
  const [demoPlaying, setDemoPlaying] = useState(false);
  const [demoProgress, setDemoProgress] = useState(0.36);
  const [expanded, setExpanded] = useState(false);
  const [favorites, setFavorites] = useState(() => new Set(demoTracks.filter((t) => t.favorite).map((t) => t.id)));
  const [libraryStatus, setLibraryStatus] = useState<LibraryStatus>('checking');
  const [libraryPermission, setLibraryPermission] = useState<LibraryPermission>('undetermined');
  const [audioBands, setAudioBands] = useState<AudioBands>(silentBands);
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

  const libraryTracks = deviceTracks.length ? deviceTracks : queue;
  const libraryAlbums = useMemo(() => deriveAlbums(libraryTracks), [libraryTracks]);
  const libraryArtists = useMemo(() => deriveArtists(libraryTracks), [libraryTracks]);

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
        setQueue(scanned);
        setCurrentIndex(0);
        setDemoPlaying(false);
        playIntent.current = false;
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
    if (now - lastBandUpdate.current < 32) return;
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
    if (!isRealTrack) return;
    audioPlayer.setActiveForLockScreen(true, {
      title: track.title,
      artist: track.artist,
      albumTitle: track.album,
      artworkUrl: track.artworkUri ?? undefined,
    });
  }, [audioPlayer, isRealTrack, track.title, track.artist, track.album, track.artworkUri]);

  useEffect(() => {
    if (audioStatus.didJustFinish && isRealTrack) {
      playIntent.current = true;
      setCurrentIndex((index) => (index + 1) % Math.max(1, queue.length));
    }
  }, [audioStatus.didJustFinish, isRealTrack, queue.length]);

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
    setCurrentIndex((index) => (index + 1) % Math.max(1, queue.length));
    setDemoProgress(0);
  }, [isPlaying, queue.length]);

  const previous = useCallback(() => {
    if (isRealTrack && audioStatus.currentTime > 4) {
      audioPlayer.seekTo(0).catch(() => undefined);
      return;
    }
    playIntent.current = isPlaying;
    setCurrentIndex((index) => (index - 1 + queue.length) % Math.max(1, queue.length));
    setDemoProgress(0);
  }, [audioPlayer, audioStatus.currentTime, isPlaying, isRealTrack, queue.length]);

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
    audioReactiveEnabled,
    playTrack,
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
    libraryStatus,
    libraryPermission,
    isPlaying,
    progress,
    currentTime,
    duration,
    expanded,
    favorites,
    audioBands,
    audioReactiveEnabled,
    playTrack,
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
