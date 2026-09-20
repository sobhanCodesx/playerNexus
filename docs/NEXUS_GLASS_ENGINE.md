# Nexus Glass Engine

Nexus Glass Engine is the internal product language for Nexus Player. Its rule is simple:

> Music should become the interface.

The system is not generic glassmorphism. It treats artwork, playback state, gesture velocity and audio energy as inputs that shape light, depth and motion.

## Material hierarchy

1. **Atmosphere** — the lowest layer. Album-derived color bodies move slowly behind content. They never carry interaction.
2. **Content objects** — artwork, artist imagery and the Nexus Orb. These receive the strongest depth and are allowed to feel physical.
3. **Glass controls** — navigation, player controls and compact actions. Transparency is restrained and edge highlights are more important than blur.
4. **Text** — remains optically stable. Ambient color must never lower legibility.
5. **Transient light** — playback wake, press response and gesture feedback. It appears during interaction and settles quickly.

Avoid borders around every surface. A Nexus surface earns an edge highlight only when it needs separation from the atmosphere.

## Dynamic color contract

Artwork contributes 3–5 sampled colors. The runtime must derive, rather than directly reuse, these roles:

- **Primary Ambient** — a moderated midtone used in Aura bodies.
- **Secondary Glow** — a restrained highlight, never a neon outline.
- **Background Tint** — the darkest artwork relation mixed toward obsidian.
- **Accent** — a high-contrast color for one meaningful state at a time.
- **Glass Tint** — artwork hue pushed heavily toward dark neutral.
- **Text Contrast** — white/ink selection based on measured luminance.

Bright covers are darkened before becoming atmosphere. Very dark covers receive lifted midtones, not white glow.

## Spatial signature

### Nexus Artwork
Artwork behaves as an object, not an image card. It owns perspective, layered shadow, tiny playback breathing and a controlled reflective edge.

### Nexus Aura
Aura is a 2–3 body light field, not a radial glow. Playback changes amplitude and velocity, not color saturation. Pause never freezes hard; it settles into a slower state.

### Nexus Orb
The Orb is the recognizable visualizer object. Its production audio mapping is:

- 30–120 Hz: volume / pulse.
- 120 Hz–2 kHz: shape deformation.
- 2–12 kHz: fine shimmer / refraction.
- transients: short internal light displacement.

The fallback implementation uses playback-state deformation until a native frequency analyzer is connected.

## Motion language

| Category | Range | Character | Purpose |
| --- | --- | --- | --- |
| Micro feedback | 120–220 ms | tight spring / ease-out | confirm touch |
| Navigation | 280–420 ms | decelerating | preserve orientation |
| Shared / hero | 450–700 ms | physical spring | show object continuity |
| Playback wake | 700–1400 ms | expressive then settle | make play feel consequential |
| Ambient | 4–15 s | sine / very soft | keep the environment alive |
| Gesture response | direct | 1:1 until release | make surfaces feel attached |

The Mini Player → Now Playing transition must be continuously driven by gesture progress. It is never implemented as “close one screen, open another.”

## Gesture contract

Artwork gestures use direction locks to prevent accidental actions:

- left: next; minimum intent about 54 dp or high horizontal velocity.
- right: previous; same threshold.
- down on full player: collapse; release threshold about 28–38% of travel or decisive velocity.
- up on mini player: expand with the inverse threshold.
- double tap: favorite.
- long press (~520 ms): quick path to queue/actions.

Every destructive or mode-changing gesture must expose visible motion before it commits.

## Haptic language

- Play / pause: soft physical confirmation.
- Next / previous: light impact.
- Favorite: stronger confirmation only when state changes.
- Queue lift: one selection tick at pickup.
- Seek: very sparse ticks; never vibrate continuously.
- Navigation: usually silent.

Native Expo Haptics should replace the current Android vibration fallback when the native audio dependency pass is installed.

## Typography and spacing

Large display type is reserved for song, album and artist identity. Utility UI uses compact uppercase micro labels with increased tracking. Body copy stays short.

Spacing is based on a 4 dp unit and favors open negative space around hero objects. Repeated rounded cards are prohibited; layouts should use typography and spatial grouping before containers.

## Screen hierarchy

- **Now Playing** — highest expression; full Aura, Orb and physical artwork.
- **Home** — editorial and cinematic; one hero, varied section geometries.
- **Album / Artist / Lyrics** — immersive but calmer.
- **Library / Search / Queue / Settings** — fast, low-latency and materially restrained.

This difference is intentional. The product should not visually shout on every screen.

## Adaptive performance

The visual system exposes three quality tiers:

- **Low** — one Aura body, no continuous shimmer, reduced deformation.
- **Balanced** — two Aura bodies, normal Orb deformation, cached artwork effects.
- **Ultra** — full light field and high-frequency detail where frame budget allows.

All interaction-critical animation belongs on Reanimated worklets. Lists must be virtualized when connected to real libraries. Artwork should be resized near display dimensions and cached. No full-screen heavy blur should rerender every frame.

## Accessibility invariants

- Android touch targets should be at least 44–48 dp.
- Color is never the only state indicator.
- Text remains readable if dynamic color extraction produces extreme palettes.
- Reduce Motion preserves hierarchy and state changes while removing parallax, breathing and long ambient drift.
- Screen reader labels describe action and current state, not icon names.
- Font scaling is supported to a controlled maximum so hero layouts remain usable.

## Native audio integration boundary

The current UI layer intentionally does not pretend mock data is device audio. The native pass should install the Expo SDK 57-compatible audio, media library, haptics and blur modules together with a regenerated lockfile, then replace the demo adapter behind the player provider.

The production data path is:

Android media permission → local asset index → metadata/artwork cache → player queue → playback status → palette extraction → Nexus theme → optional frequency analysis → Aura/Orb.

The UI should not import native media APIs directly. Keep them behind audio/library services so Development Build-specific behavior is isolated from presentation code.
