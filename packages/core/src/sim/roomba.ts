import { ROOMBA_CONFIG } from '../config/roomba';
import { approach, clamp } from '../math/vec';
import type { CollisionWorld, Contact } from '../physics/collision';
import type { ControlInput } from './events';

export interface RoombaState {
  x: number;
  z: number;
  heading: number;
  /** Signed speed along the heading. */
  speed: number;
  angularVelocity: number;
  /** Velocity from impacts (knockbacks), decays with friction. */
  externalVx: number;
  externalVz: number;
  externalSpin: number;
  battery: number;
  brushOn: boolean;
  vacuumOn: boolean;
  lightsOn: boolean;
  infraredOn: boolean;
  charging: boolean;
  chargeEngage: number;
  stunTimer: number;
  collisionCooldown: number;
  /** Seconds since the last bump, used for bumper animation. */
  bumpAge: number;
  /** Rotation of the brushes for the renderer. */
  brushSpin: number;
}

export const createRoomba = (x: number, z: number, heading: number, battery: number): RoombaState => ({
  x,
  z,
  heading,
  speed: 0,
  angularVelocity: 0,
  externalVx: 0,
  externalVz: 0,
  externalSpin: 0,
  battery,
  brushOn: true,
  vacuumOn: true,
  lightsOn: false,
  infraredOn: false,
  charging: false,
  chargeEngage: 0,
  stunTimer: 0,
  collisionCooldown: 0,
  bumpAge: 10,
  brushSpin: 0,
});

export interface MovementResult {
  impactSpeed: number;
  contacts: Contact[];
}

const contactsScratch: Contact[] = [];

/**
 * Differential-drive style movement: throttle sets speed along the heading, turn sets
 * yaw rate. Impacts are handled as an external velocity so knockbacks feel physical.
 */
export const stepRoombaMovement = (
  r: RoombaState,
  input: ControlInput,
  dt: number,
  world: CollisionWorld,
  speedFactor: number,
  turnSensitivity: number,
): MovementResult => {
  const cfg = ROOMBA_CONFIG;
  const stunned = r.stunTimer > 0;
  const throttle = stunned ? 0 : clamp(input.throttle, -1, 1);
  const turn = stunned ? 0 : clamp(input.turn, -1, 1);

  const maxForward = cfg.maxSpeed * speedFactor;
  const target = throttle >= 0 ? throttle * maxForward : throttle * maxForward * cfg.reverseSpeedFactor;
  const accelerating = Math.abs(target) > Math.abs(r.speed) && Math.sign(target) === Math.sign(r.speed || target);
  const rate = accelerating ? cfg.acceleration : throttle === 0 ? cfg.coastDeceleration : cfg.braking;
  r.speed = approach(r.speed, target, rate * dt);

  // Turning right (positive input) rotates the heading clockwise when seen from above.
  const targetTurn = -turn * cfg.turnSpeed * turnSensitivity;
  const turnRate = Math.abs(targetTurn) > Math.abs(r.angularVelocity) ? cfg.turnAcceleration : cfg.turnDeceleration;
  r.angularVelocity = approach(r.angularVelocity, targetTurn, turnRate * dt);

  r.heading += (r.angularVelocity + r.externalSpin) * dt;

  const fx = Math.sin(r.heading);
  const fz = Math.cos(r.heading);
  let vx = fx * r.speed + r.externalVx;
  let vz = fz * r.speed + r.externalVz;
  r.x += vx * dt;
  r.z += vz * dt;

  const contacts = world.resolveCircle(r, cfg.radius, cfg.collisionIterations, contactsScratch);
  let impactSpeed = 0;
  for (const c of contacts) {
    const vn = vx * c.nx + vz * c.nz;
    if (vn >= 0) continue;
    impactSpeed = Math.max(impactSpeed, -vn);
    const e = -vn > 0.5 ? cfg.collisionRestitution : 0;
    vx -= (1 + e) * vn * c.nx;
    vz -= (1 + e) * vn * c.nz;
  }
  if (contacts.length > 0) {
    r.speed = vx * fx + vz * fz;
    r.externalVx = vx - fx * r.speed;
    r.externalVz = vz - fz * r.speed;
  }

  const friction = Math.exp(-cfg.externalFriction * dt);
  r.externalVx *= friction;
  r.externalVz *= friction;
  r.externalSpin *= Math.exp(-cfg.externalSpinFriction * dt);
  r.stunTimer = Math.max(0, r.stunTimer - dt);
  r.collisionCooldown = Math.max(0, r.collisionCooldown - dt);
  r.bumpAge += dt;
  if (r.brushOn) r.brushSpin += dt * 22;
  return { impactSpeed, contacts };
};

export const applyImpulse = (r: RoombaState, vx: number, vz: number, spin: number, stun: number): void => {
  const max = ROOMBA_CONFIG.maxExternalSpeed;
  r.externalVx = clamp(r.externalVx + vx, -max, max);
  r.externalVz = clamp(r.externalVz + vz, -max, max);
  r.externalSpin += spin;
  r.speed *= 0.3;
  r.stunTimer = Math.max(r.stunTimer, stun);
  r.bumpAge = 0;
};
