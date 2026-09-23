import type { Rng } from '../math/rng';
import type { Bounds, CollisionWorld } from '../physics/collision';

export interface Waypoint {
  x: number;
  z: number;
}

/** Coarse walkability grid with BFS pathfinding for boss AI. */
export class NavGrid {
  readonly cols: number;
  readonly rows: number;
  private readonly walkable: Uint8Array;
  private readonly walkableCells: number[] = [];

  constructor(
    world: CollisionWorld,
    private readonly bounds: Bounds,
    private readonly resolution: number,
    radius: number,
  ) {
    this.cols = Math.ceil((bounds.maxX - bounds.minX) / resolution);
    this.rows = Math.ceil((bounds.maxZ - bounds.minZ) / resolution);
    this.walkable = new Uint8Array(this.cols * this.rows);
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const { x, z } = this.center(row * this.cols + col);
        if (world.isFree(x, z, radius)) {
          this.walkable[row * this.cols + col] = 1;
          this.walkableCells.push(row * this.cols + col);
        }
      }
    }
  }

  center(index: number): Waypoint {
    const col = index % this.cols;
    const row = (index - col) / this.cols;
    return { x: this.bounds.minX + (col + 0.5) * this.resolution, z: this.bounds.minZ + (row + 0.5) * this.resolution };
  }

  private indexOf(x: number, z: number): number {
    const col = Math.min(this.cols - 1, Math.max(0, Math.floor((x - this.bounds.minX) / this.resolution)));
    const row = Math.min(this.rows - 1, Math.max(0, Math.floor((z - this.bounds.minZ) / this.resolution)));
    return row * this.cols + col;
  }

  private nearestWalkable(index: number): number {
    if (this.walkable[index] === 1) return index;
    const col0 = index % this.cols;
    const row0 = (index - col0) / this.cols;
    for (let ring = 1; ring < 8; ring++) {
      for (let dr = -ring; dr <= ring; dr++) {
        for (let dc = -ring; dc <= ring; dc++) {
          const col = col0 + dc;
          const row = row0 + dr;
          if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) continue;
          const i = row * this.cols + col;
          if (this.walkable[i] === 1) return i;
        }
      }
    }
    return -1;
  }

  randomPoint(rng: Rng): Waypoint | null {
    return this.walkableCells.length ? this.center(rng.pick(this.walkableCells)) : null;
  }

  isWalkable(x: number, z: number): boolean {
    return this.walkable[this.indexOf(x, z)] === 1;
  }

  findPath(sx: number, sz: number, tx: number, tz: number): Waypoint[] {
    const start = this.nearestWalkable(this.indexOf(sx, sz));
    const goal = this.nearestWalkable(this.indexOf(tx, tz));
    if (start < 0 || goal < 0) return [];
    if (start === goal) return [{ x: tx, z: tz }];
    const prev = new Int32Array(this.cols * this.rows).fill(-1);
    prev[start] = start;
    const queue = new Int32Array(this.cols * this.rows);
    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    const dirs = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ] as const;
    while (head < tail) {
      const current = queue[head++] as number;
      if (current === goal) break;
      const col = current % this.cols;
      const row = (current - col) / this.cols;
      for (const [dc, dr] of dirs) {
        const nc = col + dc;
        const nr = row + dr;
        if (nc < 0 || nr < 0 || nc >= this.cols || nr >= this.rows) continue;
        const n = nr * this.cols + nc;
        if (this.walkable[n] !== 1 || prev[n] !== -1) continue;
        if (dc !== 0 && dr !== 0 && (this.walkable[row * this.cols + nc] !== 1 || this.walkable[nr * this.cols + col] !== 1)) continue;
        prev[n] = current;
        queue[tail++] = n;
      }
    }
    if (prev[goal] === -1) return [];
    const cells: number[] = [];
    for (let c = goal; c !== start; c = prev[c] as number) cells.push(c);
    cells.reverse();
    // Keep every other cell; followers smooth the rest by steering.
    const path = cells.filter((_, i) => i % 2 === 1 || i === cells.length - 1).map((c) => this.center(c));
    if (path.length > 0) path[path.length - 1] = this.isWalkable(tx, tz) ? { x: tx, z: tz } : (path[path.length - 1] as Waypoint);
    return path;
  }
}
