import type { DirtTypeId } from './dirt';
import type { FurnitureKind } from './rooms';
import type { LightingMood } from './stages';

export type BossModel = 'dustCloud' | 'mudCloud' | 'child' | 'cat' | 'dog';

export type BossMovementConfig =
  | { type: 'wander'; speed: number; retargetInterval: readonly [number, number] }
  | { type: 'erratic'; speed: number; retargetInterval: readonly [number, number] }
  | {
      type: 'chase';
      speed: number;
      wanderSpeed: number;
      range: number;
      chaseDuration: number;
      cooldown: number;
      retargetInterval: readonly [number, number];
    };

export type BossAbilityConfig =
  | { type: 'trail'; dirtType: DirtTypeId; spacing: number; footprints: boolean; size: number }
  | { type: 'burst'; dirtType: DirtTypeId; count: number; radius: number; interval: readonly [number, number] }
  | {
      type: 'pause';
      chancePerSecond: number;
      duration: readonly [number, number];
      dirtType?: DirtTypeId;
      dirtPerSecond?: number;
    }
  | { type: 'knockback'; force: number; cooldown: number; spin: number; batteryDrain: number }
  | { type: 'aura'; radius: number; slowFactor: number; fog: number; vacuumPenalty: number };

export interface ArenaConfig {
  name: string;
  cellSize: number;
  wallHeight: number;
  furnitureScale: number;
  layout: readonly string[];
  props: readonly { kind: FurnitureKind; count: number }[];
  mood: LightingMood;
}

export interface BossDefinition {
  id: string;
  name: string;
  nickname: string;
  tagline: string;
  icon: string;
  color: string;
  model: BossModel;
  radius: number;
  maxHealth: number;
  movement: BossMovementConfig;
  abilities: readonly BossAbilityConfig[];
  neutralized: { behavior: 'vanish' | 'sleep'; line: string };
  initialMess: readonly { dirtType: DirtTypeId; count: number }[];
  arena: ArenaConfig;
  /** Hard cap on dirt a boss may add, to keep the stage solvable. */
  maxSpawnedDirt: number;
}

const ARENA_LIVING_WING: readonly string[] = [
  'LLLLLLLKKKKK',
  'LLLLLLLKKKKK',
  'LLLLLLLKKKKK',
  'LLLLLLLDDDDD',
  'HHHHHHHDDDDD',
  'BBBBBHHDDDDD',
  'BBBBBHHDDDDD',
  'BBBBBHHDDDDD',
];

const ARENA_PLAY_WING: readonly string[] = [
  'PPPPPPLLLL',
  'PPPPPPLLLL',
  'PPPPPPLLLL',
  'PPPPPPLLLL',
  'HHHHHHHHHH',
  'KKKKHBBBBB',
  'KKKKHBBBBB',
  'KKKKHBBBBB',
  'TTTTHBBBBB',
  'TTTTHBBBBB',
];

export const BOSS_COMBAT_CONFIG = {
  minRamSpeed: 0.55,
  baseDamage: 1,
  brushDamageBonus: 0.25,
  /** Damage is multiplied by vacuum power, so vacuum upgrades matter in boss fights. */
  requiresVacuum: true,
  hitCooldown: 1.1,
  fleeDuration: 1.8,
  fleeSpeedFactor: 1.35,
  roombaRamRecoil: 1.6,
  introFadeIn: 1.2,
  neutralizeVanishTime: 2.2,
} as const;

export const BOSS_SCALING_CONFIG = {
  healthPerCycle: 0.5,
  speedPerCycle: 0.12,
  spawnRatePerCycle: 0.3,
  knockbackPerCycle: 0.2,
  prefixes: ['', 'MEGA ', 'ULTRA ', 'HYPER ', 'OMEGA '] as readonly string[],
} as const;

export const BOSSES: readonly BossDefinition[] = [
  {
    id: 'giantDustCloud',
    name: 'GIANT DUST CLOUD',
    nickname: 'The Dust Bunny Supreme',
    tagline: 'It has lived under the couch since 2009. It has grown. It has ambitions.',
    icon: '🌫️',
    color: '#b9b4a8',
    model: 'dustCloud',
    radius: 0.75,
    maxHealth: 6,
    movement: { type: 'wander', speed: 0.75, retargetInterval: [3, 6] },
    abilities: [
      { type: 'trail', dirtType: 'dust', spacing: 0.3, footprints: false, size: 1.4 },
      { type: 'burst', dirtType: 'dust', count: 14, radius: 1.2, interval: [4, 7] },
      { type: 'aura', radius: 1.9, slowFactor: 0.6, fog: 0.75, vacuumPenalty: 0.5 },
    ],
    neutralized: { behavior: 'vanish', line: 'The Dust Cloud collapses into a very sad pile.' },
    initialMess: [{ dirtType: 'dust', count: 140 }],
    arena: {
      name: 'The Dusty Manor',
      cellSize: 1.9,
      wallHeight: 4.2,
      furnitureScale: 1.7,
      layout: ARENA_LIVING_WING,
      props: [{ kind: 'giantDustPile', count: 5 }],
      mood: 'evening',
    },
    maxSpawnedDirt: 900,
  },
  {
    id: 'mudBootCloud',
    name: 'LIVING DUST CLOUD WITH MUD BOOTS',
    nickname: 'Stompy McDustface',
    tagline: 'Someone gave the dust cloud boots. Nobody knows who. Nobody knows why.',
    icon: '🥾',
    color: '#8a7355',
    model: 'mudCloud',
    radius: 0.7,
    maxHealth: 8,
    movement: { type: 'wander', speed: 0.95, retargetInterval: [2.5, 5] },
    abilities: [
      { type: 'trail', dirtType: 'mud', spacing: 0.5, footprints: true, size: 1.7 },
      { type: 'trail', dirtType: 'dust', spacing: 0.6, footprints: false, size: 1.2 },
      { type: 'burst', dirtType: 'dust', count: 10, radius: 1, interval: [5, 8] },
      { type: 'aura', radius: 1.5, slowFactor: 0.7, fog: 0.5, vacuumPenalty: 0.35 },
      { type: 'knockback', force: 2.2, cooldown: 2.4, spin: 4, batteryDrain: 1 },
    ],
    neutralized: { behavior: 'vanish', line: 'Stompy kicks off the boots and evaporates. The boots stay.' },
    initialMess: [
      { dirtType: 'dust', count: 90 },
      { dirtType: 'mud', count: 40 },
    ],
    arena: {
      name: 'The Stomping Grounds',
      cellSize: 1.9,
      wallHeight: 4.2,
      furnitureScale: 1.7,
      layout: ARENA_LIVING_WING,
      props: [
        { kind: 'giantBoot', count: 3 },
        { kind: 'giantDustPile', count: 2 },
      ],
      mood: 'day',
    },
    maxSpawnedDirt: 800,
  },
  {
    id: 'muddyChild',
    name: 'MUDDY CHILD',
    nickname: 'Little Timmy (Just Back From The Park)',
    tagline: 'He was told to take his boots off at the door. He heard "run laps".',
    icon: '🧒',
    color: '#ff8c42',
    model: 'child',
    radius: 0.32,
    maxHealth: 7,
    movement: { type: 'erratic', speed: 2.1, retargetInterval: [0.5, 1.4] },
    abilities: [
      { type: 'trail', dirtType: 'mud', spacing: 0.32, footprints: true, size: 0.9 },
      { type: 'burst', dirtType: 'crumbs', count: 12, radius: 0.6, interval: [5, 8] },
      { type: 'knockback', force: 2.8, cooldown: 2, spin: 5, batteryDrain: 1 },
    ],
    neutralized: { behavior: 'vanish', line: 'Timmy has been sent to the bath. Victory tastes like soap.' },
    initialMess: [
      { dirtType: 'mud', count: 50 },
      { dirtType: 'crumbs', count: 60 },
    ],
    arena: {
      name: "Timmy's Playhouse",
      cellSize: 1.8,
      wallHeight: 4,
      furnitureScale: 1.6,
      layout: ARENA_PLAY_WING,
      props: [
        { kind: 'giantToyBlock', count: 6 },
        { kind: 'giantBall', count: 2 },
      ],
      mood: 'day',
    },
    maxSpawnedDirt: 800,
  },
  {
    id: 'sheddingCat',
    name: 'SHEDDING CAT',
    nickname: 'Lord Fluffington III',
    tagline: 'Sheds 4kg of fur a day. Weighs 3kg. Science cannot explain it.',
    icon: '🐈',
    color: '#f4a261',
    model: 'cat',
    radius: 0.34,
    maxHealth: 9,
    movement: { type: 'wander', speed: 1.4, retargetInterval: [1.2, 3] },
    abilities: [
      { type: 'trail', dirtType: 'hair', spacing: 0.28, footprints: false, size: 1.1 },
      { type: 'pause', chancePerSecond: 0.2, duration: [1.5, 3.5], dirtType: 'hair', dirtPerSecond: 7 },
      { type: 'burst', dirtType: 'hair', count: 16, radius: 0.5, interval: [6, 10] },
      { type: 'knockback', force: 3.2, cooldown: 2.5, spin: 7, batteryDrain: 1.5 },
    ],
    neutralized: { behavior: 'sleep', line: 'Lord Fluffington found a sunbeam. He is asleep. Do not wake him.' },
    initialMess: [{ dirtType: 'hair', count: 150 }],
    arena: {
      name: 'The Fur Palace',
      cellSize: 1.8,
      wallHeight: 4,
      furnitureScale: 1.6,
      layout: ARENA_PLAY_WING,
      props: [
        { kind: 'giantYarnBall', count: 3 },
        { kind: 'catTree', count: 2 },
      ],
      mood: 'evening',
    },
    maxSpawnedDirt: 900,
  },
  {
    id: 'dog',
    name: 'DOG',
    nickname: 'Sir Barksalot',
    tagline: 'He loves you. He loves you SO much. He simply must tackle you.',
    icon: '🐕',
    color: '#c8872f',
    model: 'dog',
    radius: 0.42,
    maxHealth: 10,
    movement: {
      type: 'chase',
      speed: 2.3,
      wanderSpeed: 1.2,
      range: 5,
      chaseDuration: 4,
      cooldown: 3,
      retargetInterval: [1.5, 3],
    },
    abilities: [
      { type: 'trail', dirtType: 'hair', spacing: 0.35, footprints: false, size: 1.2 },
      { type: 'trail', dirtType: 'dirt', spacing: 0.3, footprints: true, size: 0.55 },
      { type: 'burst', dirtType: 'mud', count: 10, radius: 0.9, interval: [7, 11] },
      { type: 'knockback', force: 5.5, cooldown: 1.4, spin: 9, batteryDrain: 2 },
    ],
    neutralized: { behavior: 'sleep', line: 'Sir Barksalot is exhausted and snoring. Good boy.' },
    initialMess: [
      { dirtType: 'hair', count: 90 },
      { dirtType: 'dirt', count: 60 },
    ],
    arena: {
      name: 'The Doghouse (Inside)',
      cellSize: 1.9,
      wallHeight: 4.2,
      furnitureScale: 1.7,
      layout: ARENA_LIVING_WING,
      props: [
        { kind: 'dogBed', count: 1 },
        { kind: 'giantBone', count: 2 },
        { kind: 'giantBall', count: 1 },
      ],
      mood: 'day',
    },
    maxSpawnedDirt: 900,
  },
];
