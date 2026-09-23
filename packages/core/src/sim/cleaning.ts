import { CLEANING_CONFIG, DIRT_TYPES, type DirtTypeConfig } from '../config/dirt';
import { ROOMBA_CONFIG } from '../config/roomba';
import type { DirtField } from '../dirt/dirtField';
import type { CollisionWorld } from '../physics/collision';
import type { RoombaStats } from '../stats/deriveStats';
import type { SimEvent } from './events';
import type { RoombaState } from './roomba';

export const intakeRadius = (r: RoombaState, stats: RoombaStats): number =>
  ROOMBA_CONFIG.radius * (r.brushOn ? CLEANING_CONFIG.intakeRadiusFactor * stats.brushCoverage : CLEANING_CONFIG.intakeNoBrushFactor);

/** Health removed per second for a given dirt type with the current equipment. */
export const cleaningRate = (type: DirtTypeConfig, r: RoombaState, stats: RoombaStats, vacuumPenalty: number): number => {
  const c = CLEANING_CONFIG;
  let brush = 0;
  if (r.brushOn) {
    brush = stats.brushPower * stats.brushRate * type.brushAffinity;
    if (stats.brushPower < type.minBrushPower) brush *= c.underpoweredFactor;
    if (type.id === 'mud' || type.id === 'hair') brush *= stats.advancedBrushBonus;
  }
  let vacuum = 0;
  if (r.vacuumOn) {
    vacuum = stats.vacuumPower * type.vacuumAffinity * vacuumPenalty;
    if (stats.vacuumPower < type.minVacuumPower) vacuum *= c.underpoweredFactor;
  }
  return (c.baseRate * (brush + vacuum + c.passiveEffect)) / type.hardness;
};

export interface CleaningContext {
  field: DirtField;
  roomba: RoombaState;
  stats: RoombaStats;
  world: CollisionWorld;
  dt: number;
  vacuumPenalty: number;
  events: SimEvent[];
}

/** Returns the number of particles finished this step. */
export const stepCleaning = (ctx: CleaningContext): number => {
  const { field, roomba: r, stats, world, dt, vacuumPenalty, events } = ctx;
  const intake = intakeRadius(r, stats);
  const intake2 = intake * intake;
  const range = r.vacuumOn ? stats.vacuumRange : 0;
  const reach = Math.max(range, intake);
  const reach2 = reach * reach;
  const fx = Math.sin(r.heading);
  const fz = Math.cos(r.heading);
  const cosLimit = Math.cos(CLEANING_CONFIG.vacuumPullHalfAngle);
  let finished = 0;

  for (const p of field.particles) {
    if (p.cleaned) continue;
    const dx = r.x - p.x;
    const dz = r.z - p.z;
    const d2 = dx * dx + dz * dz;
    p.pulled = false;
    if (d2 > reach2) continue;
    const type = DIRT_TYPES[p.type];
    const d = Math.sqrt(d2);
    if (d2 > intake2) {
      if (!type.suckable || range <= 0) continue;
      // Dirt in front of the intake gets dragged in; walls block suction.
      const facing = d > 1e-5 ? -(dx * fx + dz * fz) / d : 1;
      if (facing < cosLimit) continue;
      if (d > 0.4 && world.segmentBlocked(p.x, p.z, r.x, r.z)) continue;
      const falloff = 0.4 + 0.6 * (1 - d / range);
      const speed = CLEANING_CONFIG.vacuumPullSpeed * stats.vacuumPower * (1 - type.pullResistance) * falloff * vacuumPenalty;
      if (speed <= 0) continue;
      const step = Math.min(d - intake * 0.5, speed * dt);
      p.x += (dx / d) * step;
      p.z += (dz / d) * step;
      p.pulled = true;
      field.changeCounter++;
      continue;
    }
    if (field.damage(p, cleaningRate(type, r, stats, vacuumPenalty) * dt)) {
      finished++;
      events.push({ type: 'pickup', dirtType: p.type, x: p.x, z: p.z });
    }
  }
  return finished;
};
