export type ColliderTag = 'wall' | 'furniture' | 'station' | 'prop';

export interface BoxCollider {
  kind: 'box';
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  tag: ColliderTag;
}

export interface CircleCollider {
  kind: 'circle';
  x: number;
  z: number;
  r: number;
  tag: ColliderTag;
}

export type Collider = BoxCollider | CircleCollider;

export interface Contact {
  nx: number;
  nz: number;
  depth: number;
  tag: ColliderTag;
}

export interface Bounds {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export const boxCollider = (
  cx: number,
  cz: number,
  width: number,
  depth: number,
  tag: ColliderTag = 'furniture',
): BoxCollider => ({
  kind: 'box',
  minX: cx - width / 2,
  maxX: cx + width / 2,
  minZ: cz - depth / 2,
  maxZ: cz + depth / 2,
  tag,
});

export const colliderBounds = (c: Collider): Bounds =>
  c.kind === 'box'
    ? { minX: c.minX, minZ: c.minZ, maxX: c.maxX, maxZ: c.maxZ }
    : { minX: c.x - c.r, minZ: c.z - c.r, maxX: c.x + c.r, maxZ: c.z + c.r };

/** Penetration of a circle into a collider, or null when separated. */
export const circleContact = (x: number, z: number, r: number, c: Collider): Contact | null => {
  if (c.kind === 'circle') {
    const dx = x - c.x;
    const dz = z - c.z;
    const d2 = dx * dx + dz * dz;
    const rr = r + c.r;
    if (d2 >= rr * rr) return null;
    const d = Math.sqrt(d2);
    if (d < 1e-6) return { nx: 1, nz: 0, depth: rr, tag: c.tag };
    return { nx: dx / d, nz: dz / d, depth: rr - d, tag: c.tag };
  }
  const inside = x > c.minX && x < c.maxX && z > c.minZ && z < c.maxZ;
  if (inside) {
    const left = x - c.minX;
    const right = c.maxX - x;
    const top = z - c.minZ;
    const bottom = c.maxZ - z;
    const min = Math.min(left, right, top, bottom);
    if (min === left) return { nx: -1, nz: 0, depth: left + r, tag: c.tag };
    if (min === right) return { nx: 1, nz: 0, depth: right + r, tag: c.tag };
    if (min === top) return { nx: 0, nz: -1, depth: top + r, tag: c.tag };
    return { nx: 0, nz: 1, depth: bottom + r, tag: c.tag };
  }
  const px = x < c.minX ? c.minX : x > c.maxX ? c.maxX : x;
  const pz = z < c.minZ ? c.minZ : z > c.maxZ ? c.maxZ : z;
  const dx = x - px;
  const dz = z - pz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return null;
  const d = Math.sqrt(d2);
  return { nx: dx / d, nz: dz / d, depth: r - d, tag: c.tag };
};

/** Liang-Barsky style slab test; returns entry distance along the ray or Infinity. */
const rayBox = (ox: number, oz: number, dx: number, dz: number, b: BoxCollider, pad: number): number => {
  let tMin = 0;
  let tMax = Infinity;
  const axes: [number, number, number, number][] = [
    [ox, dx, b.minX - pad, b.maxX + pad],
    [oz, dz, b.minZ - pad, b.maxZ + pad],
  ];
  for (const [o, d, min, max] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (o < min || o > max) return Infinity;
    } else {
      let t1 = (min - o) / d;
      let t2 = (max - o) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return Infinity;
    }
  }
  return tMin;
};

const rayCircle = (ox: number, oz: number, dx: number, dz: number, c: CircleCollider, pad: number): number => {
  const fx = ox - c.x;
  const fz = oz - c.z;
  const r = c.r + pad;
  const b = fx * dx + fz * dz;
  const cc = fx * fx + fz * fz - r * r;
  if (cc <= 0) return 0;
  const disc = b * b - cc;
  if (disc < 0) return Infinity;
  const t = -b - Math.sqrt(disc);
  return t >= 0 ? t : Infinity;
};

/**
 * Static collision world with a uniform-grid broadphase. All gameplay happens on the
 * floor plane, so collisions are solved in 2D (x/z).
 */
export class CollisionWorld {
  readonly colliders: Collider[] = [];
  private readonly cells: number[][];
  private readonly stamps: number[] = [];
  private stamp = 0;
  private readonly cols: number;
  private readonly rows: number;

  constructor(
    readonly bounds: Bounds,
    colliders: readonly Collider[],
    private readonly cellSize = 1,
  ) {
    this.cols = Math.max(1, Math.ceil((bounds.maxX - bounds.minX) / cellSize) + 2);
    this.rows = Math.max(1, Math.ceil((bounds.maxZ - bounds.minZ) / cellSize) + 2);
    this.cells = Array.from({ length: this.cols * this.rows }, () => []);
    for (const c of colliders) this.add(c);
  }

  add(c: Collider): void {
    const index = this.colliders.length;
    this.colliders.push(c);
    this.stamps.push(0);
    const b = colliderBounds(c);
    this.forCells(b.minX, b.minZ, b.maxX, b.maxZ, (cell) => cell.push(index));
  }

  private cellCoord(x: number, z: number): [number, number] {
    const cx = Math.floor((x - this.bounds.minX) / this.cellSize) + 1;
    const cz = Math.floor((z - this.bounds.minZ) / this.cellSize) + 1;
    return [Math.min(Math.max(cx, 0), this.cols - 1), Math.min(Math.max(cz, 0), this.rows - 1)];
  }

  private forCells(minX: number, minZ: number, maxX: number, maxZ: number, fn: (cell: number[]) => void): void {
    const [x0, z0] = this.cellCoord(minX, minZ);
    const [x1, z1] = this.cellCoord(maxX, maxZ);
    for (let cz = z0; cz <= z1; cz++) {
      for (let cx = x0; cx <= x1; cx++) fn(this.cells[cz * this.cols + cx] as number[]);
    }
  }

  query(minX: number, minZ: number, maxX: number, maxZ: number, out: Collider[] = []): Collider[] {
    this.stamp++;
    out.length = 0;
    this.forCells(minX, minZ, maxX, maxZ, (cell) => {
      for (const index of cell) {
        if (this.stamps[index] === this.stamp) continue;
        this.stamps[index] = this.stamp;
        out.push(this.colliders[index] as Collider);
      }
    });
    return out;
  }

  private readonly scratch: Collider[] = [];

  isFree(x: number, z: number, r: number, ignoreTag?: ColliderTag): boolean {
    for (const c of this.query(x - r, z - r, x + r, z + r, this.scratch)) {
      if (c.tag === ignoreTag) continue;
      if (circleContact(x, z, r, c)) return false;
    }
    return true;
  }

  /** Nearest distance from a point to any collider surface (capped at maxDist). */
  clearance(x: number, z: number, maxDist: number): number {
    let best = maxDist;
    for (const c of this.query(x - maxDist, z - maxDist, x + maxDist, z + maxDist, this.scratch)) {
      if (c.kind === 'circle') {
        best = Math.min(best, Math.hypot(x - c.x, z - c.z) - c.r);
      } else {
        const dx = Math.max(c.minX - x, 0, x - c.maxX);
        const dz = Math.max(c.minZ - z, 0, z - c.maxZ);
        const inside = dx === 0 && dz === 0;
        best = Math.min(best, inside ? -1 : Math.hypot(dx, dz));
      }
    }
    return best;
  }

  /**
   * Pushes a circle out of every collider it overlaps. Mutates `pos` and returns the
   * contacts that were resolved (for velocity response and effects).
   */
  resolveCircle(pos: { x: number; z: number }, r: number, iterations: number, contacts: Contact[] = []): Contact[] {
    contacts.length = 0;
    for (let i = 0; i < iterations; i++) {
      let moved = false;
      for (const c of this.query(pos.x - r, pos.z - r, pos.x + r, pos.z + r, this.scratch)) {
        const contact = circleContact(pos.x, pos.z, r, c);
        if (!contact) continue;
        pos.x += contact.nx * contact.depth;
        pos.z += contact.nz * contact.depth;
        contacts.push(contact);
        moved = true;
      }
      if (!moved) break;
    }
    return contacts;
  }

  /** Distance along a normalized ray to the first collider (optionally only certain tags). */
  raycast(
    ox: number,
    oz: number,
    dx: number,
    dz: number,
    maxDist: number,
    tags?: readonly ColliderTag[],
    pad = 0,
  ): number {
    const ex = ox + dx * maxDist;
    const ez = oz + dz * maxDist;
    let best = maxDist;
    for (const c of this.query(Math.min(ox, ex), Math.min(oz, ez), Math.max(ox, ex), Math.max(oz, ez), this.scratch)) {
      if (tags && !tags.includes(c.tag)) continue;
      const t = c.kind === 'box' ? rayBox(ox, oz, dx, dz, c, pad) : rayCircle(ox, oz, dx, dz, c, pad);
      if (t < best) best = t;
    }
    return best;
  }

  segmentBlocked(ax: number, az: number, bx: number, bz: number, tags: readonly ColliderTag[] = ['wall']): boolean {
    const len = Math.hypot(bx - ax, bz - az);
    if (len < 1e-6) return false;
    return this.raycast(ax, az, (bx - ax) / len, (bz - az) / len, len, tags) < len - 1e-4;
  }
}
