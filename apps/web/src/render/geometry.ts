import type { FurniturePart } from '@roomba/core';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1);
const UNIT_CYLINDER = new THREE.CylinderGeometry(0.5, 0.5, 1, 18);
const UNIT_SPHERE = new THREE.SphereGeometry(0.5, 16, 12);
const UNIT_CONE = new THREE.ConeGeometry(0.5, 1, 18, 1, true);

const matrix = new THREE.Matrix4();
const local = new THREE.Matrix4();
const yawMatrix = new THREE.Matrix4();
const quat = new THREE.Quaternion();
const euler = new THREE.Euler();
const pos = new THREE.Vector3();
const scale = new THREE.Vector3();

/** Converts a primitive part description into a world-space geometry. */
export const partGeometry = (part: FurniturePart): THREE.BufferGeometry => {
  let geometry: THREE.BufferGeometry;
  if (part.shape === 'torus') {
    geometry = new THREE.TorusGeometry(part.size[0], part.size[1], 8, 24);
    scale.set(1, 1, 1);
  } else {
    const base = part.shape === 'box' ? UNIT_BOX : part.shape === 'cylinder' ? UNIT_CYLINDER : part.shape === 'sphere' ? UNIT_SPHERE : UNIT_CONE;
    geometry = base.clone();
    scale.set(part.size[0], part.size[1], part.size[2]);
  }
  const [rx, ry, rz] = part.rotation ?? [0, 0, 0];
  euler.set(rx, ry, rz);
  quat.setFromEuler(euler);
  local.compose(pos.set(0, 0, 0), quat, scale);
  yawMatrix.makeRotationY(part.yaw ?? 0);
  matrix.makeTranslation(part.position[0], part.position[1], part.position[2]).multiply(yawMatrix).multiply(local);
  geometry.applyMatrix4(matrix);
  return geometry;
};

/** Merges geometries (all indexed, same attributes), disposing the inputs. */
export const mergeAll = (geometries: THREE.BufferGeometry[]): THREE.BufferGeometry | null => {
  if (geometries.length === 0) return null;
  const merged = mergeGeometries(geometries, false);
  for (const g of geometries) g.dispose();
  return merged;
};

export const boxGeometry = (x: number, y: number, z: number, w: number, h: number, d: number, yaw = 0): THREE.BufferGeometry =>
  partGeometry({ shape: 'box', position: [x, y, z], size: [w, h, d], yaw, material: 'white' });
