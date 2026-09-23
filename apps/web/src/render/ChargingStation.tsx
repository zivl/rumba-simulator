import { INFRARED_COLORS, type Simulation } from '@roomba/core';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

export const ChargingStation = ({ sim, infrared }: { sim: Simulation; infrared: boolean }) => {
  const { station } = sim.house;
  const led = useRef<THREE.MeshStandardMaterial>(null);
  const beam = useRef<THREE.Mesh>(null);
  const pad = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const charging = sim.roomba.charging;
    if (led.current) led.current.emissiveIntensity = charging ? 2 + Math.sin(t * 6) * 1.2 : 0.8 + Math.sin(t * 2) * 0.3;
    if (beam.current) {
      beam.current.visible = charging;
      beam.current.scale.y = 0.9 + Math.sin(t * 8) * 0.1;
    }
    if (pad.current) pad.current.opacity = charging ? 0.55 : 0.18 + Math.sin(t * 2.5) * 0.08;
  });

  const bodyColor = infrared ? INFRARED_COLORS.station : '#23262b';
  return (
    <group>
      <group position={[station.x, 0, station.z]} rotation={[0, station.rotation, 0]}>
        <mesh position={[0, 0.08, 0]} castShadow>
          <boxGeometry args={[0.42, 0.16, 0.14]} />
          {infrared ? <meshBasicMaterial color={bodyColor} /> : <meshStandardMaterial color={bodyColor} roughness={0.4} metalness={0.3} />}
        </mesh>
        <mesh position={[0, 0.15, 0.02]}>
          <boxGeometry args={[0.36, 0.03, 0.12]} />
          <meshStandardMaterial color="#3a3f46" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.11, 0.071]}>
          <boxGeometry args={[0.1, 0.02, 0.004]} />
          <meshStandardMaterial ref={led} color="#0f3" emissive="#39ff88" emissiveIntensity={1} />
        </mesh>
        <mesh position={[0, 0.006, 0.18]}>
          <boxGeometry args={[0.46, 0.012, 0.22]} />
          <meshStandardMaterial color="#1b1d21" roughness={0.5} />
        </mesh>
        {[-0.1, 0.1].map((x) => (
          <mesh key={x} position={[x, 0.014, 0.16]}>
            <boxGeometry args={[0.05, 0.006, 0.08]} />
            <meshStandardMaterial color="#c9a227" metalness={1} roughness={0.25} />
          </mesh>
        ))}
      </group>
      <mesh position={[station.dockX, 0.004, station.dockZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.2, 0.3, 40]} />
        <meshBasicMaterial ref={pad} color="#39ff88" transparent opacity={0.2} depthWrite={false} />
      </mesh>
      <mesh ref={beam} position={[station.dockX, 0.6, station.dockZ]}>
        <cylinderGeometry args={[0.22, 0.22, 1.2, 24, 1, true]} />
        <meshBasicMaterial color="#39ff88" transparent opacity={0.12} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
