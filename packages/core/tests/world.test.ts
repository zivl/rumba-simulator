import { describe, expect, it } from 'vitest';
import {
  BOSSES,
  buildStage,
  CollisionWorld,
  generateHouse,
  HOUSES,
  LAYOUT_LEGEND,
  OUTSIDE_CELL,
  ReachabilityMap,
  ROOMBA_CONFIG,
  Simulation,
  deriveStats,
  createStartingLevels,
  REACH_TOLERANCE,
} from '../src';

describe('house layouts', () => {
  it.each(HOUSES.map((h) => [h.name, h.layout] as const))('%s has rectangular rows with known cells', (_, layout) => {
    const width = layout[0]?.length;
    for (const row of layout) {
      expect(row.length).toBe(width);
      for (const ch of row) expect(ch === OUTSIDE_CELL || ch in LAYOUT_LEGEND).toBe(true);
    }
  });

  it.each(HOUSES.map((h) => h.level))('house level %i: every room is reachable from the dock', (level) => {
    const stage = buildStage(1, level);
    const house = generateHouse(stage.blueprint, stage.houseSeed, stage.dirtSeed);
    const world = new CollisionWorld(house.bounds, house.colliders);
    const reach = new ReachabilityMap(world, house.bounds, 0.1, ROOMBA_CONFIG.radius + 0.005, house.station.dockX, house.station.dockZ);
    for (const room of house.rooms) {
      const col = Math.floor((room.center.x - house.bounds.minX) / house.cellSize);
      const reachableInRoom = room.cells.some((cell) => {
        const c = cell % house.cols;
        const r = (cell - c) / house.cols;
        const x = house.bounds.minX + (c + 0.5) * house.cellSize;
        const z = house.bounds.minZ + (r + 0.5) * house.cellSize;
        return reach.isNearReachable(x, z, house.cellSize * 0.5);
      });
      expect(reachableInRoom, `${room.label} (${col}) unreachable in ${house.name}`).toBe(true);
    }
    expect(house.furniture.length).toBeGreaterThan(house.rooms.length);
  });

  it('bigger houses are strictly larger', () => {
    const areas = HOUSES.map((h) => h.layout.length * (h.layout[0]?.length ?? 0));
    for (let i = 1; i < areas.length; i++) expect(areas[i]).toBeGreaterThan(areas[i - 1] as number);
  });
});

describe('dirt generation', () => {
  it('places all dirt where the intake can reach it', () => {
    const sim = new Simulation({ stage: buildStage(3, 2), stats: deriveStats(createStartingLevels()) });
    expect(sim.dirt.particles.length).toBeGreaterThan(200);
    for (const p of sim.dirt.particles) expect(sim.reach.isNearReachable(p.x, p.z, REACH_TOLERANCE + 1e-6)).toBe(true);
  });

  it('differs between stages but is deterministic per stage', () => {
    const stats = deriveStats(createStartingLevels());
    const a = new Simulation({ stage: buildStage(1, 1), stats });
    const b = new Simulation({ stage: buildStage(1, 1), stats });
    const c = new Simulation({ stage: buildStage(2, 1), stats });
    expect(a.dirt.particles.map((p) => p.x)).toEqual(b.dirt.particles.map((p) => p.x));
    expect(a.dirt.particles.map((p) => p.x)).not.toEqual(c.dirt.particles.map((p) => p.x));
  });
});

describe('boss arenas', () => {
  it.each(BOSSES.map((_, i) => (i + 1) * 10))('stage %i boss runs for 30 simulated seconds', (stageNumber) => {
    const sim = new Simulation({ stage: buildStage(stageNumber, 1), stats: deriveStats(createStartingLevels()) });
    expect(sim.boss).not.toBeNull();
    const before = sim.dirt.particles.length;
    for (let i = 0; i < 60 * 30; i++) sim.step(1 / 60, { throttle: 0, turn: 0 });
    expect(sim.dirt.particles.length).toBeGreaterThan(before);
    expect(Number.isFinite(sim.boss?.x)).toBe(true);
  });

  it('bosses repeat with scaling after the fifth', () => {
    const first = buildStage(10, 1).boss;
    const sixth = buildStage(60, 1).boss;
    expect(sixth?.id).toBe(first?.id);
    expect(sixth?.maxHealth).toBeGreaterThan(first?.maxHealth ?? 0);
    expect(sixth?.name.startsWith('MEGA')).toBe(true);
  });
});
