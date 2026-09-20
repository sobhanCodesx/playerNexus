import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Path,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import type { AudioBands } from '@/audio/audio-analysis';
import type { NexusPalette } from '@/design/nexus-tokens';

type Point = { x: number; y: number };

function contourPath(size: number, bands: AudioBands, layer: number) {
  const count = 22;
  const center = size / 2;
  const base = size * (0.22 + layer * 0.075);
  const points: Point[] = Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
    const bass = bands.bass * (0.07 - layer * 0.008);
    const mid = Math.sin(index * 1.45 + layer * 0.9) * bands.mid * 0.05;
    const high = Math.sin(index * 3.8 - layer * 0.7) * bands.high * 0.018;
    const transient = (index % 5 === layer % 5 ? bands.transient * 0.028 : 0);
    const radius = base * (1 + bass + mid + high + transient);
    return {
      x: center + Math.cos(angle) * radius,
      y: center + Math.sin(angle) * radius,
    };
  });

  const midpoint = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const start = midpoint(points[count - 1], points[0]);
  let path = 'M ' + start.x.toFixed(2) + ' ' + start.y.toFixed(2);
  for (let index = 0; index < count; index += 1) {
    const point = points[index];
    const next = points[(index + 1) % count];
    const mid = midpoint(point, next);
    path += ' Q ' + point.x.toFixed(2) + ' ' + point.y.toFixed(2) + ' ' + mid.x.toFixed(2) + ' ' + mid.y.toFixed(2);
  }
  return path + ' Z';
}

export function NexusVisualizerField({
  palette,
  bands,
  active,
  size,
}: {
  palette: NexusPalette;
  bands: AudioBands;
  active: boolean;
  size: number;
}) {
  const drift = useSharedValue(0);
  useEffect(() => {
    drift.value = withRepeat(withTiming(1, { duration: active ? 9000 : 14000 }), -1, true);
  }, [active, drift]);

  const paths = useMemo(
    () => [0, 1, 2, 3].map((layer) => contourPath(size, bands, layer)),
    [size, bands],
  );
  const motion = useAnimatedStyle(() => ({
    transform: [
      { rotate: interpolate(drift.value, [0, 1], [-2.2, 2.8]) + 'deg' },
      { scale: 1 + bands.bass * 0.018 },
    ],
  }));

  const particleAlpha = 0.18 + bands.high * 0.55;

  return (
    <Animated.View style={[{ width: size, height: size }, motion]}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Circle c={vec(size / 2, size / 2)} r={size * (0.29 + bands.bass * 0.03)}>
          <RadialGradient
            c={vec(size * 0.42, size * 0.38)}
            r={size * 0.42}
            colors={[palette[0] + '82', palette[1] + '48', palette[2] + '20', 'rgba(4,7,10,0)']}
          />
          <BlurMask blur={22 + bands.bass * 18} style="normal" />
        </Circle>

        <Group>
          {paths.map((path, index) => (
            <Path
              key={index}
              path={path}
              style="stroke"
              strokeWidth={index === 0 ? 1.35 + bands.high * 0.9 : 0.7 + bands.mid * 0.55}
              color={
                index === 0
                  ? 'rgba(255,255,255,' + (0.24 + bands.high * 0.26) + ')'
                  : index === 1
                    ? palette[0] + '8A'
                    : index === 2
                      ? palette[1] + '64'
                      : palette[2] + '50'
              }
            />
          ))}
        </Group>

        <Path path={paths[0]} color={palette[0] + '24'}>
          <BlurMask blur={8 + bands.mid * 9} style="outer" />
        </Path>

        <Circle c={vec(size * 0.27, size * 0.34)} r={1.1 + bands.high * 2.3} color={'rgba(255,255,255,' + particleAlpha + ')'} />
        <Circle c={vec(size * 0.72, size * 0.29)} r={0.8 + bands.transient * 2.8} color={palette[0] + 'C0'} />
        <Circle c={vec(size * 0.78, size * 0.66)} r={0.9 + bands.high * 1.9} color={palette[1] + 'A8'} />
        <Circle c={vec(size * 0.34, size * 0.76)} r={0.7 + bands.mid * 1.5} color={palette[2] + '98'} />
      </Canvas>
      <View pointerEvents="none" style={styles.core}>
        <View style={[styles.coreLight, { backgroundColor: palette[0], opacity: 0.2 + bands.rms * 0.25 }]} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  core: {
    position: 'absolute',
    left: '43%',
    top: '43%',
    width: '14%',
    height: '14%',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(8,11,14,0.28)',
    overflow: 'hidden',
  },
  coreLight: {
    position: 'absolute',
    width: '80%',
    height: '80%',
    borderRadius: 999,
    left: '-12%',
    top: '-14%',
  },
});
