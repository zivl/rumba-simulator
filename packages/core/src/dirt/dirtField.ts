import { DIRT_TYPES, type DirtShape, type DirtTypeId } from '../config/dirt';

export interface DirtParticle {
  id: number;
  type: DirtTypeId;
  shape: DirtShape;
  x: number;
  z: number;
  /** 1 = dirty, 0 = cleaned. */
  health: number;
  weight: number;
  size: number;
  rotation: number;
  colorIndex: number;
  cleaned: boolean;
  /** Set while the vacuum is pulling the particle. */
  pulled: boolean;
  /** Frames since creation; renderers use it for spawn animation. */
  bornAt: number;
}

export interface SpawnOptions {
  shape?: DirtShape;
  size?: number;
  rotation?: number;
  colorIndex?: number;
  time?: number;
}

/**
 * Flat list of dirt particles plus running totals. `version` bumps whenever particles are
 * added so renderers know to rebuild instance buffers.
 */
export class DirtField {
  readonly particles: DirtParticle[] = [];
  totalWeight = 0;
  cleanedWeight = 0;
  cleanedCount = 0;
  version = 0;
  /** Monotonic counter of health changes so renderers can skip unchanged frames. */
  changeCounter = 0;

  add(type: DirtTypeId, x: number, z: number, random: () => number, options: SpawnOptions = {}): DirtParticle {
    const config = DIRT_TYPES[type];
    const size = options.size ?? config.size[0] + (config.size[1] - config.size[0]) * random();
    const particle: DirtParticle = {
      id: this.particles.length,
      type,
      shape: options.shape ?? config.shape,
      x,
      z,
      health: 1,
      weight: config.weight,
      size,
      rotation: options.rotation ?? random() * Math.PI * 2,
      colorIndex: options.colorIndex ?? Math.floor(random() * config.colors.length),
      cleaned: false,
      pulled: false,
      bornAt: options.time ?? -1,
    };
    this.particles.push(particle);
    this.totalWeight += particle.weight;
    this.version++;
    return particle;
  }

  /** Applies cleaning damage; returns true when the particle was just finished. */
  damage(p: DirtParticle, amount: number): boolean {
    if (p.cleaned || amount <= 0) return false;
    const applied = Math.min(p.health, amount);
    p.health -= applied;
    this.cleanedWeight += applied * p.weight;
    this.changeCounter++;
    if (p.health <= 1e-4) {
      this.cleanedWeight += p.health * p.weight;
      p.health = 0;
      p.cleaned = true;
      this.cleanedCount++;
      return true;
    }
    return false;
  }

  get cleanFraction(): number {
    return this.totalWeight <= 0 ? 1 : Math.min(1, this.cleanedWeight / this.totalWeight);
  }

  get remaining(): number {
    return this.particles.length - this.cleanedCount;
  }
}
