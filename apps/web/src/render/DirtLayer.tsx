import { DIRT_TYPES, INFRARED_COLORS, type DirtParticle, type DirtShape, type HouseLayout, type Simulation } from '@roomba/core';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

const SHAPES: readonly DirtShape[] = ['tuft', 'lump', 'blob', 'strand', 'chunk', 'crumb', 'footprint'];

const createShapeGeometry = (shape: DirtShape): THREE.BufferGeometry => {
  switch (shape) {
    case 'tuft': {
      const g = new THREE.IcosahedronGeometry(0.5, 0);
      g.scale(1, 0.45, 1);
      g.translate(0, 0.18, 0);
      return g;
    }
    case 'lump': {
      const g = new THREE.DodecahedronGeometry(0.5, 0);
      g.scale(1, 0.6, 1);
      g.translate(0, 0.25, 0);
      return g;
    }
    case 'blob': {
      const g = new THREE.CylinderGeometry(0.5, 0.55, 0.05, 12);
      g.translate(0, 0.025, 0);
      return g;
    }
    case 'strand': {
      const g = new THREE.TorusGeometry(0.4, 0.035, 4, 14, Math.PI * 1.3);
      g.rotateX(Math.PI / 2);
      g.translate(0, 0.03, 0);
      return g;
    }
    case 'chunk': {
      const g = new THREE.BoxGeometry(0.8, 0.5, 0.6);
      g.translate(0, 0.25, 0);
      return g;
    }
    case 'crumb': {
      const g = new THREE.BoxGeometry(0.7, 0.5, 0.6);
      g.translate(0, 0.25, 0);
      return g;
    }
    case 'footprint': {
      const g = new THREE.CylinderGeometry(0.5, 0.5, 0.02, 14);
      g.scale(0.42, 1, 1);
      g.translate(0, 0.01, 0);
      return g;
    }
  }
};

const HEADROOM = 1200;
const SPAWN_GROW_TIME = 0.35;
/** Flat decals keep a fixed thin height (instance y-scale) instead of scaling uniformly. */
const FLAT_HEIGHT: Partial<Record<DirtShape, number>> = { blob: 0.15, footprint: 0.3 };

interface ShapeBatch {
  shape: DirtShape;
  mesh: THREE.InstancedMesh;
  particles: DirtParticle[];
}

const matrix = new THREE.Matrix4();
const quat = new THREE.Quaternion();
const up = new THREE.Vector3(0, 1, 0);
const pos = new THREE.Vector3();
const scale = new THREE.Vector3();
const color = new THREE.Color();
const irColor = new THREE.Color(INFRARED_COLORS.dirt);
const irHot = new THREE.Color(INFRARED_COLORS.dirtHot);

/** Dirt particles rendered as one instanced mesh per shape (few draw calls for thousands of specks). */
export const DirtLayer = ({ sim, infrared }: { sim: Simulation; infrared: boolean }) => {
  const group = useRef<THREE.Group>(null);
  const batches = useRef<ShapeBatch[]>([]);
  const lastVersion = useRef(-1);
  const lastChange = useRef(-1);
  const lastSpawnTime = useRef(-10);
  const geometries = useMemo(() => new Map(SHAPES.map((s) => [s, createShapeGeometry(s)])), []);
  const material = useMemo(
    () => (infrared ? new THREE.MeshBasicMaterial({ color: '#ffffff' }) : new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95 })),
    [infrared],
  );

  const rebuild = () => {
    const g = group.current;
    if (!g) return;
    for (const b of batches.current) {
      g.remove(b.mesh);
      b.mesh.dispose();
    }
    const byShape = new Map<DirtShape, DirtParticle[]>();
    for (const p of sim.dirt.particles) {
      const list = byShape.get(p.shape) ?? [];
      list.push(p);
      byShape.set(p.shape, list);
    }
    batches.current = SHAPES.map((shape) => {
      const particles = byShape.get(shape) ?? [];
      const capacity = particles.length + (sim.boss ? HEADROOM : 16);
      const mesh = new THREE.InstancedMesh(geometries.get(shape) as THREE.BufferGeometry, material, capacity);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      mesh.receiveShadow = shape === 'blob' || shape === 'footprint';
      g.add(mesh);
      return { shape, mesh, particles };
    });
    lastVersion.current = sim.dirt.version;
    lastChange.current = -1;
  };

  useEffect(() => {
    rebuild();
    return () => {
      for (const b of batches.current) {
        group.current?.remove(b.mesh);
        b.mesh.dispose();
      }
      batches.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, material]);

  useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);

  useFrame(() => {
    const field = sim.dirt;
    if (field.version !== lastVersion.current) {
      // New particles (boss spawns): append to batches, rebuild if a batch overflows.
      let overflow = false;
      const known = new Set(batches.current.flatMap((b) => b.particles));
      for (const p of field.particles) {
        if (known.has(p)) continue;
        const batch = batches.current.find((b) => b.shape === p.shape);
        if (!batch) continue;
        if (batch.particles.length >= batch.mesh.instanceMatrix.count) overflow = true;
        batch.particles.push(p);
      }
      if (overflow) rebuild();
      lastVersion.current = field.version;
      lastChange.current = -1;
      lastSpawnTime.current = sim.time;
    }
    const time = sim.time;
    const growing = time - lastSpawnTime.current < SPAWN_GROW_TIME + 0.05;
    if (field.changeCounter === lastChange.current && !growing) return;
    lastChange.current = field.changeCounter;
    for (const batch of batches.current) {
      const { mesh, particles } = batch;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i] as DirtParticle;
        if (p.cleaned) {
          scale.set(0, 0, 0);
        } else {
          const grow = p.bornAt >= 0 ? Math.min(1, (time - p.bornAt) / SPAWN_GROW_TIME) : 1;
          const s = p.size * (0.3 + 0.7 * p.health) * grow;
          const flatHeight = FLAT_HEIGHT[p.shape];
          scale.set(s, flatHeight === undefined ? s : flatHeight * (0.4 + 0.6 * p.health), s);
        }
        quat.setFromAxisAngle(up, p.rotation);
        pos.set(p.x, p.pulled ? 0.006 : 0.001, p.z);
        matrix.compose(pos, quat, scale);
        mesh.setMatrixAt(i, matrix);
        if (infrared) {
          color.copy(irColor).lerp(irHot, 1 - p.health);
        } else {
          color.set(DIRT_TYPES[p.type].colors[p.colorIndex] ?? '#777');
        }
        mesh.setColorAt(i, color);
      }
      mesh.count = particles.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  });

  return <group ref={group} />;
};

/**
 * A stain texture over the whole house. Dirt paints dark blotches that get erased as it is
 * cleaned, so the floor visibly becomes cleaner.
 */
export const FloorGrime = ({ sim, resolution }: { sim: Simulation; resolution: number }) => {
  const house: HouseLayout = sim.house;
  const state = useRef<Uint8Array>(new Uint8Array(0));
  const timer = useRef(0);
  const { canvas, ctx, texture, width, depth } = useMemo(() => {
    const w = house.bounds.maxX - house.bounds.minX;
    const d = house.bounds.maxZ - house.bounds.minZ;
    const c = document.createElement('canvas');
    const aspect = w / d;
    c.width = aspect >= 1 ? resolution : Math.round(resolution * aspect);
    c.height = aspect >= 1 ? Math.round(resolution / aspect) : resolution;
    const context = c.getContext('2d') as CanvasRenderingContext2D;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, ctx: context, texture: tex, width: w, depth: d };
  }, [house, resolution]);

  useEffect(() => () => texture.dispose(), [texture]);

  useFrame((_, delta) => {
    timer.current -= delta;
    if (timer.current > 0) return;
    timer.current = 0.2;
    const particles = sim.dirt.particles;
    if (state.current.length < particles.length) {
      const grown = new Uint8Array(particles.length + 512);
      grown.set(state.current);
      state.current = grown;
    }
    const sx = canvas.width / width;
    const sz = canvas.height / depth;
    let changed = false;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i] as DirtParticle;
      const st = state.current[i];
      const cx = (p.x - house.bounds.minX) * sx;
      const cz = (p.z - house.bounds.minZ) * sz;
      const radius = Math.max(2, p.size * 2.2 * sx * (p.shape === 'footprint' ? 1.4 : 1));
      if (st === 0 && !p.cleaned) {
        const stain = DIRT_TYPES[p.type].stain;
        const gradient = ctx.createRadialGradient(cx, cz, 0, cx, cz, radius);
        gradient.addColorStop(0, `rgba(58,44,30,${0.32 * stain})`);
        gradient.addColorStop(1, 'rgba(58,44,30,0)');
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cz, radius, 0, Math.PI * 2);
        ctx.fill();
        state.current[i] = 1;
        changed = true;
      } else if (st === 1 && p.cleaned) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,0.9)';
        ctx.beginPath();
        ctx.arc(cx, cz, radius * 1.1, 0, Math.PI * 2);
        ctx.fill();
        state.current[i] = 2;
        changed = true;
      }
    }
    if (changed) texture.needsUpdate = true;
  });

  return (
    <mesh position={[(house.bounds.minX + house.bounds.maxX) / 2, 0.0015, (house.bounds.minZ + house.bounds.maxZ) / 2]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={[width, depth]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} polygonOffset polygonOffsetFactor={-1} />
    </mesh>
  );
};
