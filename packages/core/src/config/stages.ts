import type { DirtTypeId } from './dirt';

export type LightingMood = 'day' | 'evening' | 'night';

export const STAGE_CONFIG = {
  bossEvery: 10,
  baseRequiredClean: 0.9,
  requiredCleanPerStage: 0.01,
  maxRequiredClean: 0.96,
  bossRequiredClean: 0.85,
  /** Arenas are huge, so ambient dirt is thinned out; the boss makes the rest. */
  bossDirtDensityFactor: 0.16,
  baseDirtDensity: 1,
  dirtDensityPerStage: 0.07,
  maxDirtDensity: 2.2,
  /** Lighting mood by position inside each 10-stage cycle. */
  moodCycle: ['day', 'day', 'evening', 'day', 'night', 'day', 'evening', 'night', 'evening'] as readonly LightingMood[],
  /** Extra weight added to tougher dirt types as stages progress. */
  toughDirtBiasPerStage: { mud: 0.08, debris: 0.05, hair: 0.04 } as Partial<Record<DirtTypeId, number>>,
  extraClutterPerStage: 0.35,
} as const;
