import { INFRARED_COLORS, ROOMBA_CONFIG, type Simulation } from '@roomba/core';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

const R = ROOMBA_CONFIG.radius;
/** Spotlight candela at light level 1; upgrades multiply it via stats.lightIntensity. */
const HEADLIGHT_CANDELA = 5;

interface RoombaProps {
  sim: Simulation;
  infrared: boolean;
  shadows: boolean;
}

const BRUSH_POSITIONS: readonly [number, number][] = [
  [-0.12, 0.11],
  [0.12, 0.11],
  [0, 0.155],
];

const SideBrush = ({ spinRef }: { spinRef: (g: THREE.Group | null) => void }) => (
  <group ref={spinRef}>
    {[0, 1, 2].map((i) => (
      <mesh key={i} rotation={[0, (i * Math.PI * 2) / 3, 0]} position={[0, 0, 0]}>
        <boxGeometry args={[0.006, 0.004, 0.13]} />
        <meshStandardMaterial color="#e8e8e8" roughness={0.8} />
      </mesh>
    ))}
    <mesh>
      <cylinderGeometry args={[0.014, 0.014, 0.01, 10]} />
      <meshStandardMaterial color="#222" />
    </mesh>
  </group>
);

export const Roomba = ({ sim, infrared, shadows }: RoombaProps) => {
  const group = useRef<THREE.Group>(null);
  const bumper = useRef<THREE.Mesh>(null);
  const brushes = useRef<(THREE.Group | null)[]>([]);
  const light = useRef<THREE.SpotLight>(null);
  const glow = useRef<THREE.PointLight>(null);
  const headlight = useRef<THREE.MeshStandardMaterial>(null);
  const button = useRef<THREE.MeshStandardMaterial>(null);
  const chargeRing = useRef<THREE.Mesh>(null);
  const suctionRing = useRef<THREE.Mesh>(null);
  const target = useMemo(() => new THREE.Object3D(), []);

  const bodyMaterial = useMemo(
    () => (infrared ? new THREE.MeshBasicMaterial({ color: INFRARED_COLORS.roomba }) : new THREE.MeshStandardMaterial({ color: '#2b2e33', roughness: 0.35, metalness: 0.4 })),
    [infrared],
  );
  const topMaterial = useMemo(
    () => (infrared ? new THREE.MeshBasicMaterial({ color: '#9ff8ff' }) : new THREE.MeshStandardMaterial({ color: '#8d949c', roughness: 0.2, metalness: 0.9 })),
    [infrared],
  );

  useEffect(() => {
    if (light.current) light.current.target = target;
  }, [target]);

  useFrame((state) => {
    const r = sim.roomba;
    const g = group.current;
    if (!g) return;
    g.position.set(r.x, 0, r.z);
    g.rotation.y = r.heading;
    const bump = Math.max(0, 1 - r.bumpAge * 6);
    if (bumper.current) bumper.current.position.z = -bump * 0.012;
    const count = sim.stats.brushCount;
    brushes.current.forEach((b, i) => {
      if (!b) return;
      b.visible = i < count;
      b.rotation.y = (i % 2 === 0 ? 1 : -1) * r.brushSpin;
    });
    const t = state.clock.elapsedTime;
    if (light.current) {
      // Intensity instead of visibility: changing the light count forces shader recompiles.
      light.current.intensity = r.lightsOn ? HEADLIGHT_CANDELA * sim.stats.lightIntensity : 0;
      light.current.distance = sim.stats.lightRange;
    }
    if (glow.current) glow.current.intensity = r.lightsOn ? 0.25 : 0;
    if (headlight.current) headlight.current.emissiveIntensity = r.lightsOn ? 3 : 0.05;
    if (button.current) {
      const low = sim.batteryFraction < 0.15;
      const color = r.charging ? '#39ff88' : low ? '#ff3344' : '#3fb6ff';
      button.current.emissive.set(color);
      button.current.emissiveIntensity = r.charging ? 1.5 + Math.sin(t * 5) : low ? 1 + Math.sin(t * 12) : 1.2;
    }
    if (chargeRing.current) {
      chargeRing.current.visible = r.charging;
      const s = 1 + ((t * 0.8) % 1) * 0.6;
      chargeRing.current.scale.set(s, s, s);
      (chargeRing.current.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - ((t * 0.8) % 1));
    }
    if (suctionRing.current) {
      suctionRing.current.visible = r.vacuumOn;
      suctionRing.current.rotation.y = -t * 6;
    }
  });

  return (
    <group ref={group}>
      <mesh position={[0, 0.045, 0]} material={bodyMaterial} castShadow={shadows}>
        <cylinderGeometry args={[R, R * 0.97, 0.07, 40]} />
      </mesh>
      <mesh position={[0, 0.082, 0]} material={topMaterial}>
        <cylinderGeometry args={[R * 0.9, R * 0.95, 0.008, 40]} />
      </mesh>
      <mesh position={[0, 0.088, -0.02]}>
        <cylinderGeometry args={[R * 0.55, R * 0.55, 0.004, 32]} />
        <meshStandardMaterial color="#111" roughness={0.15} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.092, 0.02]}>
        <cylinderGeometry args={[0.028, 0.028, 0.006, 20]} />
        <meshStandardMaterial ref={button} color="#111" emissive="#3fb6ff" emissiveIntensity={1.2} />
      </mesh>
      <mesh ref={bumper} position={[0, 0.04, 0]}>
        <cylinderGeometry args={[R + 0.006, R + 0.006, 0.05, 32, 1, true, -Math.PI / 2, Math.PI]} />
        <meshStandardMaterial color="#15171a" roughness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.058, R - 0.004]}>
        <boxGeometry args={[0.12, 0.012, 0.012]} />
        <meshStandardMaterial ref={headlight} color="#dfefff" emissive="#dff4ff" emissiveIntensity={0.05} />
      </mesh>
      {BRUSH_POSITIONS.map(([x, z], i) => (
        <group key={i} position={[x, 0.008, z]}>
          <SideBrush
            spinRef={(g) => {
              brushes.current[i] = g;
            }}
          />
        </group>
      ))}
      <mesh ref={suctionRing} position={[0, 0.004, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[R * 0.55, R * 0.85, 24, 1, 0, Math.PI * 1.6]} />
        <meshBasicMaterial color="#9fdcff" transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <mesh ref={chargeRing} position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[R * 1.05, R * 1.25, 40]} />
        <meshBasicMaterial color="#39ff88" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      <spotLight ref={light} position={[0, 0.07, R]} angle={0.7} penumbra={0.6} decay={1.2} castShadow={false} color="#eef6ff" />
      <pointLight ref={glow} position={[0, 0.1, R + 0.1]} intensity={0.25} distance={1.2} color="#dff0ff" />
      <primitive object={target} position={[0, 0.25, 3]} />
    </group>
  );
};
