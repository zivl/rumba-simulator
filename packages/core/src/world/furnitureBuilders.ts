import type { MaterialKey } from '../config/materials';
import type { FurnitureKind } from '../config/rooms';
import type { Rng } from '../math/rng';
import type { FurniturePart } from './types';

export type LocalCollider =
  | { kind: 'box'; cx: number; cz: number; w: number; d: number }
  | { kind: 'circle'; x: number; z: number; r: number };

export interface BuiltFurniture {
  width: number;
  depth: number;
  parts: FurniturePart[];
  colliders: LocalCollider[];
  /** Solid pieces can block corridors, so placement verifies connectivity after placing them. */
  solid: boolean;
  /** Rugs are walkable floor coverings. */
  rug?: MaterialKey;
  /** Giant props already have exaggerated sizes and ignore the arena furniture scale. */
  giant?: boolean;
}

/** Box with its bottom at y0. Local front is +z. */
const box = (
  x: number,
  z: number,
  w: number,
  d: number,
  y0: number,
  h: number,
  material: MaterialKey,
  rotation?: [number, number, number],
): FurniturePart => ({
  shape: 'box',
  position: [x, y0 + h / 2, z],
  size: [w, h, d],
  material,
  ...(rotation ? { rotation } : {}),
});

const cyl = (x: number, z: number, diameter: number, y0: number, h: number, material: MaterialKey): FurniturePart => ({
  shape: 'cylinder',
  position: [x, y0 + h / 2, z],
  size: [diameter, h, diameter],
  material,
});

const sphere = (x: number, y: number, z: number, dx: number, dy: number, dz: number, material: MaterialKey): FurniturePart => ({
  shape: 'sphere',
  position: [x, y, z],
  size: [dx, dy, dz],
  material,
});

const solidBox = (w: number, d: number, cx = 0, cz = 0): LocalCollider => ({ kind: 'box', cx, cz, w, d });

const legs = (w: number, d: number, inset: number, size: number, h: number, material: MaterialKey) => {
  const parts: FurniturePart[] = [];
  const colliders: LocalCollider[] = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const x = sx * (w / 2 - inset);
      const z = sz * (d / 2 - inset);
      parts.push(box(x, z, size, size, 0, h, material));
      colliders.push({ kind: 'box', cx: x, cz: z, w: size + 0.01, d: size + 0.01 });
    }
  }
  return { parts, colliders };
};

const FABRICS: readonly MaterialKey[] = ['fabricGrey', 'fabricBlue', 'fabricGreen', 'fabricBeige', 'fabricRed'];
const BLANKETS: readonly MaterialKey[] = ['blanketBlue', 'blanketPink', 'blanketGreen'];
const BOOKS: readonly MaterialKey[] = ['bookRed', 'bookBlue', 'bookGreen', 'bookYellow'];
const TOYS: readonly MaterialKey[] = ['toyRed', 'toyBlue', 'toyYellow', 'toyGreen'];
const RUGS: readonly MaterialKey[] = ['rugRed', 'rugBlue', 'rugBeige', 'rugGreen'];
const WOODS: readonly MaterialKey[] = ['woodLight', 'woodMid', 'woodDark'];

type Builder = (rng: Rng) => BuiltFurniture;

const sofa: Builder = (rng) => {
  const fabric = rng.pick(FABRICS);
  const w = rng.pick([1.8, 2.0, 2.2]);
  const d = 0.9;
  return {
    width: w,
    depth: d,
    solid: true,
    colliders: [solidBox(w, d)],
    parts: [
      box(0, 0.02, w, d - 0.04, 0.05, 0.36, fabric),
      box(0, -d / 2 + 0.11, w, 0.22, 0.05, 0.82, fabric),
      box(-w / 2 + 0.1, 0.02, 0.2, d - 0.04, 0.05, 0.62, fabric),
      box(w / 2 - 0.1, 0.02, 0.2, d - 0.04, 0.05, 0.62, fabric),
      box(-(w - 0.4) / 4, 0.08, (w - 0.44) / 2, 0.62, 0.41, 0.14, 'fabricLight'),
      box((w - 0.4) / 4, 0.08, (w - 0.44) / 2, 0.62, 0.41, 0.14, 'fabricLight'),
      box(-w / 2 + 0.42, -0.2, 0.4, 0.14, 0.55, 0.36, rng.pick(FABRICS), [0.25, 0.3, 0]),
      box(w / 2 - 0.42, -0.2, 0.4, 0.14, 0.55, 0.36, rng.pick(FABRICS), [0.25, -0.3, 0]),
      box(-w / 2 + 0.1, d / 2 - 0.1, 0.06, 0.06, 0, 0.05, 'woodDark'),
      box(w / 2 - 0.1, d / 2 - 0.1, 0.06, 0.06, 0, 0.05, 'woodDark'),
    ],
  };
};

const armchair: Builder = (rng) => {
  const fabric = rng.pick(FABRICS);
  return {
    width: 0.85,
    depth: 0.85,
    solid: true,
    colliders: [solidBox(0.85, 0.85)],
    parts: [
      box(0, 0.02, 0.85, 0.8, 0.06, 0.36, fabric),
      box(0, -0.32, 0.85, 0.2, 0.06, 0.85, fabric),
      box(-0.35, 0.02, 0.15, 0.8, 0.06, 0.6, fabric),
      box(0.35, 0.02, 0.15, 0.8, 0.06, 0.6, fabric),
      box(0, 0.06, 0.55, 0.6, 0.42, 0.12, 'fabricLight'),
    ],
  };
};

const coffeeTable: Builder = (rng) => {
  const wood = rng.pick(WOODS);
  const l = legs(1.1, 0.6, 0.06, 0.05, 0.4, wood);
  return {
    width: 1.1,
    depth: 0.6,
    solid: false,
    colliders: l.colliders,
    parts: [
      ...l.parts,
      box(0, 0, 1.1, 0.6, 0.4, 0.05, wood),
      box(0, 0, 1.0, 0.5, 0.12, 0.02, wood),
      box(0.2, 0.05, 0.3, 0.22, 0.45, 0.03, rng.pick(BOOKS)),
      cyl(-0.25, -0.05, 0.08, 0.45, 0.1, 'ceramic'),
    ],
  };
};

const tvStand: Builder = () => ({
  width: 1.6,
  depth: 0.45,
  solid: true,
  colliders: [solidBox(1.6, 0.45)],
  parts: [
    box(0, 0, 1.6, 0.45, 0, 0.5, 'woodDark'),
    box(0, -0.06, 1.34, 0.06, 0.55, 0.78, 'black'),
    box(0, -0.025, 1.28, 0.01, 0.58, 0.72, 'screen'),
    box(0, -0.06, 0.3, 0.2, 0.5, 0.05, 'black'),
  ],
});

const bookshelf: Builder = (rng) => {
  const w = 1;
  const d = 0.34;
  const h = 1.9;
  const parts: FurniturePart[] = [
    box(0, -d / 2 + 0.01, w, 0.02, 0, h, 'woodMid'),
    box(-w / 2 + 0.015, 0, 0.03, d, 0, h, 'woodMid'),
    box(w / 2 - 0.015, 0, 0.03, d, 0, h, 'woodMid'),
    box(0, 0, w, d, 0, 0.06, 'woodMid'),
  ];
  for (let shelf = 0; shelf < 5; shelf++) {
    const y = 0.06 + shelf * 0.38;
    parts.push(box(0, 0, w - 0.03, d, y + 0.34, 0.025, 'woodMid'));
    let x = -w / 2 + 0.05;
    while (x < w / 2 - 0.1) {
      const bw = rng.range(0.03, 0.07);
      const bh = rng.range(0.2, 0.31);
      if (rng.chance(0.85)) parts.push(box(x + bw / 2, 0, bw, d * 0.8, y, bh, rng.pick(BOOKS)));
      x += bw + 0.005;
    }
  }
  return { width: w, depth: d, solid: true, colliders: [solidBox(w, d)], parts };
};

const plant: Builder = (rng) => {
  const pot = rng.range(0.28, 0.4);
  const h = rng.range(0.3, 0.45);
  const top = h + rng.range(0.25, 0.6);
  return {
    width: pot,
    depth: pot,
    solid: false,
    colliders: [{ kind: 'circle', x: 0, z: 0, r: pot / 2 }],
    parts: [
      cyl(0, 0, pot, 0, h, 'terracotta'),
      sphere(0, top, 0, pot * 1.6, pot * 2, pot * 1.6, 'plantLeaf'),
      sphere(pot * 0.3, top - 0.12, 0.05, pot * 1.1, pot * 1.3, pot * 1.1, 'plantLeaf'),
      sphere(-pot * 0.25, top + 0.15, -0.05, pot, pot * 1.2, pot, 'plantLeaf'),
    ],
  };
};

const floorLamp: Builder = () => ({
  width: 0.34,
  depth: 0.34,
  solid: false,
  colliders: [{ kind: 'circle', x: 0, z: 0, r: 0.17 }],
  parts: [
    cyl(0, 0, 0.34, 0, 0.03, 'metal'),
    cyl(0, 0, 0.03, 0.03, 1.5, 'metal'),
    { shape: 'cone', position: [0, 1.62, 0], size: [0.45, 0.3, 0.45], material: 'lampShade' },
  ],
});

const chair = (x: number, z: number, facing: 1 | -1, wood: MaterialKey) => {
  const l = legs(0.42, 0.42, 0.03, 0.04, 0.45, wood);
  const parts = l.parts.map((p) => ({ ...p, position: [p.position[0] + x, p.position[1], p.position[2] + z] as [number, number, number] }));
  const colliders = l.colliders.map((c) => (c.kind === 'box' ? { ...c, cx: c.cx + x, cz: c.cz + z } : c));
  parts.push(box(x, z, 0.44, 0.44, 0.45, 0.05, wood));
  parts.push(box(x, z - facing * 0.2, 0.44, 0.04, 0.5, 0.45, wood));
  return { parts, colliders };
};

const diningSet: Builder = (rng) => {
  const wood = rng.pick(WOODS);
  const t = legs(1.6, 0.9, 0.07, 0.07, 0.72, wood);
  const parts: FurniturePart[] = [...t.parts, box(0, 0, 1.6, 0.9, 0.72, 0.05, wood)];
  const colliders: LocalCollider[] = [...t.colliders];
  for (const x of [-0.4, 0.4]) {
    for (const side of [-1, 1] as const) {
      const c = chair(x, side * 0.72, side === 1 ? 1 : -1, wood);
      parts.push(...c.parts);
      colliders.push(...c.colliders);
    }
  }
  parts.push(cyl(0, 0, 0.18, 0.77, 0.12, 'ceramic'));
  parts.push(sphere(0, 0.9, 0, 0.14, 0.12, 0.14, 'toyYellow'));
  return { width: 1.7, depth: 1.95, solid: false, colliders, parts };
};

const counterRun: Builder = (rng) => {
  const w = rng.pick([1.8, 2.2, 2.5]);
  const d = 0.62;
  return {
    width: w,
    depth: d,
    solid: true,
    colliders: [solidBox(w, d)],
    parts: [
      box(0, -0.03, w, d - 0.06, 0.1, 0.78, 'cabinet'),
      box(0, -0.06, w, d - 0.14, 0, 0.1, 'black'),
      box(0, 0, w + 0.02, d + 0.02, 0.88, 0.04, 'counterTop'),
      box(-w / 4, 0.2, w * 0.3, 0.3, 0.9, 0.02, 'chrome'),
      box(0, -d / 2 + 0.17, w, 0.34, 1.45, 0.72, 'cabinet'),
      box(0, d / 2 - 0.03, w - 0.1, 0.02, 0.6, 0.02, 'chrome'),
      cyl(w / 4, -0.1, 0.1, 0.92, 0.2, 'ceramic'),
    ],
  };
};

const fridge: Builder = () => ({
  width: 0.75,
  depth: 0.72,
  solid: true,
  colliders: [solidBox(0.75, 0.72)],
  parts: [
    box(0, 0, 0.75, 0.72, 0, 1.85, 'fridge'),
    box(0, 0.365, 0.72, 0.01, 1.2, 0.01, 'black'),
    box(0.3, 0.38, 0.03, 0.04, 0.6, 0.5, 'chrome'),
    box(0.3, 0.38, 0.03, 0.04, 1.3, 0.4, 'chrome'),
  ],
});

const stove: Builder = () => {
  const parts: FurniturePart[] = [box(0, 0, 0.62, 0.62, 0, 0.88, 'metal'), box(0, 0, 0.62, 0.62, 0.88, 0.03, 'stoveTop')];
  for (const x of [-0.15, 0.15]) for (const z of [-0.15, 0.15]) parts.push(cyl(x, z, 0.16, 0.91, 0.01, 'burner'));
  parts.push(box(0, 0.315, 0.5, 0.01, 0.2, 0.4, 'glass'));
  return { width: 0.62, depth: 0.62, solid: true, colliders: [solidBox(0.62, 0.62)], parts };
};

const kitchenIsland: Builder = () => ({
  width: 1.6,
  depth: 0.85,
  solid: true,
  colliders: [solidBox(1.5, 0.75)],
  parts: [
    box(0, 0, 1.5, 0.75, 0, 0.88, 'cabinet'),
    box(0, 0, 1.6, 0.85, 0.88, 0.04, 'counterTop'),
    sphere(0.3, 0.97, 0, 0.1, 0.1, 0.1, 'toyRed'),
    sphere(0.4, 0.97, 0.08, 0.1, 0.1, 0.1, 'toyYellow'),
  ],
});

const makeBed = (w: number, rng: Rng): BuiltFurniture => {
  const d = 2.05;
  const wood = rng.pick(WOODS);
  const l = legs(w, d - 0.1, 0.05, 0.08, 0.17, wood);
  const pillows: FurniturePart[] =
    w > 1.2
      ? [box(-w / 4, -d / 2 + 0.35, w / 2 - 0.12, 0.35, 0.58, 0.12, 'pillow'), box(w / 4, -d / 2 + 0.35, w / 2 - 0.12, 0.35, 0.58, 0.12, 'pillow')]
      : [box(0, -d / 2 + 0.35, w - 0.3, 0.35, 0.58, 0.12, 'pillow')];
  return {
    width: w,
    depth: d,
    solid: false,
    colliders: [...l.colliders.map((c) => (c.kind === 'box' ? { ...c, cz: c.cz + 0.05 } : c)), solidBox(w + 0.06, 0.08, 0, -d / 2 + 0.04)],
    parts: [
      ...l.parts.map((p) => ({ ...p, position: [p.position[0], p.position[1], p.position[2] + 0.05] as [number, number, number] })),
      box(0, 0.05, w, d - 0.1, 0.17, 0.16, wood),
      box(0, 0.05, w - 0.08, d - 0.16, 0.33, 0.22, 'mattress'),
      box(0, 0.3, w - 0.02, d * 0.62, 0.52, 0.06, rng.pick(BLANKETS)),
      ...pillows,
      box(0, -d / 2 + 0.04, w + 0.06, 0.08, 0, 1.05, wood),
    ],
  };
};

const bed: Builder = (rng) => makeBed(1.6, rng);
const singleBed: Builder = (rng) => makeBed(1, rng);

const nightstand: Builder = (rng) => ({
  width: 0.48,
  depth: 0.4,
  solid: true,
  colliders: [solidBox(0.48, 0.4)],
  parts: [
    box(0, 0, 0.48, 0.4, 0, 0.55, rng.pick(WOODS)),
    box(0, 0.2, 0.4, 0.01, 0.3, 0.02, 'chrome'),
    cyl(0, -0.05, 0.12, 0.55, 0.2, 'ceramic'),
    { shape: 'cone', position: [0, 0.83, -0.05], size: [0.26, 0.18, 0.26], material: 'lampShade' },
  ],
});

const wardrobe: Builder = (rng) => {
  const wood = rng.pick(WOODS);
  return {
    width: 1.2,
    depth: 0.6,
    solid: true,
    colliders: [solidBox(1.2, 0.6)],
    parts: [
      box(0, 0, 1.2, 0.6, 0, 2.05, wood),
      box(0, 0.301, 0.01, 0.01, 0.05, 1.95, 'black'),
      box(-0.06, 0.31, 0.02, 0.03, 0.9, 0.3, 'chrome'),
      box(0.06, 0.31, 0.02, 0.03, 0.9, 0.3, 'chrome'),
    ],
  };
};

const dresser: Builder = (rng) => {
  const wood = rng.pick(WOODS);
  const parts: FurniturePart[] = [box(0, 0, 1.2, 0.5, 0, 0.85, wood)];
  for (let i = 0; i < 3; i++) parts.push(box(0, 0.251, 1.1, 0.01, 0.1 + i * 0.25, 0.2, 'woodDark'));
  parts.push(box(0, -0.2, 0.7, 0.03, 0.9, 0.6, 'mirror'));
  return { width: 1.2, depth: 0.5, solid: true, colliders: [solidBox(1.2, 0.5)], parts };
};

const desk: Builder = (rng) => {
  const wood = rng.pick(WOODS);
  const l = legs(1.3, 0.65, 0.04, 0.05, 0.74, 'metal');
  return {
    width: 1.3,
    depth: 1.25,
    solid: false,
    colliders: [
      ...l.colliders.map((c) => (c.kind === 'box' ? { ...c, cz: c.cz - 0.3 } : c)),
      { kind: 'circle', x: 0, z: 0.28, r: 0.28 },
    ],
    parts: [
      ...l.parts.map((p) => ({ ...p, position: [p.position[0], p.position[1], p.position[2] - 0.3] as [number, number, number] })),
      box(0, -0.3, 1.3, 0.65, 0.74, 0.04, wood),
      box(0, -0.5, 0.6, 0.04, 0.82, 0.36, 'black'),
      box(0, -0.475, 0.56, 0.01, 0.84, 0.32, 'screen'),
      box(0, -0.2, 0.45, 0.15, 0.78, 0.02, 'black'),
      cyl(0, 0.28, 0.56, 0.02, 0.05, 'black'),
      cyl(0, 0.28, 0.05, 0.07, 0.4, 'chrome'),
      box(0, 0.28, 0.48, 0.48, 0.45, 0.08, 'fabricGrey'),
      box(0, 0.5, 0.46, 0.06, 0.55, 0.5, 'fabricGrey'),
    ],
  };
};

const bathtub: Builder = () => ({
  width: 0.8,
  depth: 1.7,
  solid: true,
  colliders: [solidBox(0.8, 1.7)],
  parts: [
    box(0, 0, 0.8, 1.7, 0, 0.56, 'ceramic'),
    box(0, 0, 0.66, 1.55, 0.44, 0.1, 'water'),
    cyl(0, -0.78, 0.05, 0.56, 0.25, 'chrome'),
  ],
});

const toilet: Builder = () => ({
  width: 0.42,
  depth: 0.7,
  solid: true,
  colliders: [solidBox(0.42, 0.7)],
  parts: [
    cyl(0, 0.08, 0.38, 0, 0.4, 'ceramic'),
    box(0, 0.08, 0.4, 0.46, 0.4, 0.04, 'white'),
    box(0, -0.24, 0.42, 0.2, 0.35, 0.45, 'ceramic'),
  ],
});

const sinkCabinet: Builder = () => ({
  width: 0.8,
  depth: 0.48,
  solid: true,
  colliders: [solidBox(0.8, 0.48)],
  parts: [
    box(0, 0, 0.8, 0.48, 0, 0.82, 'cabinet'),
    box(0, 0, 0.82, 0.5, 0.82, 0.04, 'ceramic'),
    cyl(0, 0.02, 0.36, 0.84, 0.05, 'white'),
    cyl(0, -0.18, 0.04, 0.86, 0.22, 'chrome'),
    box(0, -0.235, 0.7, 0.02, 1.15, 0.75, 'mirror'),
  ],
});

const washingMachine: Builder = () => ({
  width: 0.6,
  depth: 0.6,
  solid: true,
  colliders: [solidBox(0.6, 0.6)],
  parts: [
    box(0, 0, 0.6, 0.6, 0, 0.85, 'white'),
    { shape: 'cylinder', position: [0, 0.45, 0.3], size: [0.36, 0.03, 0.36], rotation: [Math.PI / 2, 0, 0], material: 'glass' },
    box(0, 0.301, 0.5, 0.01, 0.74, 0.08, 'black'),
  ],
});

const shoeRack: Builder = (rng) => {
  const parts: FurniturePart[] = [box(0, 0, 1, 0.32, 0, 0.45, 'woodLight')];
  for (let i = 0; i < 3; i++) parts.push(box(-0.3 + i * 0.3, 0, 0.12, 0.28, 0.45, 0.1, rng.pick(TOYS)));
  return { width: 1, depth: 0.32, solid: true, colliders: [solidBox(1, 0.32)], parts };
};

const consoleTable: Builder = (rng) => {
  const wood = rng.pick(WOODS);
  const l = legs(1.2, 0.4, 0.04, 0.04, 0.78, wood);
  return {
    width: 1.2,
    depth: 0.4,
    solid: false,
    colliders: l.colliders,
    parts: [...l.parts, box(0, 0, 1.2, 0.4, 0.78, 0.04, wood), cyl(0.3, 0, 0.14, 0.82, 0.3, 'ceramic'), sphere(0.3, 1.2, 0, 0.3, 0.3, 0.3, 'plantLeaf')],
  };
};

const toyChest: Builder = (rng) => ({
  width: 0.9,
  depth: 0.5,
  solid: true,
  colliders: [solidBox(0.9, 0.5)],
  parts: [box(0, 0, 0.9, 0.5, 0, 0.5, rng.pick(TOYS)), box(0, 0, 0.92, 0.52, 0.5, 0.05, rng.pick(TOYS)), sphere(0.2, 0.62, 0, 0.18, 0.18, 0.18, rng.pick(TOYS))],
});

const rug: Builder = (rng) => {
  const w = rng.pick([1.6, 2, 2.4]);
  const d = rng.pick([1.2, 1.5, 1.7]);
  const material = rng.pick(RUGS);
  return { width: w, depth: d, solid: false, colliders: [], parts: [box(0, 0, w, d, 0, 0.012, material)], rug: material };
};

const shoe: Builder = (rng) => {
  const m = rng.pick(['black', 'fabricRed', 'white', 'leather'] as const);
  return {
    width: 0.3,
    depth: 0.12,
    solid: false,
    colliders: [solidBox(0.3, 0.12)],
    parts: [box(0, 0, 0.3, 0.11, 0, 0.03, 'rubber'), box(0.03, 0, 0.24, 0.1, 0.03, 0.07, m), box(-0.1, 0, 0.1, 0.1, 0.03, 0.12, m)],
  };
};

const toyBlock: Builder = (rng) => {
  const s = rng.range(0.1, 0.16);
  return { width: s, depth: s, solid: false, colliders: [solidBox(s, s)], parts: [box(0, 0, s, s, 0, s, rng.pick(TOYS), [0, rng.range(0, 1.5), 0])] };
};

const ball: Builder = (rng) => {
  const r = rng.range(0.09, 0.13);
  return { width: r * 2, depth: r * 2, solid: false, colliders: [{ kind: 'circle', x: 0, z: 0, r }], parts: [sphere(0, r, 0, r * 2, r * 2, r * 2, rng.pick(TOYS))] };
};

const laundryBasket: Builder = (rng) => ({
  width: 0.5,
  depth: 0.4,
  solid: false,
  colliders: [solidBox(0.5, 0.4)],
  parts: [box(0, 0, 0.5, 0.4, 0, 0.42, 'white'), sphere(0, 0.44, 0, 0.44, 0.16, 0.34, rng.pick(BLANKETS))],
});

const petBowl: Builder = () => ({
  width: 0.24,
  depth: 0.24,
  solid: false,
  colliders: [{ kind: 'circle', x: 0, z: 0, r: 0.12 }],
  parts: [cyl(0, 0, 0.24, 0, 0.06, 'metal'), cyl(0, 0, 0.18, 0.02, 0.05, 'woodMid')],
});

const giantDustPile: Builder = (rng) => {
  const r = rng.range(0.7, 1);
  const parts: FurniturePart[] = [sphere(0, r * 0.35, 0, r * 2, r * 0.9, r * 2, 'dustGrey')];
  for (let i = 0; i < 5; i++) {
    const a = rng.range(0, Math.PI * 2);
    parts.push(sphere(Math.cos(a) * r * 0.5, r * 0.45, Math.sin(a) * r * 0.5, r, r * 0.8, r, 'dustGrey'));
  }
  parts.push(sphere(0, r * 0.8, 0, r * 0.9, r * 0.7, r * 0.9, 'dustGrey'));
  return { width: r * 2, depth: r * 2, giant: true, solid: true, colliders: [{ kind: 'circle', x: 0, z: 0, r: r * 0.92 }], parts };
};

const giantYarnBall: Builder = () => ({
  width: 1.5,
  depth: 1.5,
  giant: true,
  solid: true,
  colliders: [{ kind: 'circle', x: 0, z: 0, r: 0.72 }],
  parts: [
    sphere(0, 0.72, 0, 1.45, 1.45, 1.45, 'yarnRed'),
    { shape: 'torus', position: [0, 0.72, 0], size: [0.72, 0.05, 0], rotation: [0.6, 0, 0.3], material: 'fabricRed' },
    { shape: 'torus', position: [0, 0.72, 0], size: [0.72, 0.05, 0], rotation: [-0.5, 0.8, 0], material: 'fabricRed' },
    { shape: 'cylinder', position: [0.9, 0.02, 0.4], size: [0.06, 1.4, 0.06], rotation: [0, 0.3, Math.PI / 2], material: 'yarnRed' },
  ],
});

const catTree: Builder = () => ({
  width: 1.1,
  depth: 1.1,
  giant: true,
  solid: true,
  colliders: [solidBox(1.1, 1.1)],
  parts: [
    box(0, 0, 1.1, 1.1, 0, 0.12, 'fabricBeige'),
    cyl(-0.25, -0.25, 0.2, 0.12, 2.2, 'fabricBeige'),
    cyl(0.28, 0.2, 0.2, 0.12, 1.3, 'fabricBeige'),
    box(0.1, 0, 0.9, 0.7, 1.4, 0.08, 'fabricBeige'),
    box(-0.2, -0.15, 0.8, 0.8, 2.3, 0.08, 'fabricBeige'),
    sphere(0.4, 1.2, 0.35, 0.16, 0.16, 0.16, 'yarnRed'),
  ],
});

const giantBone: Builder = () => ({
  width: 2.6,
  depth: 0.8,
  giant: true,
  solid: true,
  colliders: [solidBox(2.6, 0.8)],
  parts: [
    { shape: 'cylinder', position: [0, 0.3, 0], size: [0.45, 2, 0.45], rotation: [0, 0, Math.PI / 2], material: 'bone' },
    sphere(-1.05, 0.3, -0.2, 0.55, 0.55, 0.55, 'bone'),
    sphere(-1.05, 0.3, 0.2, 0.55, 0.55, 0.55, 'bone'),
    sphere(1.05, 0.3, -0.2, 0.55, 0.55, 0.55, 'bone'),
    sphere(1.05, 0.3, 0.2, 0.55, 0.55, 0.55, 'bone'),
  ],
});

const dogBed: Builder = () => ({
  width: 2.6,
  depth: 2.6,
  giant: true,
  solid: true,
  colliders: [{ kind: 'circle', x: 0, z: 0, r: 1.25 }],
  parts: [
    cyl(0, 0, 2.5, 0, 0.22, 'dogBedBrown'),
    { shape: 'torus', position: [0, 0.35, 0], size: [1.05, 0.28, 0], rotation: [Math.PI / 2, 0, 0], material: 'dogBedBrown' },
    cyl(0, 0, 1.9, 0.22, 0.1, 'fabricBeige'),
  ],
});

const giantToyBlock: Builder = (rng) => {
  const s = rng.range(0.7, 1);
  return {
    width: s,
    depth: s,
    giant: true,
    solid: true,
    colliders: [solidBox(s, s)],
    parts: [box(0, 0, s, s, 0, s, rng.pick(TOYS)), box(0, s / 2 + 0.005, s * 0.6, 0.01, s * 0.2, s * 0.6, 'white')],
  };
};

const giantBall: Builder = (rng) => ({
  width: 1.5,
  depth: 1.5,
  giant: true,
  solid: true,
  colliders: [{ kind: 'circle', x: 0, z: 0, r: 0.75 }],
  parts: [
    sphere(0, 0.75, 0, 1.5, 1.5, 1.5, rng.pick(TOYS)),
    { shape: 'torus', position: [0, 0.75, 0], size: [0.75, 0.04, 0], rotation: [Math.PI / 2, 0, 0], material: 'white' },
  ],
});

const giantBoot: Builder = () => ({
  width: 1.5,
  depth: 0.62,
  giant: true,
  solid: true,
  colliders: [solidBox(1.5, 0.62)],
  parts: [
    box(0, 0, 1.5, 0.6, 0, 0.2, 'rubber'),
    box(0.25, 0, 1.0, 0.56, 0.2, 0.35, 'mudBrown'),
    cyl(-0.45, 0, 0.6, 0.2, 1.3, 'mudBrown'),
    sphere(0.4, 0.25, 0.2, 0.4, 0.2, 0.3, 'mudBrown'),
  ],
});

export const FURNITURE_BUILDERS: Record<FurnitureKind, Builder> = {
  sofa,
  armchair,
  coffeeTable,
  tvStand,
  bookshelf,
  plant,
  floorLamp,
  diningSet,
  counterRun,
  fridge,
  stove,
  kitchenIsland,
  bed,
  singleBed,
  nightstand,
  wardrobe,
  dresser,
  desk,
  bathtub,
  toilet,
  sinkCabinet,
  washingMachine,
  shoeRack,
  console: consoleTable,
  toyChest,
  rug,
  shoe,
  toyBlock,
  ball,
  laundryBasket,
  petBowl,
  giantDustPile,
  giantYarnBall,
  catTree,
  giantBone,
  dogBed,
  giantToyBlock,
  giantBall,
  giantBoot,
};
