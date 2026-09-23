import type { MaterialKey } from '../config/materials';
import type { FloorMaterial, FurnitureKind, RoomType } from '../config/rooms';
import type { Bounds, Collider } from '../physics/collision';

export type PartShape = 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus';

/**
 * A primitive mesh description. Positions are part centres in metres.
 * box: size = [w, h, d]; cylinder/cone: [diameter, h, diameter];
 * sphere: ellipsoid diameters; torus: [radius, tube, unused].
 */
export interface FurniturePart {
  shape: PartShape;
  position: [number, number, number];
  size: [number, number, number];
  /** Local Euler rotation (XYZ), applied before `yaw`. */
  rotation?: [number, number, number];
  /** World rotation around Y applied after the local rotation. */
  yaw?: number;
  material: MaterialKey;
}

export interface FurnitureInstance {
  id: number;
  kind: FurnitureKind;
  roomId: number;
  x: number;
  z: number;
  rotation: number;
  /** World-space footprint (axis aligned). */
  footprint: Bounds;
  parts: FurniturePart[];
  colliders: Collider[];
}

export interface Room {
  id: number;
  type: RoomType;
  label: string;
  floor: FloorMaterial;
  cells: number[];
  bounds: Bounds;
  area: number;
  center: { x: number; z: number };
}

export interface WallBox {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  outer: boolean;
}

export interface DoorOpening {
  x: number;
  z: number;
  /** 'x' when the opening lies in a wall running along the x axis. */
  axis: 'x' | 'z';
  width: number;
  rooms: [number, number];
  wide: boolean;
}

export interface WindowOpening {
  x: number;
  z: number;
  axis: 'x' | 'z';
  width: number;
  /** Direction from the window towards the outside. */
  outward: { x: number; z: number };
}

export interface RugArea {
  bounds: Bounds;
  material: MaterialKey;
}

export interface ChargingStation {
  /** Where the roomba sits while charging. */
  dockX: number;
  dockZ: number;
  /** Station body position against the wall. */
  x: number;
  z: number;
  /** Rotation of the station; its front faces into the room. */
  rotation: number;
  roomId: number;
}

export interface HouseLayout {
  key: string;
  name: string;
  cellSize: number;
  wallHeight: number;
  cols: number;
  rows: number;
  bounds: Bounds;
  /** Room id per grid cell, -1 for outside. */
  grid: Int16Array;
  rooms: Room[];
  walls: WallBox[];
  doors: DoorOpening[];
  windows: WindowOpening[];
  furniture: FurnitureInstance[];
  rugs: RugArea[];
  station: ChargingStation;
  colliders: Collider[];
  isArena: boolean;
}
