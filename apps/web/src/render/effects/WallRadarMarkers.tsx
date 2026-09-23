import { scanDirt, type Simulation } from '@roomba/core';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';

const MAX_MARKERS = 120;

/** Wall-penetrating radar: dirt behind walls glows through geometry (depth test off). */
export const WallRadarMarkers = ({ sim }: { sim: Simulation }) => {
  const timer = useRef(0);
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => new Float32Array(MAX_MARKERS * 3), []);
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setDrawRange(0, 0);
    return g;
  }, [positions]);
  const material = useMemo(
    () =>
      new THREE.PointsMaterial({ color: '#ff4fd8', size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0.85, depthTest: false, depthWrite: false }),
    [],
  );

  useFrame((state, delta) => {
    material.opacity = 0.55 + Math.sin(state.clock.elapsedTime * 5) * 0.3;
    timer.current -= delta;
    if (timer.current > 0) return;
    timer.current = 0.3;
    const range = sim.stats.wallRadarRange;
    const contacts = scanDirt(sim.dirt, sim.world, sim.roomba.x, sim.roomba.z, { range, throughWalls: true, maxContacts: MAX_MARKERS });
    let n = 0;
    for (const c of contacts) {
      if (c.visible) continue;
      positions.set([c.x, 0.05, c.z], n * 3);
      n++;
    }
    geometry.setDrawRange(0, n);
    geometry.attributes.position!.needsUpdate = true;
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} renderOrder={10} />;
};
