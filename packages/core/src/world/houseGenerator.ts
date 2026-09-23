import { LAYOUT_LEGEND, OUTSIDE_CELL, WALL_CONFIG } from '../config/houses';
import { ROOMBA_CONFIG } from '../config/roomba';
import { CLUTTER_KINDS, ROOM_TYPES, type FurnitureKind, type FurniturePlacement, type RoomType } from '../config/rooms';
import { createRng, type Rng } from '../math/rng';
import { boxCollider, CollisionWorld, type Bounds, type Collider } from '../physics/collision';
import { FURNITURE_BUILDERS, type BuiltFurniture, type LocalCollider } from './furnitureBuilders';
import { ReachabilityMap } from './reachability';
import type {
  ChargingStation,
  DoorOpening,
  FurnitureInstance,
  FurniturePart,
  HouseLayout,
  Room,
  RugArea,
  WallBox,
  WindowOpening,
} from './types';

export interface HouseBlueprint {
  key: string;
  name: string;
  cellSize: number;
  wallHeight: number;
  layout: readonly string[];
  furnitureScale: number;
  clutterCount: number;
  props?: readonly { kind: FurnitureKind; count: number }[];
  isArena: boolean;
}

interface Segment {
  orient: 'v' | 'h';
  line: number;
  idx: number;
  a: number;
  b: number;
}

const segKey = (s: { orient: 'v' | 'h'; line: number; idx: number }): string => `${s.orient}:${s.line}:${s.idx}`;

const PLACEMENT_MARGIN = 0.08;
const DOOR_CLEARANCE_DEPTH = 0.75;
const CONNECTIVITY_RESOLUTION = 0.2;

const OPEN_PLAN: readonly RoomType[] = ['living', 'kitchen', 'dining'];

export const boundsOverlap = (a: Bounds, b: Bounds, margin = 0): boolean =>
  a.minX < b.maxX + margin && a.maxX > b.minX - margin && a.minZ < b.maxZ + margin && a.maxZ > b.minZ - margin;

class UnionFind {
  private readonly parent: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
  }
  find(i: number): number {
    let root = i;
    while (this.parent[root] !== root) root = this.parent[root] as number;
    this.parent[i] = root;
    return root;
  }
  union(a: number, b: number): void {
    this.parent[this.find(a)] = this.find(b);
  }
}

export const generateHouse = (blueprint: HouseBlueprint, seed: number, clutterSeed = seed): HouseLayout => {
  const rng = createRng(seed);
  const { cellSize, layout } = blueprint;
  const rows = layout.length;
  const cols = layout[0]?.length ?? 0;
  const width = cols * cellSize;
  const depth = rows * cellSize;
  const bounds: Bounds = { minX: -width / 2, minZ: -depth / 2, maxX: width / 2, maxZ: depth / 2 };
  const half = WALL_CONFIG.thickness / 2;

  // 1. Label rooms as connected components of identical characters.
  const grid = new Int16Array(cols * rows).fill(-1);
  const rooms: Room[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const ch = layout[row]?.[col] ?? OUTSIDE_CELL;
      if (ch === OUTSIDE_CELL || grid[row * cols + col] !== -1) continue;
      const type = LAYOUT_LEGEND[ch];
      if (!type) throw new Error(`Unknown layout character "${ch}" in ${blueprint.key}`);
      const id = rooms.length;
      const cells: number[] = [];
      const stack = [row * cols + col];
      grid[row * cols + col] = id;
      while (stack.length) {
        const index = stack.pop() as number;
        cells.push(index);
        const c = index % cols;
        const r = (index - c) / cols;
        for (const [nc, nr] of [
          [c - 1, r],
          [c + 1, r],
          [c, r - 1],
          [c, r + 1],
        ] as const) {
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
          const ni = nr * cols + nc;
          if (grid[ni] === -1 && layout[nr]?.[nc] === ch) {
            grid[ni] = id;
            stack.push(ni);
          }
        }
      }
      let minC = Infinity;
      let maxC = -Infinity;
      let minR = Infinity;
      let maxR = -Infinity;
      let sumX = 0;
      let sumZ = 0;
      for (const index of cells) {
        const c = index % cols;
        const r = (index - c) / cols;
        minC = Math.min(minC, c);
        maxC = Math.max(maxC, c);
        minR = Math.min(minR, r);
        maxR = Math.max(maxR, r);
        sumX += bounds.minX + (c + 0.5) * cellSize;
        sumZ += bounds.minZ + (r + 0.5) * cellSize;
      }
      const config = ROOM_TYPES[type];
      rooms.push({
        id,
        type,
        label: config.label,
        floor: config.floor,
        cells,
        bounds: {
          minX: bounds.minX + minC * cellSize,
          maxX: bounds.minX + (maxC + 1) * cellSize,
          minZ: bounds.minZ + minR * cellSize,
          maxZ: bounds.minZ + (maxR + 1) * cellSize,
        },
        area: cells.length * cellSize * cellSize,
        center: { x: sumX / cells.length, z: sumZ / cells.length },
      });
    }
  }

  const roomAt = (col: number, row: number): number =>
    col < 0 || row < 0 || col >= cols || row >= rows ? -1 : (grid[row * cols + col] as number);
  const roomAtPoint = (x: number, z: number): number =>
    roomAt(Math.floor((x - bounds.minX) / cellSize), Math.floor((z - bounds.minZ) / cellSize));

  // 2. Boundary segments between different rooms / outside.
  const segments: Segment[] = [];
  for (let line = 0; line <= cols; line++) {
    for (let idx = 0; idx < rows; idx++) {
      const a = roomAt(line - 1, idx);
      const b = roomAt(line, idx);
      if (a !== b) segments.push({ orient: 'v', line, idx, a, b });
    }
  }
  for (let line = 0; line <= rows; line++) {
    for (let idx = 0; idx < cols; idx++) {
      const a = roomAt(idx, line - 1);
      const b = roomAt(idx, line);
      if (a !== b) segments.push({ orient: 'h', line, idx, a, b });
    }
  }
  const segmentCenter = (s: { orient: 'v' | 'h'; line: number; idx: number }): { x: number; z: number } =>
    s.orient === 'v'
      ? { x: bounds.minX + s.line * cellSize, z: bounds.minZ + (s.idx + 0.5) * cellSize }
      : { x: bounds.minX + (s.idx + 0.5) * cellSize, z: bounds.minZ + s.line * cellSize };

  // 3. Doors: hallways first, open-plan openings, then a spanning set for the rest.
  const pairSegments = new Map<string, Segment[]>();
  for (const s of segments) {
    if (s.a < 0 || s.b < 0) continue;
    const key = s.a < s.b ? `${s.a}-${s.b}` : `${s.b}-${s.a}`;
    const list = pairSegments.get(key) ?? [];
    list.push(s);
    pairSegments.set(key, list);
  }
  const typeOf = (id: number): RoomType => (rooms[id] as Room).type;
  const openSegments = new Set<string>();
  const doors: DoorOpening[] = [];
  const doorCount = new Array<number>(rooms.length).fill(0);
  const uf = new UnionFind(rooms.length);

  const pickRun = (list: Segment[]): Segment[] => {
    const sorted = [...list].sort((p, q) => (p.orient === q.orient ? (p.line === q.line ? p.idx - q.idx : p.line - q.line) : p.orient < q.orient ? -1 : 1));
    const runs: Segment[][] = [];
    for (const s of sorted) {
      const run = runs[runs.length - 1];
      const last = run?.[run.length - 1];
      if (run && last && last.orient === s.orient && last.line === s.line && last.idx + 1 === s.idx) run.push(s);
      else runs.push([s]);
    }
    runs.sort((p, q) => q.length - p.length);
    return runs[0] ?? [];
  };

  const addDoor = (a: number, b: number, wide: boolean): void => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    const run = pickRun(pairSegments.get(key) ?? []);
    if (run.length === 0) return;
    let chosen: Segment[];
    if (wide) {
      const count = Math.min(3, Math.max(1, run.length - 1));
      const start = Math.floor((run.length - count) / 2);
      chosen = run.slice(start, start + count);
    } else {
      const inner = run.length >= 3 ? run.slice(1, -1) : run;
      chosen = [inner[Math.floor(inner.length / 2)] as Segment];
    }
    for (const s of chosen) openSegments.add(segKey(s));
    const first = segmentCenter(chosen[0] as Segment);
    const last = segmentCenter(chosen[chosen.length - 1] as Segment);
    const orient = (chosen[0] as Segment).orient;
    doors.push({
      x: (first.x + last.x) / 2,
      z: (first.z + last.z) / 2,
      axis: orient === 'v' ? 'z' : 'x',
      width: chosen.length * cellSize,
      rooms: [a, b],
      wide,
    });
    doorCount[a] = (doorCount[a] ?? 0) + 1;
    doorCount[b] = (doorCount[b] ?? 0) + 1;
    uf.union(a, b);
  };

  const pairs = [...pairSegments.keys()].map((k) => k.split('-').map(Number) as [number, number]);
  const isBath = (id: number): boolean => typeOf(id) === 'bathroom';
  const bathBlocked = (a: number, b: number): boolean => (isBath(a) && (doorCount[a] ?? 0) > 0) || (isBath(b) && (doorCount[b] ?? 0) > 0);

  for (const [a, b] of pairs) {
    if ((typeOf(a) === 'hallway' || typeOf(b) === 'hallway') && !bathBlocked(a, b)) addDoor(a, b, false);
  }
  for (const [a, b] of pairs) {
    if (OPEN_PLAN.includes(typeOf(a)) && OPEN_PLAN.includes(typeOf(b)) && uf.find(a) !== uf.find(b)) addDoor(a, b, true);
  }
  const priority = (a: number, b: number): number =>
    (isBath(a) || isBath(b) ? 2 : 0) + (typeOf(a) === 'living' || typeOf(b) === 'living' ? -1 : 0);
  const remaining = rng.shuffle([...pairs]).sort((p, q) => priority(p[0], p[1]) - priority(q[0], q[1]));
  for (const [a, b] of remaining) {
    if (uf.find(a) !== uf.find(b) && !bathBlocked(a, b)) addDoor(a, b, false);
  }
  for (const [a, b] of remaining) {
    if (uf.find(a) !== uf.find(b)) addDoor(a, b, false);
  }

  // 4. Walls: merge consecutive closed segments on each grid line.
  const walls: WallBox[] = [];
  const windows: WindowOpening[] = [];
  const closed = segments.filter((s) => !openSegments.has(segKey(s)));
  const byLine = new Map<string, Segment[]>();
  for (const s of closed) {
    const key = `${s.orient}:${s.line}`;
    const list = byLine.get(key) ?? [];
    list.push(s);
    byLine.set(key, list);
  }
  for (const list of byLine.values()) {
    list.sort((p, q) => p.idx - q.idx);
    let runStart = 0;
    for (let i = 1; i <= list.length; i++) {
      const prev = list[i - 1] as Segment;
      const cur = list[i];
      if (cur && cur.idx === prev.idx + 1) continue;
      const first = list[runStart] as Segment;
      const count = prev.idx - first.idx + 1;
      const c0 = segmentCenter(first);
      const c1 = segmentCenter(prev);
      const outer = list.slice(runStart, i).every((s) => s.a < 0 || s.b < 0);
      walls.push({
        x: (c0.x + c1.x) / 2,
        z: (c0.z + c1.z) / 2,
        width: first.orient === 'v' ? WALL_CONFIG.thickness : count * cellSize + WALL_CONFIG.thickness,
        depth: first.orient === 'v' ? count * cellSize + WALL_CONFIG.thickness : WALL_CONFIG.thickness,
        height: blueprint.wallHeight,
        outer,
      });
      runStart = i;
    }
  }
  for (const s of closed) {
    if ((s.a >= 0 && s.b >= 0) || !rng.chance(WALL_CONFIG.windowChance)) continue;
    const c = segmentCenter(s);
    const outwardSign = s.a < 0 ? -1 : 1;
    windows.push({
      x: c.x,
      z: c.z,
      axis: s.orient === 'v' ? 'z' : 'x',
      width: cellSize * 0.62,
      outward: s.orient === 'v' ? { x: outwardSign, z: 0 } : { x: 0, z: outwardSign },
    });
  }

  const colliders: Collider[] = walls.map((w) => boxCollider(w.x, w.z, w.width, w.depth, 'wall'));

  // 5. Candidate wall slots per room (closed segments with inward normals).
  interface WallSlot {
    x: number;
    z: number;
    nx: number;
    nz: number;
    orient: 'v' | 'h';
    seg: Segment;
  }
  const wallSlots = new Map<number, WallSlot[]>();
  for (const s of closed) {
    const c = segmentCenter(s);
    for (const [room, sign] of [
      [s.a, -1],
      [s.b, 1],
    ] as const) {
      if (room < 0) continue;
      const list = wallSlots.get(room) ?? [];
      list.push({ x: c.x, z: c.z, nx: s.orient === 'v' ? sign : 0, nz: s.orient === 'h' ? sign : 0, orient: s.orient, seg: s });
      wallSlots.set(room, list);
    }
  }

  const reserved: Bounds[] = [];
  for (const door of doors) {
    const along = door.width / 2 + 0.15;
    reserved.push(
      door.axis === 'z'
        ? { minX: door.x - DOOR_CLEARANCE_DEPTH, maxX: door.x + DOOR_CLEARANCE_DEPTH, minZ: door.z - along, maxZ: door.z + along }
        : { minX: door.x - along, maxX: door.x + along, minZ: door.z - DOOR_CLEARANCE_DEPTH, maxZ: door.z + DOOR_CLEARANCE_DEPTH },
    );
  }

  // 6. Charging station against a living-room wall, preferring outer walls.
  const stationRoom = rooms.find((r) => r.type === 'living') ?? rooms.find((r) => r.type === 'hallway') ?? (rooms[0] as Room);
  const stationSlots = (wallSlots.get(stationRoom.id) ?? []).filter((slot) => {
    const probe = { x: slot.x + slot.nx * 0.6, z: slot.z + slot.nz * 0.6 };
    return roomAtPoint(probe.x, probe.z) === stationRoom.id && !reserved.some((r) => boundsOverlap(r, pointBounds(probe.x, probe.z, 0.3)));
  });
  stationSlots.sort((p, q) => Number(q.seg.a < 0 || q.seg.b < 0) - Number(p.seg.a < 0 || p.seg.b < 0));
  const topSlots = stationSlots.slice(0, Math.max(1, Math.ceil(stationSlots.length / 2)));
  const slot = topSlots.length > 0 ? rng.pick(topSlots) : undefined;
  const station: ChargingStation = slot
    ? {
        x: slot.x + slot.nx * (half + 0.09),
        z: slot.z + slot.nz * (half + 0.09),
        dockX: slot.x + slot.nx * (half + 0.18 + ROOMBA_CONFIG.radius + 0.02),
        dockZ: slot.z + slot.nz * (half + 0.18 + ROOMBA_CONFIG.radius + 0.02),
        rotation: Math.atan2(slot.nx, slot.nz),
        roomId: stationRoom.id,
      }
    : { x: stationRoom.center.x, z: stationRoom.center.z, dockX: stationRoom.center.x, dockZ: stationRoom.center.z + 0.4, rotation: 0, roomId: stationRoom.id };
  const stationW = 0.42;
  const stationD = 0.18;
  const stationRotated = Math.abs(Math.sin(station.rotation)) > 0.5;
  colliders.push(boxCollider(station.x, station.z, stationRotated ? stationD : stationW, stationRotated ? stationW : stationD, 'station'));
  reserved.push({
    minX: Math.min(station.x, station.dockX) - 0.6,
    maxX: Math.max(station.x, station.dockX) + 0.6,
    minZ: Math.min(station.z, station.dockZ) - 0.6,
    maxZ: Math.max(station.z, station.dockZ) + 0.6,
  });

  // 7. Furniture placement.
  const furniture: FurnitureInstance[] = [];
  const rugs: RugArea[] = [];
  const occupied: Bounds[] = [];
  const wallColliders = colliders.slice();

  const connectivityOk = (): boolean => {
    const world = new CollisionWorld(bounds, colliders);
    const map = new ReachabilityMap(world, bounds, CONNECTIVITY_RESOLUTION, ROOMBA_CONFIG.radius + 0.01, station.dockX, station.dockZ);
    for (const door of doors) {
      const off = 0.35;
      const [p, q] =
        door.axis === 'z'
          ? [
              { x: door.x - off, z: door.z },
              { x: door.x + off, z: door.z },
            ]
          : [
              { x: door.x, z: door.z - off },
              { x: door.x, z: door.z + off },
            ];
      if (!map.isNearReachable(p.x, p.z, 0.25) || !map.isNearReachable(q.x, q.z, 0.25)) return false;
    }
    return true;
  };

  const fits = (fp: Bounds, roomId: number): boolean => {
    if (fp.minX < bounds.minX || fp.maxX > bounds.maxX || fp.minZ < bounds.minZ || fp.maxZ > bounds.maxZ) return false;
    const step = 0.2;
    for (let x = fp.minX + 0.02; x <= fp.maxX - 0.02 + 1e-6; x += Math.min(step, Math.max(0.01, fp.maxX - fp.minX - 0.04))) {
      for (let z = fp.minZ + 0.02; z <= fp.maxZ - 0.02 + 1e-6; z += Math.min(step, Math.max(0.01, fp.maxZ - fp.minZ - 0.04))) {
        if (roomAtPoint(x, z) !== roomId) return false;
      }
    }
    for (const corner of [
      [fp.minX + 0.02, fp.minZ + 0.02],
      [fp.maxX - 0.02, fp.minZ + 0.02],
      [fp.minX + 0.02, fp.maxZ - 0.02],
      [fp.maxX - 0.02, fp.maxZ - 0.02],
    ] as const) {
      if (roomAtPoint(corner[0], corner[1]) !== roomId) return false;
    }
    for (const w of wallColliders) {
      if (w.kind === 'box' && boundsOverlap(fp, w, 0.005)) return false;
    }
    return true;
  };

  const place = (kind: FurnitureKind, placement: FurniturePlacement, roomId: number, pieceRng: Rng, allowOverlapRugs = true): boolean => {
    const built = FURNITURE_BUILDERS[kind](pieceRng);
    const scale = built.giant ? 1 : blueprint.furnitureScale;
    const w = built.width * scale;
    const d = built.depth * scale;
    const room = rooms[roomId] as Room;
    const slots = wallSlots.get(roomId) ?? [];
    for (let attempt = 0; attempt < 28; attempt++) {
      let x: number;
      let z: number;
      let rotation: number;
      if ((placement === 'wall' || placement === 'corner') && slots.length > 0) {
        const s = pieceRng.pick(slots);
        rotation = Math.atan2(s.nx, s.nz);
        const alongX = s.orient === 'h' ? 1 : 0;
        const alongZ = s.orient === 'v' ? 1 : 0;
        const spread = placement === 'corner' ? cellSize / 2 : cellSize * 0.8;
        const offset = placement === 'corner' ? (pieceRng.chance(0.5) ? -1 : 1) * Math.max(0, spread - w / 2 - 0.02) : pieceRng.range(-spread, spread);
        x = s.x + s.nx * (half + d / 2 + 0.01) + alongX * offset;
        z = s.z + s.nz * (half + d / 2 + 0.01) + alongZ * offset;
      } else if (placement === 'center') {
        x = room.center.x + pieceRng.range(-0.35, 0.35) * (attempt / 10 + 0.2);
        z = room.center.z + pieceRng.range(-0.35, 0.35) * (attempt / 10 + 0.2);
        rotation = pieceRng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
        if (attempt < 6) rotation = room.bounds.maxX - room.bounds.minX >= room.bounds.maxZ - room.bounds.minZ ? 0 : Math.PI / 2;
      } else {
        const cell = pieceRng.pick(room.cells);
        const c = cell % cols;
        const r = (cell - c) / cols;
        x = bounds.minX + (c + pieceRng.range(0.2, 0.8)) * cellSize;
        z = bounds.minZ + (r + pieceRng.range(0.2, 0.8)) * cellSize;
        rotation = pieceRng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
      }
      const swapped = Math.abs(Math.sin(rotation)) > 0.5;
      const fw = swapped ? d : w;
      const fd = swapped ? w : d;
      const fp: Bounds = { minX: x - fw / 2, maxX: x + fw / 2, minZ: z - fd / 2, maxZ: z + fd / 2 };
      if (!fits(fp, roomId)) continue;
      if (reserved.some((r) => boundsOverlap(fp, r))) continue;
      if (!built.rug && occupied.some((o) => boundsOverlap(fp, o, PLACEMENT_MARGIN))) continue;
      if (built.rug && !allowOverlapRugs) continue;
      const instance = instantiate(furniture.length, kind, roomId, built, x, z, rotation, scale, fp);
      if (!built.rug) {
        const before = colliders.length;
        colliders.push(...instance.colliders);
        if (built.solid && !connectivityOk()) {
          colliders.length = before;
          continue;
        }
        occupied.push(fp);
      } else {
        rugs.push({ bounds: fp, material: built.rug });
      }
      furniture.push(instance);
      return true;
    }
    return false;
  };

  for (const room of rooms) {
    const config = ROOM_TYPES[room.type];
    for (const spawn of config.furniture) {
      if (spawn.chance !== undefined && !rng.chance(spawn.chance)) continue;
      const count = rng.int(spawn.count[0], spawn.count[1]);
      for (let i = 0; i < count; i++) place(spawn.kind, spawn.placement, room.id, rng);
    }
  }

  for (const prop of blueprint.props ?? []) {
    for (let i = 0; i < prop.count; i++) {
      const room = rng.pick(rooms.filter((r) => r.area >= 6));
      place(prop.kind, 'free', room.id, rng);
    }
  }

  const clutterRng = createRng(clutterSeed);
  for (let i = 0; i < blueprint.clutterCount; i++) {
    const room = clutterRng.pick(rooms);
    place(clutterRng.pick(CLUTTER_KINDS), 'free', room.id, clutterRng);
  }

  return {
    key: blueprint.key,
    name: blueprint.name,
    cellSize,
    wallHeight: blueprint.wallHeight,
    cols,
    rows,
    bounds,
    grid,
    rooms,
    walls,
    doors,
    windows,
    furniture,
    rugs,
    station,
    colliders,
    isArena: blueprint.isArena,
  };
};

const pointBounds = (x: number, z: number, r: number): Bounds => ({ minX: x - r, maxX: x + r, minZ: z - r, maxZ: z + r });

const rotatePoint = (x: number, z: number, cos: number, sin: number): [number, number] => [x * cos + z * sin, -x * sin + z * cos];

const instantiate = (
  id: number,
  kind: FurnitureKind,
  roomId: number,
  built: BuiltFurniture,
  px: number,
  pz: number,
  rotation: number,
  scale: number,
  footprint: Bounds,
): FurnitureInstance => {
  const cos = Math.round(Math.cos(rotation));
  const sin = Math.round(Math.sin(rotation));
  const swapped = sin !== 0;
  const colliders: Collider[] = built.colliders.map((c: LocalCollider) => {
    if (c.kind === 'circle') {
      const [x, z] = rotatePoint(c.x * scale, c.z * scale, cos, sin);
      return { kind: 'circle', x: px + x, z: pz + z, r: c.r * scale, tag: built.giant ? 'prop' : 'furniture' };
    }
    const [x, z] = rotatePoint(c.cx * scale, c.cz * scale, cos, sin);
    const w = (swapped ? c.d : c.w) * scale;
    const d = (swapped ? c.w : c.d) * scale;
    return boxCollider(px + x, pz + z, w, d, built.giant ? 'prop' : 'furniture');
  });
  const parts: FurniturePart[] = built.parts.map((p) => {
    const [x, z] = rotatePoint(p.position[0] * scale, p.position[2] * scale, cos, sin);
    const size: [number, number, number] =
      p.shape === 'torus' ? [p.size[0] * scale, p.size[1] * scale, 0] : [p.size[0] * scale, p.size[1] * scale, p.size[2] * scale];
    return {
      shape: p.shape,
      position: [px + x, p.position[1] * scale, pz + z],
      size,
      rotation: p.rotation ?? [0, 0, 0],
      yaw: rotation,
      material: p.material,
    };
  });
  return { id, kind, roomId, x: px, z: pz, rotation, footprint, parts, colliders };
};
