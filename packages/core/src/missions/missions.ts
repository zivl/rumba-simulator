import type { BossRuntime } from '../bosses/bossController';
import type { StageDefinition } from '../stages/stages';

export type ObjectiveId = 'clean' | 'survive' | 'neutralize';

export interface MissionObjective {
  id: ObjectiveId;
  label: string;
  detail: string;
  progress: number;
  done: boolean;
}

export interface MissionState {
  title: string;
  objectives: MissionObjective[];
  hint: string;
  complete: boolean;
}

const pct = (v: number): string => `${Math.floor(v * 100)}%`;

export const evaluateMission = (stage: StageDefinition, cleanFraction: number, boss: BossRuntime | null): MissionState => {
  const required = stage.requiredClean;
  if (!stage.isBoss || !boss) {
    const done = cleanFraction >= required;
    return {
      title: 'MISSION',
      objectives: [
        {
          id: 'clean',
          label: `Clean ${pct(required)} of the house`,
          detail: `${pct(cleanFraction)} / ${pct(required)}`,
          progress: Math.min(1, cleanFraction / required),
          done,
        },
      ],
      hint: 'Return to the charging station if the battery runs low.',
      complete: done,
    };
  }
  const neutralized = boss.phase !== 'active';
  const cleanDone = neutralized && cleanFraction >= required;
  const hits = boss.def.maxHealth - boss.health;
  return {
    title: 'BOSS MISSION',
    objectives: [
      {
        id: 'survive',
        label: `Survive ${boss.def.name}`,
        detail: neutralized ? 'Survived!' : 'Keep your battery alive',
        progress: neutralized ? 1 : 0,
        done: neutralized,
      },
      {
        id: 'neutralize',
        label: 'Neutralize the boss',
        detail: neutralized
          ? 'Neutralized!'
          : `Ram it with the vacuum ON (${Math.ceil(hits * 10) / 10} / ${boss.def.maxHealth})`,
        progress: Math.min(1, hits / boss.def.maxHealth),
        done: neutralized,
      },
      {
        id: 'clean',
        label: `Clean the mess (${pct(required)})`,
        detail: `${pct(cleanFraction)} / ${pct(required)}`,
        progress: Math.min(1, cleanFraction / required),
        done: cleanDone,
      },
    ],
    hint: 'Upgraded vacuums hit harder. The dock still works during boss fights.',
    complete: neutralized && cleanDone,
  };
};
