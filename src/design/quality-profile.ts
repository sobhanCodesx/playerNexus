import type { NexusVisualQuality } from '@/providers/settings-provider';

export type NexusQualityProfile = {
  sampleIntervalMs: number;
  auraLayers: 1 | 2 | 3;
  auraEnergy: number;
  orbParticles: 0 | 2 | 3;
  orbBlurScale: number;
  visualizerLayers: 2 | 4 | 5;
  visualizerParticles: 1 | 4 | 7;
  visualizerBlurScale: number;
};

const profiles: Record<NexusVisualQuality, NexusQualityProfile> = {
  low: {
    sampleIntervalMs: 52,
    auraLayers: 1,
    auraEnergy: 0.72,
    orbParticles: 0,
    orbBlurScale: 0.55,
    visualizerLayers: 2,
    visualizerParticles: 1,
    visualizerBlurScale: 0.52,
  },
  balanced: {
    sampleIntervalMs: 32,
    auraLayers: 2,
    auraEnergy: 1,
    orbParticles: 2,
    orbBlurScale: 1,
    visualizerLayers: 4,
    visualizerParticles: 4,
    visualizerBlurScale: 1,
  },
  ultra: {
    sampleIntervalMs: 20,
    auraLayers: 3,
    auraEnergy: 1.16,
    orbParticles: 3,
    orbBlurScale: 1.22,
    visualizerLayers: 5,
    visualizerParticles: 7,
    visualizerBlurScale: 1.22,
  },
};

export function getNexusQualityProfile(quality: NexusVisualQuality) {
  return profiles[quality];
}
