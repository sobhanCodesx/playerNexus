export type NexusPalette = readonly [string, string, string, ...string[]];

export const nexusTokens = {
  spacing: { x1: 4, x2: 8, x3: 12, x4: 16, x5: 20, x6: 24, x8: 32, x10: 40, x12: 48 },
  radius: { sm: 12, md: 18, lg: 26, xl: 34, artwork: 30, pill: 999 },
  opacity: { hairline: 0.08, subtle: 0.16, glass: 0.62, strong: 0.86 },
  type: {
    display: { fontSize: 38, lineHeight: 42, fontWeight: '700' as const, letterSpacing: -1.5 },
    title: { fontSize: 26, lineHeight: 31, fontWeight: '700' as const, letterSpacing: -0.7 },
    heading: { fontSize: 18, lineHeight: 23, fontWeight: '650' as const, letterSpacing: -0.25 },
    body: { fontSize: 15, lineHeight: 21, fontWeight: '500' as const },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.15 },
    micro: { fontSize: 10, lineHeight: 13, fontWeight: '700' as const, letterSpacing: 0.7 },
  },
  motion: {
    micro: 170,
    navigation: 340,
    hero: 620,
    playback: 920,
    ambientSlow: 12000,
    ambientFast: 5200,
  },
  colors: {
    obsidian: '#07090B',
    ink: '#0C1014',
    white: '#F6F7F8',
    muted: '#9CA3AA',
    hairline: 'rgba(255,255,255,0.10)',
    glass: 'rgba(16,20,25,0.66)',
    glassSoft: 'rgba(255,255,255,0.055)',
  },
} as const;

type RGB = { r: number; g: number; b: number };

const hexToRgb = (hex: string): RGB => {
  const normalized = hex.replace('#', '').slice(0, 6);
  const value = parseInt(normalized.padEnd(6, '0'), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
};

const luminance = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  const channel = (v: number) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const mix = (a: string, b: string, amount: number) => {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  const part = (from: number, to: number) => Math.round(from + (to - from) * amount);
  return '#' + [part(x.r, y.r), part(x.g, y.g), part(x.b, y.b)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('');
};

export type NexusTheme = {
  primaryAmbient: string;
  secondaryGlow: string;
  backgroundTint: string;
  accent: string;
  glassTint: string;
  text: string;
  textMuted: string;
};

export function deriveNexusTheme(palette: NexusPalette): NexusTheme {
  const sorted = [...palette].sort((a, b) => luminance(a) - luminance(b));
  const darkest = sorted[0] ?? '#0A0D10';
  const brightest = sorted[sorted.length - 1] ?? '#D9E2EA';
  const middle = sorted[Math.floor(sorted.length / 2)] ?? brightest;
  return {
    primaryAmbient: mix(middle, '#000000', luminance(middle) > 0.48 ? 0.38 : 0.12),
    secondaryGlow: mix(brightest, '#FFFFFF', 0.08),
    backgroundTint: mix(darkest, '#07090B', 0.58),
    accent: luminance(brightest) > 0.78 ? mix(brightest, '#111820', 0.24) : brightest,
    glassTint: mix(middle, '#0A0D10', 0.74),
    text: '#F7F8F9',
    textMuted: '#A6ADB4',
  };
}

export const gradientBackground = (colors: readonly string[], angle = 145) =>
  ({
    experimental_backgroundImage:
      'linear-gradient(' + angle + 'deg, ' + colors.join(', ') + ')',
    backgroundImage: 'linear-gradient(' + angle + 'deg, ' + colors.join(', ') + ')',
  }) as any;
