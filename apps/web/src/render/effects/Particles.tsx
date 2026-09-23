import { CLEANING_CONFIG, ROOMBA_CONFIG, type Simulation } from '@roomba/core';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { fxBus, type FxEvent } from '../../game/fx';

const VERTEX = /* glsl */ `
  attribute float aAlpha;
  attribute float aSize;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vAlpha = aAlpha;
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    gl_FragColor = vec4(vColor, vAlpha * smoothstep(0.5, 0.15, d));
  }
`;

interface Pool {
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  alphas: Float32Array;
  sizes: Float32Array;
  life: Float32Array;
  maxLife: Float32Array;
  gravity: Float32Array;
  next: number;
}

const tmpColor = new THREE.Color();

/** One pooled point cloud for every short-lived effect (puffs, sparks, suction, charging). */
export const Particles = ({ sim, capacity }: { sim: Simulation; capacity: number }) => {
  const points = useRef<THREE.Points>(null);
  const suctionTimer = useRef(0);
  const pool = useMemo<Pool>(
    () => ({
      positions: new Float32Array(capacity * 3),
      velocities: new Float32Array(capacity * 3),
      colors: new Float32Array(capacity * 3),
      alphas: new Float32Array(capacity),
      sizes: new Float32Array(capacity),
      life: new Float32Array(capacity),
      maxLife: new Float32Array(capacity).fill(1),
      gravity: new Float32Array(capacity),
      next: 0,
    }),
    [capacity],
  );

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pool.positions, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(pool.colors, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(pool.alphas, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(pool.sizes, 1).setUsage(THREE.DynamicDrawUsage));
    return g;
  }, [pool]);

  const material = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthWrite: false }),
    [],
  );

  const spawn = (x: number, y: number, z: number, vx: number, vy: number, vz: number, color: string, size: number, life: number, gravity: number) => {
    const i = pool.next;
    pool.next = (pool.next + 1) % capacity;
    pool.positions.set([x, y, z], i * 3);
    pool.velocities.set([vx, vy, vz], i * 3);
    tmpColor.set(color);
    pool.colors.set([tmpColor.r, tmpColor.g, tmpColor.b], i * 3);
    pool.sizes[i] = size;
    pool.life[i] = life;
    pool.maxLife[i] = life;
    pool.gravity[i] = gravity;
  };

  useEffect(
    () =>
      fxBus.subscribe((event: FxEvent) => {
        const rand = Math.random;
        if (event.kind === 'puff') {
          const spread = event.spread ?? 0.05;
          const speed = event.speed ?? 0.4;
          for (let i = 0; i < event.count; i++) {
            const a = rand() * Math.PI * 2;
            spawn(
              event.x + Math.cos(a) * spread * rand(),
              (event.y ?? 0.02) + rand() * 0.05,
              event.z + Math.sin(a) * spread * rand(),
              Math.cos(a) * speed * rand(),
              speed * (0.5 + rand()),
              Math.sin(a) * speed * rand(),
              event.color,
              0.05 + rand() * 0.05 + spread * 0.1,
              0.4 + rand() * 0.4,
              -1.5,
            );
          }
        } else if (event.kind === 'spark') {
          for (let i = 0; i < event.count; i++) {
            const a = rand() * Math.PI * 2;
            spawn(event.x, 0.06, event.z, Math.cos(a) * 1.6, 0.6 + rand(), Math.sin(a) * 1.6, rand() > 0.5 ? '#fff6c2' : '#ffd166', 0.025, 0.3, -6);
          }
        } else {
          for (let i = 0; i < 28; i++) {
            const a = (i / 28) * Math.PI * 2;
            spawn(event.x, 0.2, event.z, Math.cos(a) * 2.2, 0.2, Math.sin(a) * 2.2, event.color, 0.12, 0.5, 0);
          }
        }
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool],
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const r = sim.roomba;
    const running = sim.status === 'running';
    // Continuous emitters: vacuum suction stream and charging sparkles.
    suctionTimer.current -= dt;
    if (running && suctionTimer.current <= 0) {
      suctionTimer.current = 0.03;
      if (r.vacuumOn) {
        const range = sim.stats.vacuumRange;
        const a = r.heading + (Math.random() - 0.5) * CLEANING_CONFIG.vacuumPullHalfAngle;
        const d = ROOMBA_CONFIG.radius + Math.random() * range;
        const px = r.x + Math.sin(a) * d;
        const pz = r.z + Math.cos(a) * d;
        const k = 2.2 / Math.max(0.2, d);
        spawn(px, 0.015, pz, (r.x - px) * k * 0.5, 0.05, (r.z - pz) * k * 0.5, '#cfe8ff', 0.02, 0.35, 0);
      }
      if (r.charging) {
        const a = Math.random() * Math.PI * 2;
        spawn(r.x + Math.cos(a) * 0.2, 0.05, r.z + Math.sin(a) * 0.2, 0, 0.5 + Math.random() * 0.4, 0, Math.random() > 0.5 ? '#39ff88' : '#b8ffcf', 0.035, 0.8, 0);
      }
      if (sim.batteryFraction < 0.15 && Math.random() < 0.25) {
        spawn(r.x, 0.1, r.z, (Math.random() - 0.5) * 0.3, 0.4, (Math.random() - 0.5) * 0.3, '#ff4d4d', 0.03, 0.5, 0);
      }
    }
    const { positions, velocities, alphas, life, maxLife, gravity } = pool;
    for (let i = 0; i < capacity; i++) {
      if (life[i] === undefined || (life[i] as number) <= 0) {
        alphas[i] = 0;
        continue;
      }
      life[i] = (life[i] as number) - dt;
      const i3 = i * 3;
      velocities[i3 + 1] = (velocities[i3 + 1] as number) + (gravity[i] as number) * dt;
      positions[i3] = (positions[i3] as number) + (velocities[i3] as number) * dt;
      positions[i3 + 1] = Math.max(0.005, (positions[i3 + 1] as number) + (velocities[i3 + 1] as number) * dt);
      positions[i3 + 2] = (positions[i3 + 2] as number) + (velocities[i3 + 2] as number) * dt;
      alphas[i] = Math.max(0, (life[i] as number) / (maxLife[i] as number)) * 0.9;
    }
    geometry.attributes.position!.needsUpdate = true;
    geometry.attributes.aColor!.needsUpdate = true;
    geometry.attributes.aAlpha!.needsUpdate = true;
    geometry.attributes.aSize!.needsUpdate = true;
    void state;
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} renderOrder={5} />;
};
