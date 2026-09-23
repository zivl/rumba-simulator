import type { PlayOptions, SoundId } from './types';

export interface SynthContext {
  ctx: AudioContext;
  out: AudioNode;
  noise: AudioBuffer;
}

const env = (gain: GainNode, t: number, attack: number, peak: number, decay: number): void => {
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
};

const tone = (
  s: SynthContext,
  type: OscillatorType,
  freq: number,
  start: number,
  duration: number,
  volume: number,
  endFreq?: number,
): void => {
  const { ctx } = s;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
  env(gain, start, 0.008, volume, duration);
  osc.connect(gain).connect(s.out);
  osc.start(start);
  osc.stop(start + duration + 0.05);
};

const noiseBurst = (s: SynthContext, start: number, duration: number, volume: number, filterFreq: number, type: BiquadFilterType = 'lowpass', q = 1): void => {
  const { ctx } = s;
  const src = ctx.createBufferSource();
  src.buffer = s.noise;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = filterFreq;
  filter.Q.value = q;
  const gain = ctx.createGain();
  env(gain, start, 0.005, volume, duration);
  src.connect(filter).connect(gain).connect(s.out);
  src.start(start, Math.random() * 1.5);
  src.stop(start + duration + 0.05);
};

const arpeggio = (s: SynthContext, notes: number[], step: number, type: OscillatorType, volume: number, length = step * 1.6): void => {
  const t = s.ctx.currentTime;
  notes.forEach((n, i) => tone(s, type, n, t + i * step, length, volume));
};

type Recipe = (s: SynthContext, o: Required<PlayOptions>) => void;

/** Procedural placeholder sounds. Each recipe is tiny and easy to replace with a sample. */
export const RECIPES: Record<SoundId, Recipe> = {
  pickup: (s, o) => tone(s, 'sine', 900 * o.pitch, s.ctx.currentTime, 0.06, 0.08 * o.volume, 1500 * o.pitch),
  pickupHeavy: (s, o) => {
    const t = s.ctx.currentTime;
    tone(s, 'triangle', 300 * o.pitch, t, 0.1, 0.12 * o.volume, 700 * o.pitch);
    noiseBurst(s, t, 0.08, 0.06 * o.volume, 2500, 'bandpass', 2);
  },
  uiClick: (s, o) => tone(s, 'square', 660 * o.pitch, s.ctx.currentTime, 0.04, 0.05 * o.volume),
  uiBuy: (s, o) => arpeggio(s, [523, 659, 784, 1047].map((f) => f * o.pitch), 0.06, 'triangle', 0.14 * o.volume),
  uiError: (s, o) => {
    const t = s.ctx.currentTime;
    tone(s, 'square', 180, t, 0.12, 0.08 * o.volume);
    tone(s, 'square', 140, t + 0.12, 0.16, 0.08 * o.volume);
  },
  uiRefresh: (s, o) => {
    const t = s.ctx.currentTime;
    noiseBurst(s, t, 0.25, 0.08 * o.volume, 1200, 'bandpass', 0.7);
    tone(s, 'sine', 400, t, 0.25, 0.06 * o.volume, 1200);
  },
  toggleOn: (s, o) => tone(s, 'sine', 520 * o.pitch, s.ctx.currentTime, 0.09, 0.09 * o.volume, 880 * o.pitch),
  toggleOff: (s, o) => tone(s, 'sine', 700 * o.pitch, s.ctx.currentTime, 0.09, 0.08 * o.volume, 360 * o.pitch),
  stageComplete: (s, o) => {
    arpeggio(s, [523, 659, 784, 1047, 1319], 0.1, 'triangle', 0.16 * o.volume, 0.35);
    arpeggio(s, [262, 330, 392, 523], 0.12, 'sine', 0.1 * o.volume, 0.6);
  },
  gameOver: (s, o) => arpeggio(s, [392, 330, 262, 196], 0.22, 'sawtooth', 0.07 * o.volume, 0.4),
  bossIntro: (s, o) => {
    const t = s.ctx.currentTime;
    for (const f of [55, 82.4, 110]) tone(s, 'sawtooth', f, t, 1.4, 0.07 * o.volume);
    noiseBurst(s, t, 1.2, 0.1 * o.volume, 300);
    tone(s, 'square', 220, t + 0.6, 0.5, 0.05 * o.volume, 110);
  },
  bossAttack: (s, o) => {
    const t = s.ctx.currentTime;
    noiseBurst(s, t, 0.35, 0.14 * o.volume, 800, 'bandpass', 0.8);
    tone(s, 'sawtooth', 160, t, 0.3, 0.06 * o.volume, 60);
  },
  bossHit: (s, o) => {
    const t = s.ctx.currentTime;
    tone(s, 'square', 300, t, 0.15, 0.1 * o.volume, 90);
    noiseBurst(s, t, 0.12, 0.12 * o.volume, 3000);
  },
  bossNeutralized: (s, o) => arpeggio(s, [196, 262, 330, 392, 523, 784], 0.09, 'square', 0.08 * o.volume, 0.3),
  bark: (s, o) => {
    const t = s.ctx.currentTime;
    for (const offset of [0, 0.18]) {
      tone(s, 'sawtooth', 420 * o.pitch, t + offset, 0.1, 0.1 * o.volume, 180 * o.pitch);
      noiseBurst(s, t + offset, 0.08, 0.08 * o.volume, 1200, 'bandpass', 1.5);
    }
  },
  meow: (s, o) => tone(s, 'triangle', 600 * o.pitch, s.ctx.currentTime, 0.45, 0.1 * o.volume, 950 * o.pitch),
  collision: (s, o) => {
    const t = s.ctx.currentTime;
    tone(s, 'sine', 120 * o.pitch, t, 0.12, 0.2 * o.volume, 60);
    noiseBurst(s, t, 0.05, 0.08 * o.volume, 1800);
  },
  knockback: (s, o) => {
    const t = s.ctx.currentTime;
    tone(s, 'sine', 90, t, 0.3, 0.25 * o.volume, 40);
    noiseBurst(s, t, 0.2, 0.15 * o.volume, 900);
    tone(s, 'square', 900, t + 0.05, 0.25, 0.04 * o.volume, 300);
  },
  radarPing: (s, o) => tone(s, 'sine', 1320 * o.pitch, s.ctx.currentTime, 0.12, 0.05 * o.volume),
  warning: (s, o) => {
    const t = s.ctx.currentTime;
    tone(s, 'square', 880, t, 0.1, 0.07 * o.volume);
    tone(s, 'square', 660, t + 0.14, 0.12, 0.07 * o.volume);
  },
  chargeStart: (s, o) => arpeggio(s, [440, 554, 659], 0.07, 'sine', 0.1 * o.volume),
  chargeFull: (s, o) => arpeggio(s, [659, 880, 1109, 1319], 0.07, 'sine', 0.1 * o.volume),
  cameraSwitch: (s, o) => noiseBurst(s, s.ctx.currentTime, 0.15, 0.06 * o.volume, 2500, 'highpass'),
  objective: (s, o) => arpeggio(s, [784, 988, 1175], 0.08, 'triangle', 0.1 * o.volume),
};

export const createNoiseBuffer = (ctx: AudioContext): AudioBuffer => {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
};
