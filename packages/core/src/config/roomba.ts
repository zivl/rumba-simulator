export const ROOMBA_CONFIG = {
  radius: 0.18,
  height: 0.09,
  maxSpeed: 1.7,
  reverseSpeedFactor: 0.55,
  acceleration: 4.5,
  braking: 7,
  coastDeceleration: 3.2,
  turnSpeed: 2.9,
  turnAcceleration: 16,
  turnDeceleration: 20,
  collisionRestitution: 0.28,
  collisionEventMinSpeed: 0.35,
  externalFriction: 3.2,
  externalSpinFriction: 4,
  maxExternalSpeed: 6,
  carpetSpeedFactor: 0.85,
  /** Solver iterations per step when resolving overlaps. */
  collisionIterations: 3,
} as const;

export const SIMULATION_CONFIG = {
  fixedStep: 1 / 60,
  maxStepsPerFrame: 5,
  hudUpdateInterval: 0.1,
} as const;

export const CAMERA_CONFIG = {
  firstPerson: { height: 0.11, forwardOffset: 0.13, pitch: 0.06, fov: 78 },
  thirdPerson: { distance: 1.05, height: 0.62, lookAhead: 0.35, lookHeight: 0.05, fov: 62, minDistance: 0.3 },
  followSharpness: 9,
  transitionDuration: 0.55,
  collisionShake: 0.02,
  knockbackShake: 0.06,
} as const;
