import { CLEANING_CONFIG, DIRT_GENERATION_CONFIG, DIRT_TYPES, type DirtTypeId } from '../config/dirt';
import { ROOMBA_CONFIG } from '../config/roomba';
import { ROOM_TYPES } from '../config/rooms';
import type { Rng } from '../math/rng';
import type { CollisionWorld } from '../physics/collision';
import type { StageDefinition } from '../stages/stages';
import type { ReachabilityMap } from '../world/reachability';
import type { HouseLayout, Room } from '../world/types';
import { DirtField } from './dirtField';

/** Dirt is only placed where the roomba intake can actually reach it. */
export const REACH_TOLERANCE = ROOMBA_CONFIG.radius * CLEANING_CONFIG.intakeNoBrushFactor * 0.92;

export interface DirtPlacementContext {
  world: CollisionWorld;
  reach: ReachabilityMap;
  rng: Rng;
}

export const isValidDirtSpot = (ctx: DirtPlacementContext, x: number, z: number): boolean =>
  ctx.world.isFree(x, z, 0.015) && ctx.reach.isNearReachable(x, z, REACH_TOLERANCE);

const EDGE_DIRECTIONS = Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2;
  return { x: Math.cos(a), z: Math.sin(a) };
});

/** Moves a point towards the nearest wall or furniture edge (dust bunnies love edges). */
const hugEdge = (ctx: DirtPlacementContext, x: number, z: number): { x: number; z: number } => {
  let best = Infinity;
  let dir = EDGE_DIRECTIONS[0] as { x: number; z: number };
  for (const d of EDGE_DIRECTIONS) {
    const t = ctx.world.raycast(x, z, d.x, d.z, 3);
    if (t < best) {
      best = t;
      dir = d;
    }
  }
  if (!Number.isFinite(best) || best >= 3) return { x, z };
  const offset = Math.max(0, best - ctx.rng.range(0.08, 0.25));
  return { x: x + dir.x * offset, z: z + dir.z * offset };
};

const pickType = (room: Room, stage: StageDefinition, rng: Rng): DirtTypeId => {
  const weights = ROOM_TYPES[room.type].dirtWeights;
  const entries = Object.entries(weights) as [DirtTypeId, number][];
  const choice = rng.weighted(entries, ([type, w]) => w * (stage.dirtBias[type] ?? 1));
  return choice ? choice[0] : 'dust';
};

const randomPointInRoom = (house: HouseLayout, room: Room, rng: Rng): { x: number; z: number } => {
  const cell = rng.pick(room.cells);
  const col = cell % house.cols;
  const row = (cell - col) / house.cols;
  return {
    x: house.bounds.minX + (col + rng.next()) * house.cellSize,
    z: house.bounds.minZ + (row + rng.next()) * house.cellSize,
  };
};

export const scatterCluster = (
  field: DirtField,
  ctx: DirtPlacementContext,
  type: DirtTypeId,
  cx: number,
  cz: number,
  count: number,
  spread: number,
  time = -1,
): number => {
  let placed = 0;
  for (let i = 0; i < count * 3 && placed < count; i++) {
    const x = cx + ctx.rng.gaussian() * spread;
    const z = cz + ctx.rng.gaussian() * spread;
    if (!isValidDirtSpot(ctx, x, z)) continue;
    field.add(type, x, z, ctx.rng.next, { time });
    placed++;
  }
  return placed;
};

export const generateDirt = (house: HouseLayout, stage: StageDefinition, ctx: DirtPlacementContext): DirtField => {
  const field = new DirtField();
  const cfg = DIRT_GENERATION_CONFIG;
  const { rng } = ctx;
  for (const room of house.rooms) {
    const target = Math.round(room.area * cfg.baseDensity * ROOM_TYPES[room.type].dirtDensity * stage.dirtDensity);
    let placed = 0;
    let guard = 0;
    while (placed < target && guard++ < target * 2 + 20 && field.particles.length < cfg.maxParticles) {
      const type = pickType(room, stage, rng);
      let center = randomPointInRoom(house, room, rng);
      if (rng.chance(cfg.edgeBias)) center = hugEdge(ctx, center.x, center.z);
      const isMud = type === 'mud';
      const count = isMud ? rng.int(cfg.mudPatchParticles[0], cfg.mudPatchParticles[1]) : rng.int(cfg.clusterSize[0], cfg.clusterSize[1]);
      const spread = isMud ? 0.12 : rng.range(cfg.clusterSpread[0], cfg.clusterSpread[1]);
      placed += scatterCluster(field, ctx, type, center.x, center.z, Math.min(count, target - placed), spread);
    }
  }

  if (stage.boss) {
    for (const mess of stage.boss.initialMess) {
      let placed = 0;
      let guard = 0;
      while (placed < mess.count && guard++ < 200) {
        const p = ctx.reach.randomPoint(rng);
        if (!p) break;
        placed += scatterCluster(field, ctx, mess.dirtType, p.x, p.z, Math.min(8, mess.count - placed), 0.35);
      }
    }
  }
  return field;
};

export const dirtTypeLabel = (type: DirtTypeId): string => DIRT_TYPES[type].label;
