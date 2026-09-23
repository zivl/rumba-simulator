import {
  INFRARED_COLORS,
  MATERIALS,
  THERMAL_COLORS,
  type FloorMaterial,
  type MaterialKey,
  type Thermal,
} from '@roomba/core';
import * as THREE from 'three';

const standardCache = new Map<MaterialKey, THREE.MeshStandardMaterial>();
const thermalCache = new Map<Thermal, THREE.MeshBasicMaterial>();

export const getMaterial = (key: MaterialKey, infrared: boolean): THREE.Material => {
  const def = MATERIALS[key];
  if (infrared) {
    let m = thermalCache.get(def.thermal);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color: THERMAL_COLORS[def.thermal] });
      thermalCache.set(def.thermal, m);
    }
    return m;
  }
  let m = standardCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: def.roughness,
      metalness: def.metalness,
      ...(def.emissive ? { emissive: new THREE.Color(def.emissive), emissiveIntensity: def.emissiveIntensity ?? 1 } : {}),
      ...(def.opacity !== undefined ? { transparent: true, opacity: def.opacity } : {}),
    });
    standardCache.set(key, m);
  }
  return m;
};

export const infraredBasic = (color: string): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ color });

/** Tiny deterministic noise so textures look the same every run. */
const noise = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
};

const makeCanvas = (size: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return [canvas, ctx];
};

const drawPlanks = (ctx: CanvasRenderingContext2D, size: number, base: [number, number, number], variance: number, rows: number): void => {
  const rnd = noise(7);
  const plankH = size / rows;
  for (let row = 0; row < rows; row++) {
    let x = -rnd() * size * 0.5;
    while (x < size) {
      const len = size * (0.35 + rnd() * 0.4);
      const shade = 1 + (rnd() - 0.5) * variance;
      ctx.fillStyle = `rgb(${base[0] * shade},${base[1] * shade},${base[2] * shade})`;
      ctx.fillRect(x, row * plankH, len, plankH);
      for (let g = 0; g < 6; g++) {
        ctx.strokeStyle = `rgba(0,0,0,${0.05 + rnd() * 0.06})`;
        ctx.beginPath();
        const gy = row * plankH + rnd() * plankH;
        ctx.moveTo(x, gy);
        ctx.bezierCurveTo(x + len * 0.3, gy + (rnd() - 0.5) * 4, x + len * 0.6, gy + (rnd() - 0.5) * 4, x + len, gy);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x, row * plankH, 2, plankH);
      x += len;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(0, row * plankH, size, 1.5);
  }
};

const drawTiles = (ctx: CanvasRenderingContext2D, size: number, count: number, base: string, grout: string, variance: number): void => {
  const rnd = noise(11);
  ctx.fillStyle = grout;
  ctx.fillRect(0, 0, size, size);
  const t = size / count;
  for (let i = 0; i < count; i++) {
    for (let j = 0; j < count; j++) {
      ctx.fillStyle = base;
      ctx.globalAlpha = 1 - rnd() * variance;
      ctx.fillRect(i * t + 1.5, j * t + 1.5, t - 3, t - 3);
    }
  }
  ctx.globalAlpha = 1;
};

const drawSpeckle = (ctx: CanvasRenderingContext2D, size: number, base: string, dots: number, dotColor: string, dotSize: number): void => {
  const rnd = noise(3);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = dotColor;
  for (let i = 0; i < dots; i++) {
    ctx.globalAlpha = 0.1 + rnd() * 0.25;
    ctx.fillRect(rnd() * size, rnd() * size, dotSize, dotSize);
  }
  ctx.globalAlpha = 1;
};

interface FloorTextureSpec {
  /** Metres covered by one texture repeat. */
  scale: number;
  roughness: number;
  draw: (ctx: CanvasRenderingContext2D, size: number) => void;
}

const FLOOR_SPECS: Record<FloorMaterial, FloorTextureSpec> = {
  wood: { scale: 2, roughness: 0.55, draw: (c, s) => drawPlanks(c, s, [168, 118, 74], 0.25, 10) },
  woodDark: { scale: 2, roughness: 0.45, draw: (c, s) => drawPlanks(c, s, [104, 70, 46], 0.3, 10) },
  laminate: { scale: 2, roughness: 0.5, draw: (c, s) => drawPlanks(c, s, [196, 170, 132], 0.15, 8) },
  tile: { scale: 1.8, roughness: 0.25, draw: (c, s) => drawTiles(c, s, 3, '#e8e4dc', '#b9b2a6', 0.08) },
  tileSmall: { scale: 1, roughness: 0.2, draw: (c, s) => drawTiles(c, s, 6, '#dfe9ec', '#9fb0b5', 0.1) },
  carpet: { scale: 1, roughness: 1, draw: (c, s) => drawSpeckle(c, s, '#8f8a80', 9000, '#3a362f', 2) },
  concrete: { scale: 2.5, roughness: 0.85, draw: (c, s) => drawSpeckle(c, s, '#a3a19c', 5000, '#5b5a57', 3) },
};

const floorCache = new Map<FloorMaterial, THREE.MeshStandardMaterial>();

export const getFloorMaterial = (floor: FloorMaterial, maxAnisotropy: number): { material: THREE.MeshStandardMaterial; scale: number } => {
  const spec = FLOOR_SPECS[floor];
  let material = floorCache.get(floor);
  if (!material) {
    const [canvas, ctx] = makeCanvas(512);
    spec.draw(ctx, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, maxAnisotropy);
    material = new THREE.MeshStandardMaterial({ map: texture, roughness: spec.roughness, metalness: 0 });
    floorCache.set(floor, material);
  }
  return { material, scale: spec.scale };
};

export const INFRARED_FLOOR = new THREE.MeshBasicMaterial({ color: INFRARED_COLORS.floor });
export const INFRARED_WALL = new THREE.MeshBasicMaterial({ color: INFRARED_COLORS.wall });
