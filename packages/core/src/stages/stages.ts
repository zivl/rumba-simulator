import { BOSSES, BOSS_SCALING_CONFIG, type BossDefinition } from '../config/bosses';
import type { DirtTypeId } from '../config/dirt';
import { getHouseConfig } from '../config/houses';
import { STAGE_CONFIG, type LightingMood } from '../config/stages';
import { stageReward } from '../economy/economy';
import { hashSeed } from '../math/rng';
import type { HouseBlueprint } from '../world/houseGenerator';

/** A boss definition with cycle scaling applied (boss #6 is a tougher boss #1, etc). */
export interface ResolvedBoss extends BossDefinition {
  cycle: number;
  speedMultiplier: number;
  spawnRateMultiplier: number;
  knockbackMultiplier: number;
}

export interface StageDefinition {
  number: number;
  isBoss: boolean;
  boss: ResolvedBoss | null;
  houseLevel: number;
  blueprint: HouseBlueprint;
  houseSeed: number;
  dirtSeed: number;
  dirtDensity: number;
  dirtBias: Partial<Record<DirtTypeId, number>>;
  requiredClean: number;
  mood: LightingMood;
  reward: number;
  title: string;
}

export const isBossStage = (stage: number): boolean => stage > 0 && stage % STAGE_CONFIG.bossEvery === 0;

export const resolveBoss = (bossNumber: number): ResolvedBoss => {
  const index = (bossNumber - 1) % BOSSES.length;
  const cycle = Math.floor((bossNumber - 1) / BOSSES.length);
  const base = BOSSES[index] as BossDefinition;
  const prefix = BOSS_SCALING_CONFIG.prefixes[Math.min(cycle, BOSS_SCALING_CONFIG.prefixes.length - 1)] ?? '';
  return {
    ...base,
    name: `${prefix}${base.name}`,
    maxHealth: Math.round(base.maxHealth * (1 + cycle * BOSS_SCALING_CONFIG.healthPerCycle)),
    cycle,
    speedMultiplier: 1 + cycle * BOSS_SCALING_CONFIG.speedPerCycle,
    spawnRateMultiplier: 1 + cycle * BOSS_SCALING_CONFIG.spawnRatePerCycle,
    knockbackMultiplier: 1 + cycle * BOSS_SCALING_CONFIG.knockbackPerCycle,
  };
};

export const buildStage = (stageNumber: number, houseLevel: number, attempt = 0): StageDefinition => {
  const isBoss = isBossStage(stageNumber);
  const house = getHouseConfig(houseLevel);
  const progress = stageNumber - 1;
  const dirtBias: Partial<Record<DirtTypeId, number>> = {};
  for (const [type, perStage] of Object.entries(STAGE_CONFIG.toughDirtBiasPerStage) as [DirtTypeId, number][]) {
    dirtBias[type] = 1 + perStage * progress;
  }
  const dirtSeed = hashSeed('dirt', stageNumber, attempt);
  const common = {
    number: stageNumber,
    houseLevel,
    dirtSeed,
    dirtBias,
    reward: stageReward(houseLevel, isBoss),
    dirtDensity: Math.min(STAGE_CONFIG.maxDirtDensity, STAGE_CONFIG.baseDirtDensity + STAGE_CONFIG.dirtDensityPerStage * progress),
  };

  if (isBoss) {
    const boss = resolveBoss(stageNumber / STAGE_CONFIG.bossEvery);
    return {
      ...common,
      isBoss: true,
      boss,
      houseSeed: hashSeed('arena', boss.id),
      blueprint: {
        key: `arena:${boss.id}`,
        name: boss.arena.name,
        cellSize: boss.arena.cellSize,
        wallHeight: boss.arena.wallHeight,
        layout: boss.arena.layout,
        furnitureScale: boss.arena.furnitureScale,
        clutterCount: 0,
        props: boss.arena.props,
        isArena: true,
      },
      dirtDensity: common.dirtDensity * STAGE_CONFIG.bossDirtDensityFactor,
      requiredClean: STAGE_CONFIG.bossRequiredClean,
      mood: boss.arena.mood,
      title: `BOSS: ${boss.name}`,
    };
  }

  const clutter = Math.round(house.clutter[0] + ((house.clutter[1] - house.clutter[0]) * (stageNumber % 5)) / 4 + progress * STAGE_CONFIG.extraClutterPerStage);
  return {
    ...common,
    isBoss: false,
    boss: null,
    houseSeed: hashSeed('house', house.level),
    blueprint: {
      key: `house:${house.level}`,
      name: house.name,
      cellSize: house.cellSize,
      wallHeight: house.wallHeight,
      layout: house.layout,
      furnitureScale: house.furnitureScale,
      clutterCount: clutter,
      isArena: false,
    },
    requiredClean: Math.min(STAGE_CONFIG.maxRequiredClean, STAGE_CONFIG.baseRequiredClean + STAGE_CONFIG.requiredCleanPerStage * progress),
    mood: STAGE_CONFIG.moodCycle[progress % STAGE_CONFIG.moodCycle.length] ?? 'day',
    title: `Stage ${stageNumber}: ${house.name}`,
  };
};
