import { createNoiseBuffer, RECIPES, type SynthContext } from './synth';
import type { AudioManager, LoopId, LoopParams, PlayOptions, SoundId, VolumeSettings } from './types';

interface LoopVoice {
  gain: GainNode;
  baseVolume: number;
  setIntensity: (value: number) => void;
  stop: () => void;
}

const LOOP_VOLUME: Record<LoopId, number> = {
  motor: 0.05,
  brush: 0.035,
  vacuum: 0.05,
  charging: 0.04,
  music: 0.12,
};

/** Procedural music: a mellow two-chord groove scheduled ahead of time. */
class MusicSequencer {
  private timer: number | null = null;
  private nextTime = 0;
  private step = 0;
  private static readonly BASS = [110, 110, 146.8, 146.8, 123.5, 123.5, 98, 98];
  private static readonly ARP = [440, 523.3, 659.3, 587.3, 523.3, 659.3, 784, 659.3];

  constructor(
    private readonly ctx: AudioContext,
    private readonly out: AudioNode,
  ) {}

  start(): void {
    if (this.timer !== null) return;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 100);
  }

  stop(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  private note(freq: number, t: number, length: number, volume: number, type: OscillatorType): void {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(volume, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(gain).connect(this.out);
    osc.start(t);
    osc.stop(t + length + 0.05);
  }

  private schedule(): void {
    const stepLength = 0.25;
    while (this.nextTime < this.ctx.currentTime + 0.4) {
      const bar = Math.floor(this.step / 8) % MusicSequencer.BASS.length;
      if (this.step % 2 === 0) this.note(MusicSequencer.BASS[bar] as number, this.nextTime, 0.45, 0.35, 'triangle');
      const arp = MusicSequencer.ARP[this.step % MusicSequencer.ARP.length] as number;
      const transpose = bar >= 4 ? 0.89 : 1;
      if (this.step % 8 !== 7) this.note(arp * transpose, this.nextTime, 0.18, 0.12, 'sine');
      this.nextTime += stepLength;
      this.step++;
    }
  }
}

export class WebAudioManager implements AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfx: GainNode | null = null;
  private music: GainNode | null = null;
  private synth: SynthContext | null = null;
  private readonly loops = new Map<LoopId, LoopVoice>();
  private readonly samples = new Map<SoundId, AudioBuffer>();
  private readonly pendingSamples = new Map<SoundId, string>();
  private volumes: VolumeSettings = { master: 0.8, sfx: 0.8, music: 0.5 };
  private readonly lastPlayed = new Map<SoundId, number>();

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.sfx = ctx.createGain();
    this.music = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();
    this.sfx.connect(this.master);
    this.music.connect(this.master);
    this.master.connect(compressor).connect(ctx.destination);
    this.synth = { ctx, out: this.sfx, noise: createNoiseBuffer(ctx) };
    this.applyVolumes();
    for (const [id, url] of this.pendingSamples) void this.registerSample(id, url);
    this.pendingSamples.clear();
  }

  setVolumes(volumes: VolumeSettings): void {
    this.volumes = volumes;
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx || !this.master || !this.sfx || !this.music) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.05);
    this.sfx.gain.setTargetAtTime(this.volumes.sfx, t, 0.05);
    this.music.gain.setTargetAtTime(this.volumes.music, t, 0.05);
  }

  async registerSample(id: SoundId, url: string): Promise<void> {
    if (!this.ctx) {
      this.pendingSamples.set(id, url);
      return;
    }
    const response = await fetch(url);
    this.samples.set(id, await this.ctx.decodeAudioData(await response.arrayBuffer()));
  }

  play(id: SoundId, options: PlayOptions = {}): void {
    if (!this.synth || !this.ctx || this.ctx.state !== 'running') return;
    // Avoid machine-gun stacking of identical sounds in the same few milliseconds.
    const now = this.ctx.currentTime;
    if (now - (this.lastPlayed.get(id) ?? -1) < 0.035) return;
    this.lastPlayed.set(id, now);
    const sample = this.samples.get(id);
    if (sample) {
      const src = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      src.buffer = sample;
      src.playbackRate.value = options.pitch ?? 1;
      gain.gain.value = options.volume ?? 1;
      src.connect(gain).connect(this.synth.out);
      src.start();
      return;
    }
    RECIPES[id](this.synth, { volume: options.volume ?? 1, pitch: options.pitch ?? 1 });
  }

  setLoop(id: LoopId, active: boolean, params: LoopParams = {}): void {
    if (!this.ctx) return;
    const existing = this.loops.get(id);
    if (!active) {
      if (existing) {
        existing.stop();
        this.loops.delete(id);
      }
      return;
    }
    const voice = existing ?? this.createLoop(id);
    if (!voice) return;
    if (!existing) this.loops.set(id, voice);
    const t = this.ctx.currentTime;
    voice.gain.gain.setTargetAtTime(voice.baseVolume * (params.volume ?? 1), t, 0.08);
    if (params.intensity !== undefined) voice.setIntensity(params.intensity);
  }

  stopAllLoops(): void {
    for (const voice of this.loops.values()) voice.stop();
    this.loops.clear();
  }

  private createLoop(id: LoopId): LoopVoice | null {
    const ctx = this.ctx;
    const synth = this.synth;
    if (!ctx || !synth || !this.music) return null;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const baseVolume = LOOP_VOLUME[id];
    const nodes: AudioScheduledSourceNode[] = [];
    const noise = (): AudioBufferSourceNode => {
      const src = ctx.createBufferSource();
      src.buffer = synth.noise;
      src.loop = true;
      nodes.push(src);
      return src;
    };
    const osc = (type: OscillatorType, freq: number): OscillatorNode => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      nodes.push(o);
      return o;
    };
    let setIntensity: (value: number) => void = () => undefined;
    let cleanup: () => void = () => undefined;

    switch (id) {
      case 'motor': {
        const o = osc('sawtooth', 50);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 300;
        o.connect(filter).connect(gain);
        setIntensity = (v) => {
          o.frequency.setTargetAtTime(45 + v * 70, ctx.currentTime, 0.05);
          filter.frequency.setTargetAtTime(250 + v * 600, ctx.currentTime, 0.05);
        };
        gain.connect(synth.out);
        break;
      }
      case 'brush': {
        const src = noise();
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 3200;
        filter.Q.value = 1.2;
        const flutter = ctx.createGain();
        const lfo = osc('sine', 16);
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.35;
        lfo.connect(lfoGain).connect(flutter.gain);
        src.connect(filter).connect(flutter).connect(gain);
        gain.connect(synth.out);
        break;
      }
      case 'vacuum': {
        const src = noise();
        const low = ctx.createBiquadFilter();
        low.type = 'lowpass';
        low.frequency.value = 1600;
        const high = ctx.createBiquadFilter();
        high.type = 'highpass';
        high.frequency.value = 250;
        const whine = osc('sine', 820);
        const whineGain = ctx.createGain();
        whineGain.gain.value = 0.12;
        src.connect(low).connect(high).connect(gain);
        whine.connect(whineGain).connect(gain);
        setIntensity = (v) => whine.frequency.setTargetAtTime(700 + v * 500, ctx.currentTime, 0.2);
        gain.connect(synth.out);
        break;
      }
      case 'charging': {
        const o = osc('sine', 440);
        const pulse = ctx.createGain();
        const lfo = osc('square', 2);
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 0.5;
        lfo.connect(lfoGain).connect(pulse.gain);
        o.connect(pulse).connect(gain);
        setIntensity = (v) => o.frequency.setTargetAtTime(400 + v * 500, ctx.currentTime, 0.2);
        gain.connect(synth.out);
        break;
      }
      case 'music': {
        gain.connect(this.music);
        const sequencer = new MusicSequencer(ctx, gain);
        sequencer.start();
        cleanup = () => sequencer.stop();
        break;
      }
    }
    for (const node of nodes) node.start();
    return {
      gain,
      baseVolume,
      setIntensity,
      stop: () => {
        const t = ctx.currentTime;
        gain.gain.setTargetAtTime(0, t, 0.06);
        window.setTimeout(() => {
          for (const node of nodes) node.stop();
          cleanup();
          gain.disconnect();
        }, 400);
      },
    };
  }
}

/** Silent implementation for tests, previews or when audio is unavailable. */
export class NullAudioManager implements AudioManager {
  unlock(): void {}
  play(): void {}
  setLoop(): void {}
  setVolumes(): void {}
  stopAllLoops(): void {}
  async registerSample(): Promise<void> {}
}
