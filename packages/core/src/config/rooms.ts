import type { DirtTypeId } from './dirt';

export type RoomType =
  | 'living'
  | 'kitchen'
  | 'dining'
  | 'bedroom'
  | 'masterBedroom'
  | 'bathroom'
  | 'hallway'
  | 'office'
  | 'playroom'
  | 'laundry';

export type FloorMaterial = 'wood' | 'woodDark' | 'tile' | 'tileSmall' | 'carpet' | 'laminate' | 'concrete';

export type FurnitureKind =
  | 'sofa'
  | 'armchair'
  | 'coffeeTable'
  | 'tvStand'
  | 'bookshelf'
  | 'plant'
  | 'floorLamp'
  | 'diningSet'
  | 'counterRun'
  | 'fridge'
  | 'stove'
  | 'kitchenIsland'
  | 'bed'
  | 'singleBed'
  | 'nightstand'
  | 'wardrobe'
  | 'dresser'
  | 'desk'
  | 'bathtub'
  | 'toilet'
  | 'sinkCabinet'
  | 'washingMachine'
  | 'shoeRack'
  | 'console'
  | 'toyChest'
  | 'rug'
  // Clutter, spawned per stage.
  | 'shoe'
  | 'toyBlock'
  | 'ball'
  | 'laundryBasket'
  | 'petBowl'
  // Giant boss arena props.
  | 'giantDustPile'
  | 'giantYarnBall'
  | 'catTree'
  | 'giantBone'
  | 'dogBed'
  | 'giantToyBlock'
  | 'giantBall'
  | 'giantBoot';

export type FurniturePlacement = 'wall' | 'center' | 'corner' | 'free';

export interface FurnitureSpawn {
  kind: FurnitureKind;
  placement: FurniturePlacement;
  count: readonly [number, number];
  chance?: number;
}

export interface RoomTypeConfig {
  label: string;
  floor: FloorMaterial;
  dirtDensity: number;
  dirtWeights: Partial<Record<DirtTypeId, number>>;
  furniture: readonly FurnitureSpawn[];
  wallColor: string;
}

export const ROOM_TYPES: Record<RoomType, RoomTypeConfig> = {
  living: {
    label: 'Living Room',
    floor: 'wood',
    dirtDensity: 1,
    dirtWeights: { dust: 5, hair: 3, dirt: 2, crumbs: 1, debris: 0.6 },
    furniture: [
      { kind: 'rug', placement: 'center', count: [1, 1] },
      { kind: 'sofa', placement: 'wall', count: [1, 1] },
      { kind: 'coffeeTable', placement: 'center', count: [1, 1] },
      { kind: 'tvStand', placement: 'wall', count: [1, 1] },
      { kind: 'armchair', placement: 'corner', count: [0, 2] },
      { kind: 'bookshelf', placement: 'wall', count: [0, 1] },
      { kind: 'plant', placement: 'corner', count: [1, 2] },
      { kind: 'floorLamp', placement: 'corner', count: [0, 1] },
    ],
    wallColor: '#e9e2d6',
  },
  kitchen: {
    label: 'Kitchen',
    floor: 'tile',
    dirtDensity: 1.25,
    dirtWeights: { crumbs: 6, dirt: 2, debris: 1.5, dust: 1, mud: 0.4 },
    furniture: [
      { kind: 'counterRun', placement: 'wall', count: [1, 2] },
      { kind: 'fridge', placement: 'corner', count: [1, 1] },
      { kind: 'stove', placement: 'wall', count: [1, 1] },
      { kind: 'kitchenIsland', placement: 'center', count: [0, 1], chance: 0.5 },
    ],
    wallColor: '#f3efe6',
  },
  dining: {
    label: 'Dining Room',
    floor: 'woodDark',
    dirtDensity: 1.1,
    dirtWeights: { crumbs: 5, dust: 2, dirt: 1, hair: 1, debris: 0.8 },
    furniture: [
      { kind: 'rug', placement: 'center', count: [0, 1], chance: 0.6 },
      { kind: 'diningSet', placement: 'center', count: [1, 1] },
      { kind: 'console', placement: 'wall', count: [0, 1] },
      { kind: 'plant', placement: 'corner', count: [0, 2] },
    ],
    wallColor: '#e6ddcf',
  },
  bedroom: {
    label: 'Bedroom',
    floor: 'laminate',
    dirtDensity: 0.9,
    dirtWeights: { dust: 5, hair: 4, dirt: 1, debris: 0.3 },
    furniture: [
      { kind: 'singleBed', placement: 'wall', count: [1, 1] },
      { kind: 'nightstand', placement: 'wall', count: [1, 1] },
      { kind: 'wardrobe', placement: 'wall', count: [1, 1] },
      { kind: 'desk', placement: 'wall', count: [0, 1], chance: 0.5 },
      { kind: 'rug', placement: 'center', count: [0, 1], chance: 0.5 },
    ],
    wallColor: '#dfe6ec',
  },
  masterBedroom: {
    label: 'Master Bedroom',
    floor: 'carpet',
    dirtDensity: 0.9,
    dirtWeights: { dust: 5, hair: 5, dirt: 0.8 },
    furniture: [
      { kind: 'bed', placement: 'wall', count: [1, 1] },
      { kind: 'nightstand', placement: 'wall', count: [2, 2] },
      { kind: 'wardrobe', placement: 'wall', count: [1, 2] },
      { kind: 'dresser', placement: 'wall', count: [0, 1] },
      { kind: 'armchair', placement: 'corner', count: [0, 1] },
      { kind: 'plant', placement: 'corner', count: [0, 1] },
    ],
    wallColor: '#e8dfe4',
  },
  bathroom: {
    label: 'Bathroom',
    floor: 'tileSmall',
    dirtDensity: 1.1,
    dirtWeights: { hair: 4, dirt: 3, mud: 1.5, dust: 1 },
    furniture: [
      { kind: 'bathtub', placement: 'wall', count: [1, 1], chance: 0.8 },
      { kind: 'toilet', placement: 'wall', count: [1, 1] },
      { kind: 'sinkCabinet', placement: 'wall', count: [1, 1] },
    ],
    wallColor: '#dceef0',
  },
  hallway: {
    label: 'Hallway',
    floor: 'wood',
    dirtDensity: 1.2,
    dirtWeights: { mud: 3, dirt: 4, dust: 3, debris: 1, hair: 1 },
    furniture: [
      { kind: 'shoeRack', placement: 'wall', count: [0, 1] },
      { kind: 'console', placement: 'wall', count: [0, 1], chance: 0.5 },
      { kind: 'plant', placement: 'corner', count: [0, 1] },
    ],
    wallColor: '#ebe5da',
  },
  office: {
    label: 'Office',
    floor: 'laminate',
    dirtDensity: 0.85,
    dirtWeights: { dust: 5, debris: 2, crumbs: 2, hair: 1 },
    furniture: [
      { kind: 'desk', placement: 'wall', count: [1, 1] },
      { kind: 'bookshelf', placement: 'wall', count: [1, 2] },
      { kind: 'plant', placement: 'corner', count: [0, 1] },
      { kind: 'armchair', placement: 'corner', count: [0, 1] },
    ],
    wallColor: '#e4e8df',
  },
  playroom: {
    label: 'Playroom',
    floor: 'carpet',
    dirtDensity: 1.3,
    dirtWeights: { crumbs: 3, debris: 3, dirt: 2, mud: 1, hair: 1, dust: 2 },
    furniture: [
      { kind: 'rug', placement: 'center', count: [1, 1] },
      { kind: 'toyChest', placement: 'wall', count: [1, 1] },
      { kind: 'bookshelf', placement: 'wall', count: [0, 1] },
      { kind: 'toyBlock', placement: 'free', count: [3, 6] },
      { kind: 'ball', placement: 'free', count: [1, 2] },
    ],
    wallColor: '#f2e6c9',
  },
  laundry: {
    label: 'Laundry',
    floor: 'concrete',
    dirtDensity: 1.1,
    dirtWeights: { hair: 3, dust: 3, dirt: 2, mud: 1 },
    furniture: [
      { kind: 'washingMachine', placement: 'wall', count: [1, 2] },
      { kind: 'laundryBasket', placement: 'corner', count: [1, 1] },
    ],
    wallColor: '#e3e3e3',
  },
};

/** Clutter that appears per stage to vary obstacles. */
export const CLUTTER_KINDS: readonly FurnitureKind[] = ['shoe', 'toyBlock', 'ball', 'laundryBasket', 'petBowl'];
