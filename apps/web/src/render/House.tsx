import { WALL_CONFIG, type FloorMaterial, type HouseLayout, type LightingMood, type MaterialKey } from '@roomba/core';
import { useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { boxGeometry, mergeAll, partGeometry } from './geometry';
import { getFloorMaterial, getMaterial, INFRARED_FLOOR, INFRARED_WALL } from './materials';

interface HouseProps {
  house: HouseLayout;
  infrared: boolean;
  mood: LightingMood;
  wallColor: string;
  shadows: boolean;
}

const WINDOW_LIGHT: Record<LightingMood, string> = { day: '#d8ecff', evening: '#ffb877', night: '#1a2a4a' };

const floorGeometry = (house: HouseLayout, floor: FloorMaterial, scaleMeters: number): THREE.BufferGeometry | null => {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (const room of house.rooms) {
    if (room.floor !== floor) continue;
    for (const cell of room.cells) {
      const col = cell % house.cols;
      const row = (cell - col) / house.cols;
      const x0 = house.bounds.minX + col * house.cellSize;
      const z0 = house.bounds.minZ + row * house.cellSize;
      const x1 = x0 + house.cellSize;
      const z1 = z0 + house.cellSize;
      const base = positions.length / 3;
      positions.push(x0, 0, z0, x1, 0, z0, x1, 0, z1, x0, 0, z1);
      uvs.push(x0 / scaleMeters, z0 / scaleMeters, x1 / scaleMeters, z0 / scaleMeters, x1 / scaleMeters, z1 / scaleMeters, x0 / scaleMeters, z1 / scaleMeters);
      indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }
  }
  if (positions.length === 0) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

const Floors = ({ house, infrared }: { house: HouseLayout; infrared: boolean }) => {
  const gl = useThree((s) => s.gl);
  const floors = useMemo(() => {
    const kinds = [...new Set(house.rooms.map((r) => r.floor))];
    return kinds.flatMap((kind) => {
      const { material, scale } = getFloorMaterial(kind, gl.capabilities.getMaxAnisotropy());
      const geometry = floorGeometry(house, kind, scale);
      return geometry ? [{ kind, geometry, material }] : [];
    });
  }, [house, gl]);
  useEffect(() => () => floors.forEach((f) => f.geometry.dispose()), [floors]);
  return (
    <>
      {floors.map((f) => (
        <mesh key={f.kind} geometry={f.geometry} material={infrared ? INFRARED_FLOOR : f.material} receiveShadow />
      ))}
    </>
  );
};

const Walls = ({ house, infrared, wallColor, shadows, mood }: { house: HouseLayout; infrared: boolean; wallColor: string; shadows: boolean; mood: LightingMood }) => {
  const wallRef = useRef<THREE.InstancedMesh>(null);
  const baseRef = useRef<THREE.InstancedMesh>(null);
  const wallMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.92 }), [wallColor]);
  const baseMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.6 }), []);
  const unitBox = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    house.walls.forEach((w, i) => {
      m.compose(new THREE.Vector3(w.x, w.height / 2, w.z), q, new THREE.Vector3(w.width, w.height, w.depth));
      wallRef.current?.setMatrixAt(i, m);
      m.compose(
        new THREE.Vector3(w.x, WALL_CONFIG.baseboardHeight / 2, w.z),
        q,
        new THREE.Vector3(w.width + 0.024, WALL_CONFIG.baseboardHeight, w.depth + 0.024),
      );
      baseRef.current?.setMatrixAt(i, m);
    });
    if (wallRef.current) wallRef.current.instanceMatrix.needsUpdate = true;
    if (baseRef.current) baseRef.current.instanceMatrix.needsUpdate = true;
  }, [house]);

  const { trims, panes, lintels } = useMemo(() => {
    const t = WALL_CONFIG.thickness;
    const lintelGeoms: THREE.BufferGeometry[] = [];
    const trimGeoms: THREE.BufferGeometry[] = [];
    for (const door of house.doors) {
      const h = house.wallHeight - WALL_CONFIG.doorHeight;
      const yaw = door.axis === 'z' ? Math.PI / 2 : 0;
      lintelGeoms.push(boxGeometry(door.x, WALL_CONFIG.doorHeight + h / 2, door.z, door.width + t, h, t, yaw));
      const half = door.width / 2;
      const along = door.axis === 'x' ? { x: 1, z: 0 } : { x: 0, z: 1 };
      for (const side of [-1, 1]) {
        trimGeoms.push(boxGeometry(door.x + along.x * side * half, WALL_CONFIG.doorHeight / 2, door.z + along.z * side * half, 0.06, WALL_CONFIG.doorHeight, t + 0.03, yaw));
      }
      trimGeoms.push(boxGeometry(door.x, WALL_CONFIG.doorHeight + 0.03, door.z, door.width + 0.06, 0.06, t + 0.03, yaw));
    }
    const paneGeoms: THREE.BufferGeometry[] = [];
    for (const win of house.windows) {
      const yaw = win.axis === 'z' ? Math.PI / 2 : 0;
      paneGeoms.push(boxGeometry(win.x, 1.45, win.z, win.width, 1.1, t + 0.012, yaw));
      trimGeoms.push(boxGeometry(win.x, 0.88, win.z, win.width + 0.1, 0.05, t + 0.06, yaw));
      trimGeoms.push(boxGeometry(win.x, 2.02, win.z, win.width + 0.1, 0.05, t + 0.03, yaw));
      trimGeoms.push(boxGeometry(win.x, 1.45, win.z, 0.04, 1.1, t + 0.03, yaw));
    }
    return { trims: mergeAll(trimGeoms), panes: mergeAll(paneGeoms), lintels: mergeAll(lintelGeoms) };
  }, [house]);

  useEffect(
    () => () => {
      trims?.dispose();
      panes?.dispose();
      lintels?.dispose();
    },
    [trims, panes, lintels],
  );

  return (
    <>
      <instancedMesh
        ref={wallRef}
        args={[unitBox, undefined, house.walls.length]}
        material={infrared ? INFRARED_WALL : wallMaterial}
        castShadow={shadows}
        receiveShadow
      />
      <instancedMesh ref={baseRef} args={[unitBox, undefined, house.walls.length]} material={infrared ? INFRARED_WALL : baseMaterial} />
      {lintels && <mesh geometry={lintels} material={infrared ? INFRARED_WALL : wallMaterial} castShadow={shadows} receiveShadow />}
      {trims && <mesh geometry={trims} material={infrared ? INFRARED_WALL : baseMaterial} />}
      {panes && <WindowPanes geometry={panes} infrared={infrared} mood={mood} />}
    </>
  );
};

const WindowPanes = ({ geometry, infrared, mood }: { geometry: THREE.BufferGeometry; infrared: boolean; mood: LightingMood }) => {
  const material = useMemo(() => new THREE.MeshBasicMaterial({ color: WINDOW_LIGHT[mood] }), [mood]);
  return <mesh geometry={geometry} material={infrared ? INFRARED_WALL : material} />;
};

const Furniture = ({ house, infrared, shadows }: { house: HouseLayout; infrared: boolean; shadows: boolean }) => {
  const groups = useMemo(() => {
    const byMaterial = new Map<MaterialKey, THREE.BufferGeometry[]>();
    for (const item of house.furniture) {
      for (const part of item.parts) {
        const list = byMaterial.get(part.material) ?? [];
        list.push(partGeometry(part));
        byMaterial.set(part.material, list);
      }
    }
    return [...byMaterial.entries()].flatMap(([key, geoms]) => {
      const geometry = mergeAll(geoms);
      return geometry ? [{ key, geometry }] : [];
    });
  }, [house]);
  useEffect(() => () => groups.forEach((g) => g.geometry.dispose()), [groups]);
  return (
    <>
      {groups.map((g) => (
        <mesh key={g.key} geometry={g.geometry} material={getMaterial(g.key, infrared)} castShadow={shadows} receiveShadow />
      ))}
    </>
  );
};

const Ceiling = ({ house, infrared }: { house: HouseLayout; infrared: boolean }) => {
  const w = house.bounds.maxX - house.bounds.minX;
  const d = house.bounds.maxZ - house.bounds.minZ;
  return (
    <mesh position={[0, house.wallHeight, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[w + 0.3, d + 0.3]} />
      {infrared ? <meshBasicMaterial color="#0b0620" /> : <meshStandardMaterial color="#f3f0ea" roughness={1} />}
    </mesh>
  );
};

export const House = ({ house, infrared, mood, wallColor, shadows }: HouseProps) => {
  return (
    <group>
      <Floors house={house} infrared={infrared} />
      <Walls house={house} infrared={infrared} wallColor={wallColor} shadows={shadows} mood={mood} />
      <Furniture house={house} infrared={infrared} shadows={shadows} />
      <Ceiling house={house} infrared={infrared} />
    </group>
  );
};
