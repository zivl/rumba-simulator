import { CAMERA_CONFIG, damp, type Simulation } from '@roomba/core';
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { cameraFx } from '../game/fx';
import type { CameraMode } from '../game/stores/gameStore';

const fpPos = new THREE.Vector3();
const fpLook = new THREE.Vector3();
const tpPos = new THREE.Vector3();
const tpLook = new THREE.Vector3();
const desiredPos = new THREE.Vector3();
const desiredLook = new THREE.Vector3();

/**
 * Blends a low first-person pose and a trailing third-person pose. The blend factor eases
 * between them so switching with C is a smooth swoop instead of a cut.
 */
export const CameraRig = ({ sim, mode }: { sim: Simulation; mode: CameraMode }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const blend = useRef(mode === 'third' ? 1 : 0);
  const smoothHeading = useRef(sim.roomba.heading);
  const look = useRef(new THREE.Vector3());
  const initialized = useRef(false);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const r = sim.roomba;
    const fp = CAMERA_CONFIG.firstPerson;
    const tp = CAMERA_CONFIG.thirdPerson;

    const target = mode === 'third' ? 1 : 0;
    const step = dt / CAMERA_CONFIG.transitionDuration;
    blend.current = target > blend.current ? Math.min(target, blend.current + step) : Math.max(target, blend.current - step);
    const t = THREE.MathUtils.smootherstep(blend.current, 0, 1);

    let dh = r.heading - smoothHeading.current;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    smoothHeading.current += dh * damp(6, dt);

    const fx = Math.sin(r.heading);
    const fz = Math.cos(r.heading);
    fpPos.set(r.x + fx * fp.forwardOffset, fp.height, r.z + fz * fp.forwardOffset);
    fpLook.set(fpPos.x + fx, fp.height + fp.pitch, fpPos.z + fz);

    const hx = Math.sin(smoothHeading.current);
    const hz = Math.cos(smoothHeading.current);
    // Pull the chase camera in when a wall is behind the roomba.
    const clearDist = sim.world.raycast(r.x, r.z, -hx, -hz, tp.distance, ['wall'], 0.08);
    const dist = Math.max(tp.minDistance, clearDist - 0.05);
    // When pulled in, rise so the view looks over the robot instead of into it.
    tpPos.set(r.x - hx * dist, tp.height * (1 + 0.5 * (1 - dist / tp.distance)), r.z - hz * dist);
    tpLook.set(r.x + hx * tp.lookAhead, tp.lookHeight, r.z + hz * tp.lookAhead);

    desiredPos.lerpVectors(fpPos, tpPos, t);
    desiredLook.lerpVectors(fpLook, tpLook, t);

    if (!initialized.current) {
      camera.position.copy(desiredPos);
      look.current.copy(desiredLook);
      initialized.current = true;
    } else {
      // First person stays glued to the robot for responsiveness; the chase cam trails.
      const sharpness = THREE.MathUtils.lerp(40, CAMERA_CONFIG.followSharpness, t);
      const k = damp(sharpness, dt);
      camera.position.lerp(desiredPos, k);
      look.current.lerp(desiredLook, k);
    }

    if (cameraFx.shake > 0.0005) {
      camera.position.x += (Math.random() - 0.5) * cameraFx.shake;
      camera.position.y += (Math.random() - 0.5) * cameraFx.shake * 0.5;
      camera.position.z += (Math.random() - 0.5) * cameraFx.shake;
      cameraFx.shake *= Math.exp(-8 * dt);
    }
    camera.position.y = Math.max(0.04, camera.position.y);
    camera.lookAt(look.current);
    const fov = THREE.MathUtils.lerp(fp.fov, tp.fov, t);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
};
