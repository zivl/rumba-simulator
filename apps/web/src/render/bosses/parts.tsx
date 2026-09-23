import { INFRARED_COLORS } from '@roomba/core';
import { forwardRef, useMemo } from 'react';
import * as THREE from 'three';

/** Shared material helper: normal look or glowing-hot infrared look. */
export const useBossMaterial = (color: string, infrared: boolean, options: { opacity?: number; roughness?: number } = {}) =>
  useMemo(() => {
    if (infrared) return new THREE.MeshBasicMaterial({ color: INFRARED_COLORS.boss, transparent: options.opacity !== undefined, opacity: options.opacity ?? 1 });
    return new THREE.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.8,
      transparent: options.opacity !== undefined,
      opacity: options.opacity ?? 1,
      depthWrite: options.opacity === undefined,
    });
  }, [color, infrared, options.opacity, options.roughness]);

interface EyeProps {
  position: [number, number, number];
  size: number;
}

/** Googly eye; the pupil is the child mesh so it can be scaled to blink. */
export const Eye = forwardRef<THREE.Group, EyeProps>(({ position, size }, ref) => (
  <group ref={ref} position={position}>
    <mesh>
      <sphereGeometry args={[size, 16, 12]} />
      <meshStandardMaterial color="#ffffff" roughness={0.2} />
    </mesh>
    <mesh position={[0, 0, size * 0.72]}>
      <sphereGeometry args={[size * 0.45, 12, 10]} />
      <meshStandardMaterial color="#111111" roughness={0.1} />
    </mesh>
  </group>
));
Eye.displayName = 'Eye';
