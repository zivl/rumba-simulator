export type DirtTypeId = 'dust' | 'dirt' | 'mud' | 'hair' | 'debris' | 'crumbs';

export type DirtShape = 'tuft' | 'lump' | 'blob' | 'strand' | 'chunk' | 'crumb' | 'footprint';

export interface DirtTypeConfig {
  id: DirtTypeId;
  label: string;
  /** Contribution of one particle to the cleaning percentage. */
  weight: number;
  /** Higher hardness means slower cleaning. */
  hardness: number;
  brushAffinity: number;
  vacuumAffinity: number;
  /** Below this vacuum power the vacuum is much less effective on this type. */
  minVacuumPower: number;
  /** Below this brush power the brush is much less effective on this type. */
  minBrushPower: number;
  /** Whether the vacuum can pull this particle across the floor. */
  suckable: boolean;
  /** 0 = flies to the roomba, 1 = does not move. */
  pullResistance: number;
  size: readonly [number, number];
  shape: DirtShape;
  colors: readonly string[];
  /** How dark the floor stain under this particle is (0..1). */
  stain: number;
}

export const DIRT_TYPES: Record<DirtTypeId, DirtTypeConfig> = {
  dust: {
    id: 'dust',
    label: 'Dust',
    weight: 1,
    hardness: 0.45,
    brushAffinity: 1,
    vacuumAffinity: 1.6,
    minVacuumPower: 0,
    minBrushPower: 0,
    suckable: true,
    pullResistance: 0.1,
    size: [0.035, 0.07],
    shape: 'tuft',
    colors: ['#9a9a94', '#b5b3aa', '#85847e'],
    stain: 0.25,
  },
  dirt: {
    id: 'dirt',
    label: 'Dirt',
    weight: 1.2,
    hardness: 1,
    brushAffinity: 1,
    vacuumAffinity: 1,
    minVacuumPower: 0,
    minBrushPower: 0,
    suckable: true,
    pullResistance: 0.35,
    size: [0.025, 0.05],
    shape: 'lump',
    colors: ['#6b4a2b', '#5a3d22', '#7a5835'],
    stain: 0.45,
  },
  mud: {
    id: 'mud',
    label: 'Mud',
    weight: 2,
    hardness: 2.6,
    brushAffinity: 1.25,
    vacuumAffinity: 0.3,
    minVacuumPower: 0,
    minBrushPower: 1.3,
    suckable: false,
    pullResistance: 1,
    size: [0.08, 0.16],
    shape: 'blob',
    colors: ['#4a3219', '#3e2a14', '#553a1e'],
    stain: 0.75,
  },
  hair: {
    id: 'hair',
    label: 'Hair & Fur',
    weight: 1,
    hardness: 1.3,
    brushAffinity: 2.6,
    vacuumAffinity: 0.45,
    minVacuumPower: 0,
    minBrushPower: 0,
    suckable: true,
    pullResistance: 0.55,
    size: [0.05, 0.11],
    shape: 'strand',
    colors: ['#d9c7a3', '#3b2f25', '#f2efe8', '#a5774a'],
    stain: 0.1,
  },
  debris: {
    id: 'debris',
    label: 'Large Debris',
    weight: 2.5,
    hardness: 2,
    brushAffinity: 0.45,
    vacuumAffinity: 1.25,
    minVacuumPower: 1.35,
    minBrushPower: 0,
    suckable: true,
    pullResistance: 0.8,
    size: [0.045, 0.075],
    shape: 'chunk',
    colors: ['#8c8c8c', '#a0522d', '#d4a017', '#3c6e71'],
    stain: 0.2,
  },
  crumbs: {
    id: 'crumbs',
    label: 'Food Crumbs',
    weight: 0.8,
    hardness: 0.8,
    brushAffinity: 1,
    vacuumAffinity: 1.35,
    minVacuumPower: 0,
    minBrushPower: 0,
    suckable: true,
    pullResistance: 0.2,
    size: [0.018, 0.035],
    shape: 'crumb',
    colors: ['#e0b060', '#c8913a', '#f0d38a'],
    stain: 0.3,
  },
};

export const DIRT_TYPE_IDS = Object.keys(DIRT_TYPES) as DirtTypeId[];

export const CLEANING_CONFIG = {
  /** Global scale converting affinities into health per second. */
  baseRate: 3,
  /** Effect of just driving over dirt with brush and vacuum off. */
  passiveEffect: 0.15,
  /** Effectiveness when below a type's minimum brush/vacuum power. */
  underpoweredFactor: 0.3,
  /** Intake radius as a fraction of the roomba radius (without extra brushes). */
  intakeRadiusFactor: 0.95,
  /** Intake radius when the brush is off. */
  intakeNoBrushFactor: 0.7,
  vacuumPullSpeed: 0.9,
  /** Vacuum only pulls dirt inside this half-angle in front (radians). */
  vacuumPullHalfAngle: 1.9,
  pickupSoundInterval: 0.06,
} as const;

export const DIRT_GENERATION_CONFIG = {
  /** Particles per square meter at density 1. */
  baseDensity: 7,
  clusterSize: [4, 12] as readonly [number, number],
  clusterSpread: [0.12, 0.45] as readonly [number, number],
  /** Probability that a cluster hugs a wall or furniture edge (dust bunnies). */
  edgeBias: 0.55,
  wallMargin: 0.1,
  maxParticles: 4200,
  mudPatchParticles: [2, 5] as readonly [number, number],
} as const;
