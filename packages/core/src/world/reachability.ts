import type { Rng } from '../math/rng';
import type { Bounds, CollisionWorld } from '../physics/collision';

/**
 * Configuration-space flood fill: a cell is reachable when the roomba's centre can sit
 * there and it is connected to the start. Used to guarantee stages are solvable.
 */
export class ReachabilityMap {
  readonly cols: number;
  readonly rows: number;
  readonly reachable: Uint8Array;
  readonly reachableCells: number[] = [];

  constructor(
    world: CollisionWorld,
    readonly bounds: Bounds,
    readonly resolution: number,
    radius: number,
    startX: number,
    startZ: number,
  ) {
    this.cols = Math.ceil((bounds.maxX - bounds.minX) / resolution);
    this.rows = Math.ceil((bounds.maxZ - bounds.minZ) / resolution);
    const total = this.cols * this.rows;
    const free = new Uint8Array(total);
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const [x, z] = this.cellCenter(col, row);
        free[row * this.cols + col] = world.isFree(x, z, radius) ? 1 : 0;
      }
    }
    this.reachable = new Uint8Array(total);
    const start = this.nearestFreeCell(free, startX, startZ);
    if (start < 0) return;
    const queue = [start];
    this.reachable[start] = 1;
    while (queue.length > 0) {
      const index = queue.pop() as number;
      this.reachableCells.push(index);
      const col = index % this.cols;
      const row = (index - col) / this.cols;
      const neighbours = [
        col > 0 ? index - 1 : -1,
        col < this.cols - 1 ? index + 1 : -1,
        row > 0 ? index - this.cols : -1,
        row < this.rows - 1 ? index + this.cols : -1,
      ];
      for (const n of neighbours) {
        if (n >= 0 && free[n] === 1 && this.reachable[n] === 0) {
          this.reachable[n] = 1;
          queue.push(n);
        }
      }
    }
  }

  cellCenter(col: number, row: number): [number, number] {
    return [this.bounds.minX + (col + 0.5) * this.resolution, this.bounds.minZ + (row + 0.5) * this.resolution];
  }

  cellIndex(x: number, z: number): number {
    const col = Math.floor((x - this.bounds.minX) / this.resolution);
    const row = Math.floor((z - this.bounds.minZ) / this.resolution);
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return -1;
    return row * this.cols + col;
  }

  private nearestFreeCell(free: Uint8Array, x: number, z: number): number {
    const center = this.cellIndex(x, z);
    if (center >= 0 && free[center] === 1) return center;
    const maxRing = 6;
    const col0 = Math.floor((x - this.bounds.minX) / this.resolution);
    const row0 = Math.floor((z - this.bounds.minZ) / this.resolution);
    for (let ring = 1; ring <= maxRing; ring++) {
      for (let dr = -ring; dr <= ring; dr++) {
        for (let dc = -ring; dc <= ring; dc++) {
          const col = col0 + dc;
          const row = row0 + dr;
          if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) continue;
          const i = row * this.cols + col;
          if (free[i] === 1) return i;
        }
      }
    }
    return -1;
  }

  isReachable(x: number, z: number): boolean {
    const i = this.cellIndex(x, z);
    return i >= 0 && this.reachable[i] === 1;
  }

  /** True when a reachable roomba position lies within `distance` of the point. */
  isNearReachable(x: number, z: number, distance: number): boolean {
    const steps = Math.ceil(distance / this.resolution);
    const col0 = Math.floor((x - this.bounds.minX) / this.resolution);
    const row0 = Math.floor((z - this.bounds.minZ) / this.resolution);
    const d2 = distance * distance;
    for (let dr = -steps; dr <= steps; dr++) {
      for (let dc = -steps; dc <= steps; dc++) {
        const col = col0 + dc;
        const row = row0 + dr;
        if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) continue;
        if (this.reachable[row * this.cols + col] !== 1) continue;
        const [cx, cz] = this.cellCenter(col, row);
        if ((cx - x) ** 2 + (cz - z) ** 2 <= d2) return true;
      }
    }
    return false;
  }

  randomPoint(rng: Rng): { x: number; z: number } | null {
    if (this.reachableCells.length === 0) return null;
    const index = rng.pick(this.reachableCells);
    const col = index % this.cols;
    const row = (index - col) / this.cols;
    const [x, z] = this.cellCenter(col, row);
    return { x, z };
  }
}
