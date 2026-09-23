import type { RoomType } from './rooms';

/**
 * Layout legend. Each character is one grid cell. Different characters are different
 * rooms, so two neighbouring bedrooms use different letters (B, b, c, e).
 */
export const LAYOUT_LEGEND: Record<string, RoomType> = {
  L: 'living',
  K: 'kitchen',
  D: 'dining',
  B: 'bedroom',
  b: 'bedroom',
  c: 'bedroom',
  e: 'bedroom',
  M: 'masterBedroom',
  T: 'bathroom',
  t: 'bathroom',
  y: 'bathroom',
  H: 'hallway',
  h: 'hallway',
  O: 'office',
  P: 'playroom',
  U: 'laundry',
};

export const OUTSIDE_CELL = '.';

export interface HouseConfig {
  level: number;
  name: string;
  description: string;
  /** Price to buy this house (level 1 is free). */
  price: number;
  cellSize: number;
  wallHeight: number;
  layout: readonly string[];
  furnitureScale: number;
  clutter: readonly [number, number];
}

export const WALL_CONFIG = {
  thickness: 0.12,
  doorHeight: 2.05,
  baseboardHeight: 0.08,
  windowChance: 0.35,
} as const;

export const HOUSES: readonly HouseConfig[] = [
  {
    level: 1,
    name: 'Studio Apartment',
    description: 'A tiny city studio. Cozy, cramped and surprisingly dusty.',
    price: 0,
    cellSize: 1.25,
    wallHeight: 2.6,
    furnitureScale: 1,
    clutter: [2, 4],
    layout: ['KKKLLLL', 'KKKLLLL', 'KKKLLLL', 'TTBBLLL', 'TTBBLLL', 'TTBBLLL'],
  },
  {
    level: 2,
    name: 'Cozy Apartment',
    description: 'Two bedrooms, a dining nook and a hallway full of shoes.',
    price: 800,
    cellSize: 1.25,
    wallHeight: 2.6,
    furnitureScale: 1,
    clutter: [3, 5],
    layout: ['KKKDDLLLL', 'KKKDDLLLL', 'KKKDDLLLL', 'HHHHHHLLL', 'BBBTTHbbb', 'BBBTTHbbb', 'BBBTTHbbb'],
  },
  {
    level: 3,
    name: 'Family Apartment',
    description: 'A proper family flat with a master bedroom and a laundry corner.',
    price: 1500,
    cellSize: 1.25,
    wallHeight: 2.6,
    furnitureScale: 1,
    clutter: [4, 7],
    layout: [
      'KKKKDDDLLLL',
      'KKKKDDDLLLL',
      'KKKKDDDLLLL',
      'HHHHHHHHHLL',
      'MMMMTTHbbbb',
      'MMMMTTHbbbb',
      'MMMMUUHbbbb',
      'MMMMUUHbbbb',
    ],
  },
  {
    level: 4,
    name: 'Suburban House',
    description: 'Long corridors, three bedrooms and two bathrooms.',
    price: 2400,
    cellSize: 1.25,
    wallHeight: 2.7,
    furnitureScale: 1,
    clutter: [5, 8],
    layout: [
      'KKKKDDDDLLLLL',
      'KKKKDDDDLLLLL',
      'KKKKDDDDLLLLL',
      'KKKKDDDDLLLLL',
      'HHHHHHHHHHHHH',
      'MMMMMTTHbbbbb',
      'MMMMMTTHbbbbb',
      'MMMMMttHbbbbb',
      'MMMMMttHccccc',
      'MMMMMUUHccccc',
    ],
  },
  {
    level: 5,
    name: 'Large House',
    description: 'An office, a playroom and a maze of hallways.',
    price: 3500,
    cellSize: 1.25,
    wallHeight: 2.7,
    furnitureScale: 1,
    clutter: [6, 10],
    layout: [
      'LLLLLLLLDDDDKKKK',
      'LLLLLLLLDDDDKKKK',
      'LLLLLLLLDDDDKKKK',
      'LLLLLLLLDDDDKKKK',
      'LLLLLLLLDDDDKKKK',
      'HHHHHHHHHHHHHHHH',
      'OOOOTTHPPPPPUUUU',
      'OOOOTTHPPPPPUUUU',
      'OOOOHHHHHHHHHHHH',
      'MMMMMMttHbbbbccc',
      'MMMMMMttHbbbbccc',
      'MMMMMMttHbbbbccc',
    ],
  },
  {
    level: 6,
    name: 'Villa',
    description: 'Spacious villa with four bedrooms. The dust has room to breathe.',
    price: 5000,
    cellSize: 1.25,
    wallHeight: 2.8,
    furnitureScale: 1,
    clutter: [8, 12],
    layout: [
      'LLLLLLLLLDDDDDKKKK',
      'LLLLLLLLLDDDDDKKKK',
      'LLLLLLLLLDDDDDKKKK',
      'LLLLLLLLLDDDDDKKKK',
      'LLLLLLLLLDDDDDUUUU',
      'HHHHHHHHHHHHHHHHHH',
      'OOOOOTTHPPPPPPbbbb',
      'OOOOOTTHPPPPPPbbbb',
      'OOOOOHHHHHHHHHHHHH',
      'MMMMMMMttHccccceee',
      'MMMMMMMttHccccceee',
      'MMMMMMMttHccccceee',
      'MMMMMMMttHccccceee',
    ],
  },
  {
    level: 7,
    name: 'Mansion',
    description: 'A sprawling mansion with a grand living hall and two corridors.',
    price: 7000,
    cellSize: 1.25,
    wallHeight: 3,
    furnitureScale: 1,
    clutter: [10, 14],
    layout: [
      'LLLLLLLLLLDDDDDKKKKK',
      'LLLLLLLLLLDDDDDKKKKK',
      'LLLLLLLLLLDDDDDKKKKK',
      'LLLLLLLLLLDDDDDKKKKK',
      'LLLLLLLLLLDDDDDKKKKK',
      'LLLLLLLLLLDDDDDKKKKK',
      'HHHHHHHHHHHHHHHHHHHH',
      'OOOOOTTHPPPPPPHUUUUU',
      'OOOOOTTHPPPPPPHUUUUU',
      'OOOOOTTHPPPPPPHUUUUU',
      'OOOOOHHHHHHHHHHHHHHH',
      'MMMMMMMttHbbbbbHcccc',
      'MMMMMMMttHbbbbbHcccc',
      'MMMMMMMttHbbbbbHcccc',
      'MMMMMMMttHbbbbbHcccc',
    ],
  },
  {
    level: 8,
    name: 'Grand Estate',
    description: 'The ultimate cleaning challenge. Bring a big battery.',
    price: 9500,
    cellSize: 1.25,
    wallHeight: 3.1,
    furnitureScale: 1,
    clutter: [12, 18],
    layout: [
      'LLLLLLLLLLLDDDDDDKKKKK',
      'LLLLLLLLLLLDDDDDDKKKKK',
      'LLLLLLLLLLLDDDDDDKKKKK',
      'LLLLLLLLLLLDDDDDDKKKKK',
      'LLLLLLLLLLLDDDDDDKKKKK',
      'LLLLLLLLLLLDDDDDDKKKKK',
      'HHHHHHHHHHHHHHHHHHHHHH',
      'OOOOOOTTHPPPPPPPHUUUUU',
      'OOOOOOTTHPPPPPPPHUUUUU',
      'OOOOOOTTHPPPPPPPHUUUUU',
      'OOOOOOHHHHHHHHHHHHHHHH',
      'MMMMMMMMttHbbbbbHccccc',
      'MMMMMMMMttHbbbbbHccccc',
      'MMMMMMMMttHbbbbbHccccc',
      'MMMMMMMMttHbbbbbHccccc',
      'MMMMMMMMttHbbbbbHccccc',
    ],
  },
];

export const MAX_HOUSE_LEVEL = HOUSES.length;

export const getHouseConfig = (level: number): HouseConfig =>
  HOUSES[Math.min(Math.max(level, 1), HOUSES.length) - 1] as HouseConfig;
