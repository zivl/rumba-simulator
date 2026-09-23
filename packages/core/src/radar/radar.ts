import type { DirtTypeId } from '../config/dirt';
import type { DirtField } from '../dirt/dirtField';
import type { CollisionWorld } from '../physics/collision';

export interface RadarContact {
  x: number;
  z: number;
  dist: number;
  type: DirtTypeId;
  visible: boolean;
}

export interface RadarScanOptions {
  range: number;
  throughWalls: boolean;
  maxContacts: number;
}

/**
 * Finds uncleaned dirt around a point. Without wall penetration, contacts behind walls
 * are dropped (line of sight is checked only for the closest candidates to stay cheap).
 */
export const scanDirt = (field: DirtField, world: CollisionWorld, x: number, z: number, options: RadarScanOptions): RadarContact[] => {
  const range2 = options.range * options.range;
  const candidates: RadarContact[] = [];
  for (const p of field.particles) {
    if (p.cleaned) continue;
    const d2 = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d2 > range2) continue;
    candidates.push({ x: p.x, z: p.z, dist: Math.sqrt(d2), type: p.type, visible: true });
  }
  candidates.sort((a, b) => a.dist - b.dist);
  const result: RadarContact[] = [];
  for (const c of candidates) {
    if (result.length >= options.maxContacts) break;
    const visible = c.dist < 0.4 || !world.segmentBlocked(x, z, c.x, c.z);
    if (!visible && !options.throughWalls) continue;
    result.push({ ...c, visible });
  }
  return result;
};

/** Nearest uncleaned dirt regardless of walls (directional radar). */
export const nearestDirt = (field: DirtField, x: number, z: number, count: number): RadarContact[] => {
  const best: RadarContact[] = [];
  for (const p of field.particles) {
    if (p.cleaned) continue;
    const dist = Math.hypot(p.x - x, p.z - z);
    if (best.length >= count && dist >= (best[best.length - 1] as RadarContact).dist) continue;
    const contact: RadarContact = { x: p.x, z: p.z, dist, type: p.type, visible: true };
    // Merge near-duplicates so multiple arrows point at different clusters.
    const duplicate = best.findIndex((b) => Math.hypot(b.x - p.x, b.z - p.z) < 1.2);
    if (duplicate >= 0) {
      if (dist < (best[duplicate] as RadarContact).dist) best[duplicate] = contact;
    } else {
      best.push(contact);
    }
    best.sort((a, b) => a.dist - b.dist);
    if (best.length > count) best.pop();
  }
  return best;
};

/** 0 (nothing in range) .. 1 (right on top of dirt). */
export const proximityStrength = (field: DirtField, x: number, z: number, range: number): number => {
  if (range <= 0) return 0;
  let nearest = Infinity;
  for (const p of field.particles) {
    if (p.cleaned) continue;
    const d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (d < nearest) nearest = d;
  }
  const dist = Math.sqrt(nearest);
  return dist >= range ? 0 : 1 - dist / range;
};
