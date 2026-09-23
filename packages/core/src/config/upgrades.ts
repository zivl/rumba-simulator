import { HOUSES } from './houses';

export type UpgradeId =
  | 'battery'
  | 'batteryEfficiency'
  | 'chargingStation'
  | 'brush'
  | 'extraBrush'
  | 'advancedBrush'
  | 'vacuum'
  | 'vacuumEfficiency'
  | 'dirtRadar'
  | 'proximityRadar'
  | 'directionalRadar'
  | 'wallRadar'
  | 'advancedRadar'
  | 'infrared'
  | 'lights'
  | 'house';

export type UpgradeCategory = 'power' | 'charging' | 'brush' | 'vacuum' | 'radar' | 'vision' | 'lights' | 'house';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface UpgradePrerequisite {
  id: UpgradeId;
  minLevel: number;
}

export interface UpgradeDefinition {
  id: UpgradeId;
  name: string;
  icon: string;
  category: UpgradeCategory;
  rarity: Rarity;
  /** Level the player owns at the start of a new game. */
  startLevel: number;
  maxLevel: number;
  /** prices[i] is the cost of going from level (startLevel + i) to (startLevel + i + 1). */
  prices: readonly number[];
  prerequisites: readonly UpgradePrerequisite[];
  /** Earliest stage (1-based) on which the upgrade can appear in the shop. */
  minStage: number;
  description: string;
  /** Short text of the main gameplay effect at a given level. */
  effectAt: (level: number) => string;
}

export const RARITY_CONFIG: Record<Rarity, { weight: number; label: string; color: string }> = {
  common: { weight: 100, label: 'Common', color: '#9fb3c8' },
  rare: { weight: 55, label: 'Rare', color: '#4dabf7' },
  epic: { weight: 26, label: 'Epic', color: '#b57bff' },
  legendary: { weight: 11, label: 'Legendary', color: '#ffb020' },
};

/** Stat tables indexed by upgrade level. Index 0 means "not owned". */
export const UPGRADE_TABLES = {
  batteryCapacity: [0, 100, 130, 170, 220, 280, 350],
  batteryDrainMultiplier: [1, 0.9, 0.8, 0.72, 0.65, 0.58],
  chargeRate: [0, 7, 11, 16, 23, 32],
  brushPower: [0, 1, 1.35, 1.75, 2.2, 2.7],
  /** extraBrush level -> [coverage multiplier, rate multiplier, total side brushes]. */
  brushCoverage: [1, 1.35, 1.6],
  brushRate: [1, 1.3, 1.55],
  brushCount: [1, 2, 3],
  /** advancedBrush level -> multiplier applied to mud and hair cleaning. */
  advancedBrushBonus: [1, 1.5, 2, 2.6],
  vacuumPower: [0, 1, 1.4, 1.85, 2.4, 3],
  vacuumRange: [0, 0.6, 0.8, 1.0, 1.25, 1.5],
  vacuumDrainMultiplier: [1, 0.8, 0.65, 0.52, 0.42],
  lightIntensity: [0, 1, 1.45, 2, 2.7],
  lightRange: [0, 5, 7, 9.5, 12],
  lightDrainMultiplier: [0, 1, 0.85, 0.7, 0.55],
  dirtRadarRange: [0, 4, 6, 9],
  proximityRadarRange: [0, 4, 7],
  directionalRadarTargets: [0, 1, 3],
  wallRadarRange: [0, 6, 12],
  infraredDrainMultiplier: [0, 1, 0.5],
} as const;

const tableValue = (table: readonly number[], level: number): number =>
  table[Math.min(Math.max(level, 0), table.length - 1)] ?? 0;

const pct = (value: number): string => `${Math.round(value * 100)}%`;

export const UPGRADE_DEFINITIONS: Record<UpgradeId, UpgradeDefinition> = {
  battery: {
    id: 'battery',
    name: 'Super Battery',
    icon: '🔋',
    category: 'power',
    rarity: 'common',
    startLevel: 1,
    maxLevel: 6,
    prices: [250, 450, 700, 1000, 1400],
    prerequisites: [],
    minStage: 1,
    description: 'Bigger cells, longer cleaning runs.',
    effectAt: (level) => `${tableValue(UPGRADE_TABLES.batteryCapacity, level)} energy`,
  },
  batteryEfficiency: {
    id: 'batteryEfficiency',
    name: 'Eco Circuits',
    icon: '♻️',
    category: 'power',
    rarity: 'rare',
    startLevel: 0,
    maxLevel: 5,
    prices: [220, 380, 600, 850, 1150],
    prerequisites: [],
    minStage: 1,
    description: 'Smarter power management reduces all battery drain.',
    effectAt: (level) => `-${pct(1 - tableValue(UPGRADE_TABLES.batteryDrainMultiplier, level))} drain`,
  },
  chargingStation: {
    id: 'chargingStation',
    name: 'Turbo Dock',
    icon: '⚡',
    category: 'charging',
    rarity: 'common',
    startLevel: 1,
    maxLevel: 5,
    prices: [180, 350, 550, 850],
    prerequisites: [],
    minStage: 1,
    description: 'Upgraded charging station refills the battery faster.',
    effectAt: (level) => `${tableValue(UPGRADE_TABLES.chargeRate, level)} energy/s`,
  },
  brush: {
    id: 'brush',
    name: 'Power Brush',
    icon: '🧹',
    category: 'brush',
    rarity: 'common',
    startLevel: 1,
    maxLevel: 5,
    prices: [200, 400, 700, 1050],
    prerequisites: [],
    minStage: 1,
    description: 'Stiffer bristles scrub harder. Needed for stubborn mud.',
    effectAt: (level) => `${tableValue(UPGRADE_TABLES.brushPower, level).toFixed(2)}x brush power`,
  },
  extraBrush: {
    id: 'extraBrush',
    name: 'Extra Side Brush',
    icon: '🌀',
    category: 'brush',
    rarity: 'rare',
    startLevel: 0,
    maxLevel: 2,
    prices: [450, 950],
    prerequisites: [],
    minStage: 2,
    description: 'Another spinning brush: wider coverage and faster cleaning.',
    effectAt: (level) =>
      `${tableValue(UPGRADE_TABLES.brushCount, level)} brushes, +${pct(tableValue(UPGRADE_TABLES.brushCoverage, level) - 1)} width`,
  },
  advancedBrush: {
    id: 'advancedBrush',
    name: 'Nano-Bristle Brush',
    icon: '✨',
    category: 'brush',
    rarity: 'epic',
    startLevel: 0,
    maxLevel: 3,
    prices: [800, 1250, 1800],
    prerequisites: [
      { id: 'brush', minLevel: 2 },
      { id: 'extraBrush', minLevel: 1 },
    ],
    minStage: 3,
    description: 'Lab-grown bristles that shred mud and fur.',
    effectAt: (level) => `${tableValue(UPGRADE_TABLES.advancedBrushBonus, level)}x on mud & fur`,
  },
  vacuum: {
    id: 'vacuum',
    name: 'Cyclone Vacuum',
    icon: '🌪️',
    category: 'vacuum',
    rarity: 'common',
    startLevel: 1,
    maxLevel: 5,
    prices: [250, 450, 750, 1100],
    prerequisites: [],
    minStage: 1,
    description: 'More suction strength and range. Heavy debris needs power.',
    effectAt: (level) =>
      `${tableValue(UPGRADE_TABLES.vacuumPower, level).toFixed(2)}x suction, ${tableValue(UPGRADE_TABLES.vacuumRange, level)}m range`,
  },
  vacuumEfficiency: {
    id: 'vacuumEfficiency',
    name: 'Brushless Motor',
    icon: '⚙️',
    category: 'vacuum',
    rarity: 'rare',
    startLevel: 0,
    maxLevel: 4,
    prices: [200, 350, 550, 800],
    prerequisites: [],
    minStage: 2,
    description: 'Efficient vacuum motor uses less battery.',
    effectAt: (level) => `-${pct(1 - tableValue(UPGRADE_TABLES.vacuumDrainMultiplier, level))} vacuum drain`,
  },
  dirtRadar: {
    id: 'dirtRadar',
    name: 'Dirt Radar',
    icon: '📡',
    category: 'radar',
    rarity: 'rare',
    startLevel: 0,
    maxLevel: 3,
    prices: [300, 500, 800],
    prerequisites: [],
    minStage: 1,
    description: 'Minimap showing nearby dirt in line of sight.',
    effectAt: (level) => `${tableValue(UPGRADE_TABLES.dirtRadarRange, level)}m radar range`,
  },
  proximityRadar: {
    id: 'proximityRadar',
    name: 'Proximity Beeper',
    icon: '🔊',
    category: 'radar',
    rarity: 'common',
    startLevel: 0,
    maxLevel: 2,
    prices: [300, 550],
    prerequisites: [{ id: 'dirtRadar', minLevel: 1 }],
    minStage: 2,
    description: 'Beeps faster the closer you are to dirt.',
    effectAt: (level) => `${tableValue(UPGRADE_TABLES.proximityRadarRange, level)}m detection`,
  },
  directionalRadar: {
    id: 'directionalRadar',
    name: 'Directional Radar',
    icon: '🧭',
    category: 'radar',
    rarity: 'rare',
    startLevel: 0,
    maxLevel: 2,
    prices: [400, 700],
    prerequisites: [{ id: 'dirtRadar', minLevel: 1 }],
    minStage: 2,
    description: 'On-screen arrow pointing to the nearest dirt.',
    effectAt: (level) => `${tableValue(UPGRADE_TABLES.directionalRadarTargets, level)} target arrow(s)`,
  },
  wallRadar: {
    id: 'wallRadar',
    name: 'Wall-Penetrating Radar',
    icon: '🧱',
    category: 'radar',
    rarity: 'epic',
    startLevel: 0,
    maxLevel: 2,
    prices: [650, 1050],
    prerequisites: [{ id: 'dirtRadar', minLevel: 2 }],
    minStage: 3,
    description: 'See dirt through walls, highlighted in the world.',
    effectAt: (level) => `${tableValue(UPGRADE_TABLES.wallRadarRange, level)}m through walls`,
  },
  advancedRadar: {
    id: 'advancedRadar',
    name: 'Advanced Radar',
    icon: '🛰️',
    category: 'radar',
    rarity: 'legendary',
    startLevel: 0,
    maxLevel: 1,
    prices: [1500],
    prerequisites: [
      { id: 'dirtRadar', minLevel: 2 },
      { id: 'directionalRadar', minLevel: 1 },
    ],
    minStage: 4,
    description: 'Full house map with every speck of dirt, the dock and bosses.',
    effectAt: (level) => (level > 0 ? 'Full house map' : 'No map'),
  },
  infrared: {
    id: 'infrared',
    name: 'Infrared Vision',
    icon: '🌡️',
    category: 'vision',
    rarity: 'epic',
    startLevel: 0,
    maxLevel: 2,
    prices: [900, 1400],
    prerequisites: [{ id: 'dirtRadar', minLevel: 1 }],
    minStage: 3,
    description: 'Thermal view: dirt glows, bosses burn bright. Press I to toggle.',
    effectAt: (level) =>
      level <= 0 ? 'Locked' : `IR mode, ${pct(tableValue(UPGRADE_TABLES.infraredDrainMultiplier, level))} drain`,
  },
  lights: {
    id: 'lights',
    name: 'LED Headlights',
    icon: '💡',
    category: 'lights',
    rarity: 'common',
    startLevel: 1,
    maxLevel: 4,
    prices: [150, 300, 500],
    prerequisites: [],
    minStage: 1,
    description: 'Brighter, longer beams for dark rooms and under beds.',
    effectAt: (level) => `${tableValue(UPGRADE_TABLES.lightRange, level)}m beam`,
  },
  house: {
    id: 'house',
    name: 'Bigger House',
    icon: '🏠',
    category: 'house',
    rarity: 'rare',
    startLevel: 1,
    maxLevel: HOUSES.length,
    prices: HOUSES.slice(1).map((h) => h.price),
    prerequisites: [],
    minStage: 2,
    description: 'Move to a bigger house: more rooms, more dirt, +₪100 per stage.',
    effectAt: (level) => HOUSES[Math.min(level, HOUSES.length) - 1]?.name ?? 'Unknown',
  },
};

export const UPGRADE_IDS = Object.keys(UPGRADE_DEFINITIONS) as UpgradeId[];

export type UpgradeLevels = Record<UpgradeId, number>;

export const createStartingLevels = (): UpgradeLevels => {
  const levels = {} as UpgradeLevels;
  for (const id of UPGRADE_IDS) levels[id] = UPGRADE_DEFINITIONS[id].startLevel;
  return levels;
};

export const upgradeTableValue = tableValue;
