export type AudioBands = {
  bass: number;
  mid: number;
  high: number;
  rms: number;
  transient: number;
};

type AudioSampleLike = {
  timestamp: number;
  channels: Array<{ frames: number[] }>;
};

const EMPTY_BANDS: AudioBands = { bass: 0, mid: 0, high: 0, rms: 0, transient: 0 };

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function largestPowerOfTwo(value: number) {
  let result = 1;
  while (result * 2 <= value) result *= 2;
  return result;
}

function fft(real: number[], imag: number[]) {
  const n = real.length;
  let j = 0;
  for (let i = 1; i < n; i += 1) {
    let bit = n >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wLenCos = Math.cos(angle);
    const wLenSin = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let wCos = 1;
      let wSin = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const uReal = real[i + k];
        const uImag = imag[i + k];
        const vReal = real[i + k + len / 2] * wCos - imag[i + k + len / 2] * wSin;
        const vImag = real[i + k + len / 2] * wSin + imag[i + k + len / 2] * wCos;
        real[i + k] = uReal + vReal;
        imag[i + k] = uImag + vImag;
        real[i + k + len / 2] = uReal - vReal;
        imag[i + k + len / 2] = uImag - vImag;
        const nextCos = wCos * wLenCos - wSin * wLenSin;
        wSin = wCos * wLenSin + wSin * wLenCos;
        wCos = nextCos;
      }
    }
  }
}

function bandEnergy(
  magnitudes: number[],
  sampleRate: number,
  fftSize: number,
  lowHz: number,
  highHz: number,
) {
  const low = Math.max(1, Math.floor((lowHz * fftSize) / sampleRate));
  const high = Math.min(magnitudes.length - 1, Math.ceil((highHz * fftSize) / sampleRate));
  if (high <= low) return 0;
  let total = 0;
  for (let i = low; i <= high; i += 1) total += magnitudes[i] * magnitudes[i];
  return Math.sqrt(total / (high - low + 1));
}

export function createNexusAudioAnalyzer() {
  let previousTimestamp = -1;
  let estimatedRate = 48000;
  let smoothed: AudioBands = EMPTY_BANDS;
  let previousRms = 0;

  return (sample: AudioSampleLike): AudioBands => {
    const source = sample.channels[0]?.frames;
    if (!source?.length) return smoothed;

    const size = Math.min(512, largestPowerOfTwo(source.length));
    if (size < 64) return smoothed;

    if (previousTimestamp >= 0) {
      const delta = sample.timestamp - previousTimestamp;
      if (delta > 0.002 && delta < 0.2) {
        const inferred = source.length / delta;
        if (inferred >= 22050 && inferred <= 192000) {
          estimatedRate = estimatedRate * 0.82 + inferred * 0.18;
        }
      }
    }
    previousTimestamp = sample.timestamp;

    const channels = sample.channels.length;
    const real = new Array<number>(size);
    const imag = new Array<number>(size).fill(0);
    let squared = 0;

    for (let i = 0; i < size; i += 1) {
      let value = 0;
      for (let channel = 0; channel < channels; channel += 1) {
        value += sample.channels[channel]?.frames[i] ?? 0;
      }
      value /= Math.max(1, channels);
      squared += value * value;
      const hann = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
      real[i] = value * hann;
    }

    const rms = Math.sqrt(squared / size);
    fft(real, imag);

    const magnitudes = new Array<number>(size / 2);
    for (let i = 0; i < magnitudes.length; i += 1) {
      magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) / size;
    }

    const bassRaw = bandEnergy(magnitudes, estimatedRate, size, 28, 150);
    const midRaw = bandEnergy(magnitudes, estimatedRate, size, 150, 2600);
    const highRaw = bandEnergy(magnitudes, estimatedRate, size, 2600, 12000);

    // Curves are intentionally compressive: visual energy should survive quiet masters
    // without letting loud masters turn the interface into RGB noise.
    const next: AudioBands = {
      bass: clamp01(Math.pow(bassRaw * 14, 0.62)),
      mid: clamp01(Math.pow(midRaw * 18, 0.66)),
      high: clamp01(Math.pow(highRaw * 26, 0.72)),
      rms: clamp01(Math.pow(rms * 2.9, 0.72)),
      transient: clamp01(Math.max(0, rms - previousRms) * 12),
    };
    previousRms = rms;

    smoothed = {
      bass: smoothed.bass * 0.68 + next.bass * 0.32,
      mid: smoothed.mid * 0.72 + next.mid * 0.28,
      high: smoothed.high * 0.76 + next.high * 0.24,
      rms: smoothed.rms * 0.7 + next.rms * 0.3,
      transient: Math.max(next.transient, smoothed.transient * 0.58),
    };
    return smoothed;
  };
}

export const silentBands = EMPTY_BANDS;
