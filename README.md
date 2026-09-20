# NEXUS PLAYER

A local-first Android music experience built with React Native, Expo, TypeScript and Expo Router.

**Design principle:** *Music should become the interface.*

Nexus Player is built around an original visual system called **Nexus Glass Engine**. Artwork-derived atmosphere, material depth, motion and tactile controls are treated as part of playback rather than decoration.

## Current implementation

The current `main` branch contains the first production UI/motion foundation:

- cinematic Home with a large Continue Listening object, cover-flow history, album grid, artist rail and favorites stack;
- persistent Mini Player that interactively morphs into the full Now Playing environment;
- Now Playing with Nexus Aura, Nexus Orb, custom waveform seek surface and non-template controls;
- artwork gestures for next/previous, favorite, queue access and player collapse/expand;
- Library views for songs, albums, artists, playlists and folders;
- Album and Artist detail experiences;
- instant Search over the current local index adapter;
- reorderable Queue;
- focus-based Lyrics mode;
- Settings surfaces for appearance, playback, haptics and visualizer quality;
- dynamic artwork palette roles and contrast moderation;
- reusable Nexus primitives and motion tokens.

The UI currently runs against seeded local demo metadata in `src/data/library.ts`. It does **not** claim that device audio scanning or playback is connected yet.

## Native audio phase

The next native integration layer should connect Expo SDK 57-compatible modules with a regenerated lockfile:

1. Android media permission and local audio discovery.
2. Metadata and artwork cache.
3. Real playback queue, position and background controls.
4. Audio-reactive analysis feeding Nexus Orb / visualizer.
5. Artwork palette extraction feeding the dynamic theme.
6. Haptics and Android blur/refraction fallbacks.
7. Persisted settings, folder scopes and first-run onboarding.

Presentation code should not import device media APIs directly. Keep scanning/playback behind services or adapters so Development Build-specific code stays isolated from the Nexus UI layer.

## Architecture

```text
src/
  app/                    Expo Router screens
  components/nexus/       Nexus UI primitives + player shell
  data/                   current demo library adapter
  design/                 tokens and palette derivation
  providers/              player/application state
docs/
  NEXUS_GLASS_ENGINE.md   product, material, motion and performance rules
```

Important primitives include:

- `NexusSurface`
- `NexusArtwork`
- `NexusAura`
- `NexusOrb`
- `NexusWaveform`
- `NexusIconButton`
- `NexusPlayerLayer`
- `NexusDock`

## Development

```bash
npm install
npm run android
```

For native media/audio work, use a Development Build / Prebuild rather than assuming Expo Go can expose every Android playback capability.

## Product rules

- interaction moments may be expressive; idle states must be calm;
- atmosphere is derived from music, never generic purple/blue neon;
- no card-inside-card dashboards;
- no full-screen permanent heavy blur;
- visual hierarchy should come from spacing, typography and depth before borders;
- every animation must communicate continuity, state, physics or feedback;
- Now Playing is the most expressive surface; utility screens intentionally stay calmer;
- 60 FPS is the minimum experience target, with adaptive quality for higher refresh displays.

See [docs/NEXUS_GLASS_ENGINE.md](docs/NEXUS_GLASS_ENGINE.md) for the design contract.
