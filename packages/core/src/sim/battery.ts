import { BATTERY_CONFIG } from '../config/battery';
import { ROOMBA_CONFIG } from '../config/roomba';
import type { RoombaStats } from '../stats/deriveStats';
import type { RoombaState } from './roomba';

export interface DrainBreakdown {
  idle: number;
  movement: number;
  brush: number;
  vacuum: number;
  lights: number;
  radar: number;
  infrared: number;
  total: number;
}

export const computeDrain = (r: RoombaState, stats: RoombaStats): DrainBreakdown => {
  const d = BATTERY_CONFIG.drainPerSecond;
  const m = stats.drainMultiplier;
  const movement =
    (d.movingAtMaxSpeed * Math.min(1, Math.abs(r.speed) / ROOMBA_CONFIG.maxSpeed) +
      d.turning * Math.min(1, Math.abs(r.angularVelocity) / ROOMBA_CONFIG.turnSpeed)) *
    m;
  const breakdown = {
    idle: d.idle * m,
    movement,
    brush: r.brushOn ? d.brush * m * (1 + (stats.brushCount - 1) * 0.25) : 0,
    vacuum: r.vacuumOn ? d.vacuum * m * stats.vacuumDrainMultiplier * (0.8 + stats.vacuumPower * 0.2) : 0,
    lights: r.lightsOn ? d.lights * m * stats.lightDrainMultiplier : 0,
    radar: d.radarPerSystem * stats.activeRadarSystems * m,
    infrared: r.infraredOn ? d.infrared * m * stats.infraredDrainMultiplier : 0,
    total: 0,
  };
  breakdown.total =
    breakdown.idle + breakdown.movement + breakdown.brush + breakdown.vacuum + breakdown.lights + breakdown.radar + breakdown.infrared;
  return breakdown;
};

/** Returns the index of the most severe warning threshold at or below the fraction, or -1. */
export const warningLevel = (fraction: number): number => {
  let level = -1;
  BATTERY_CONFIG.warningThresholds.forEach((threshold, i) => {
    if (fraction <= threshold) level = i;
  });
  return level;
};

/** Seconds of runtime left at the current drain. */
export const estimateRuntime = (battery: number, drain: number): number => (drain <= 0 ? Infinity : battery / drain);
