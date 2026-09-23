import { BOSS_COMBAT_CONFIG, type BossAbilityConfig } from '../config/bosses';
import { ROOMBA_CONFIG } from '../config/roomba';
import { isValidDirtSpot, scatterCluster, type DirtPlacementContext } from '../dirt/dirtGenerator';
import type { DirtField } from '../dirt/dirtField';
import type { Rng } from '../math/rng';
import { clamp, wrapAngle } from '../math/vec';
import type { CollisionWorld } from '../physics/collision';
import type { SimEvent } from '../sim/events';
import { applyImpulse, type RoombaState } from '../sim/roomba';
import type { ResolvedBoss } from '../stages/stages';
import type { RoombaStats } from '../stats/deriveStats';
import type { NavGrid, Waypoint } from '../world/navGrid';

export type BossPhase = 'active' | 'neutralized' | 'gone';

export type BossMood = 'normal' | 'angry' | 'hurt' | 'paused' | 'chasing' | 'sleeping';

export interface BossRuntime {
  def: ResolvedBoss;
  x: number;
  z: number;
  heading: number;
  vx: number;
  vz: number;
  health: number;
  phase: BossPhase;
  mood: BossMood;
  path: Waypoint[];
  retargetTimer: number;
  chaseTimer: number;
  chaseCooldown: number;
  pauseTimer: number;
  hitCooldown: number;
  fleeTimer: number;
  knockCooldown: number;
  abilityTimers: number[];
  trailDistance: number[];
  footLeft: boolean[];
  spawnedDirt: number;
  vanishProgress: number;
  /** 0..1 appear animation. */
  appear: number;
  animTime: number;
  stuckTimer: number;
  lastX: number;
  lastZ: number;
  /** Seconds since the last ram hit, for hurt flashes. */
  hurtAge: number;
  attackAge: number;
}

export interface BossContext {
  world: CollisionWorld;
  nav: NavGrid;
  roomba: RoombaState;
  stats: RoombaStats;
  field: DirtField;
  dirt: DirtPlacementContext;
  rng: Rng;
  events: SimEvent[];
  time: number;
}

export interface BossInfluence {
  slowFactor: number;
  fog: number;
  vacuumPenalty: number;
}

export const createBoss = (def: ResolvedBoss, x: number, z: number, rng: Rng): BossRuntime => ({
  def,
  x,
  z,
  heading: rng.range(-Math.PI, Math.PI),
  vx: 0,
  vz: 0,
  health: def.maxHealth,
  phase: 'active',
  mood: 'normal',
  path: [],
  retargetTimer: 0,
  chaseTimer: 0,
  chaseCooldown: 2,
  pauseTimer: 0,
  hitCooldown: 0,
  fleeTimer: 0,
  knockCooldown: 2,
  abilityTimers: def.abilities.map((a) => (a.type === 'burst' ? rng.range(a.interval[0], a.interval[1]) : 0)),
  trailDistance: def.abilities.map(() => 0),
  footLeft: def.abilities.map(() => false),
  spawnedDirt: 0,
  vanishProgress: 0,
  appear: 0,
  animTime: 0,
  stuckTimer: 0,
  lastX: x,
  lastZ: z,
  hurtAge: 10,
  attackAge: 10,
});

const moveSpeed = (boss: BossRuntime): number => {
  const m = boss.def.movement;
  const base = m.type === 'chase' ? (boss.chaseTimer > 0 ? m.speed : m.wanderSpeed) : m.speed;
  return base * boss.def.speedMultiplier * (boss.fleeTimer > 0 ? BOSS_COMBAT_CONFIG.fleeSpeedFactor : 1);
};

const pickDestination = (boss: BossRuntime, ctx: BossContext): void => {
  const m = boss.def.movement;
  let target: Waypoint | null;
  if (boss.fleeTimer > 0) {
    const away = Math.atan2(boss.x - ctx.roomba.x, boss.z - ctx.roomba.z);
    target = { x: boss.x + Math.sin(away) * 4, z: boss.z + Math.cos(away) * 4 };
  } else if (m.type === 'chase' && boss.chaseTimer > 0) {
    target = { x: ctx.roomba.x, z: ctx.roomba.z };
  } else if (m.type === 'erratic') {
    // Short hops in random directions with the occasional long dash.
    const angle = ctx.rng.range(-Math.PI, Math.PI);
    const dist = ctx.rng.chance(0.3) ? ctx.rng.range(3, 7) : ctx.rng.range(0.8, 2.5);
    target = { x: boss.x + Math.sin(angle) * dist, z: boss.z + Math.cos(angle) * dist };
    if (!ctx.nav.isWalkable(target.x, target.z)) target = ctx.nav.randomPoint(ctx.rng);
  } else {
    target = ctx.nav.randomPoint(ctx.rng);
  }
  boss.path = target ? ctx.nav.findPath(boss.x, boss.z, target.x, target.z) : [];
  const interval = m.retargetInterval;
  boss.retargetTimer = m.type === 'chase' && boss.chaseTimer > 0 ? 0.5 : ctx.rng.range(interval[0], interval[1]);
};

const spawnDirt = (boss: BossRuntime, ctx: BossContext, type: Parameters<DirtField['add']>[0], x: number, z: number, options = {}): boolean => {
  if (boss.spawnedDirt >= boss.def.maxSpawnedDirt) return false;
  if (!isValidDirtSpot(ctx.dirt, x, z)) return false;
  ctx.field.add(type, x, z, ctx.rng.next, { time: ctx.time, ...options });
  boss.spawnedDirt++;
  return true;
};

const runAbility = (boss: BossRuntime, ability: BossAbilityConfig, index: number, ctx: BossContext, dt: number, moved: number, influence: BossInfluence): void => {
  const r = ctx.roomba;
  const rate = boss.def.spawnRateMultiplier;
  switch (ability.type) {
    case 'trail': {
      boss.trailDistance[index] = (boss.trailDistance[index] ?? 0) + moved * rate;
      if ((boss.trailDistance[index] ?? 0) < ability.spacing) return;
      boss.trailDistance[index] = 0;
      if (ability.footprints) {
        const left = !boss.footLeft[index];
        boss.footLeft[index] = left;
        const side = (left ? 1 : -1) * 0.1 * ability.size;
        const px = boss.x + Math.cos(boss.heading) * side;
        const pz = boss.z - Math.sin(boss.heading) * side;
        spawnDirt(boss, ctx, ability.dirtType, px, pz, { shape: 'footprint', size: 0.16 * ability.size, rotation: boss.heading });
      } else {
        const a = ctx.rng.range(0, Math.PI * 2);
        const d = ctx.rng.range(0, boss.def.radius * 0.8);
        spawnDirt(boss, ctx, ability.dirtType, boss.x + Math.cos(a) * d, boss.z + Math.sin(a) * d);
      }
      return;
    }
    case 'burst': {
      boss.abilityTimers[index] = (boss.abilityTimers[index] ?? 0) - dt * rate;
      if ((boss.abilityTimers[index] ?? 0) > 0) return;
      boss.abilityTimers[index] = ctx.rng.range(ability.interval[0], ability.interval[1]);
      const remaining = boss.def.maxSpawnedDirt - boss.spawnedDirt;
      const count = Math.min(remaining, Math.round(ability.count));
      if (count <= 0) return;
      const placed = scatterCluster(ctx.field, ctx.dirt, ability.dirtType, boss.x, boss.z, count, ability.radius * 0.5, ctx.time);
      boss.spawnedDirt += placed;
      boss.attackAge = 0;
      ctx.events.push({ type: 'bossAttack', kind: 'burst', x: boss.x, z: boss.z });
      ctx.events.push({ type: 'dirtSpawned', dirtType: ability.dirtType, count: placed, x: boss.x, z: boss.z });
      return;
    }
    case 'pause': {
      if (boss.pauseTimer > 0) {
        if (ability.dirtType && ability.dirtPerSecond && ctx.rng.chance(ability.dirtPerSecond * dt * rate)) {
          const a = ctx.rng.range(0, Math.PI * 2);
          spawnDirt(boss, ctx, ability.dirtType, boss.x + Math.cos(a) * boss.def.radius, boss.z + Math.sin(a) * boss.def.radius);
        }
        return;
      }
      if (boss.fleeTimer <= 0 && ctx.rng.chance(ability.chancePerSecond * dt)) {
        boss.pauseTimer = ctx.rng.range(ability.duration[0], ability.duration[1]);
        ctx.events.push({ type: 'bossAttack', kind: 'taunt', x: boss.x, z: boss.z });
      }
      return;
    }
    case 'knockback': {
      if (boss.knockCooldown > 0) return;
      const dx = r.x - boss.x;
      const dz = r.z - boss.z;
      const d = Math.hypot(dx, dz);
      if (d > boss.def.radius + ROOMBA_CONFIG.radius + 0.08 || d < 1e-4) return;
      const force = ability.force * boss.def.knockbackMultiplier;
      applyImpulse(r, (dx / d) * force, (dz / d) * force, (ctx.rng.chance(0.5) ? 1 : -1) * ability.spin, 0.45);
      r.battery = Math.max(0, r.battery - ability.batteryDrain);
      boss.knockCooldown = ability.cooldown;
      boss.attackAge = 0;
      boss.pauseTimer = 0;
      ctx.events.push({ type: 'knockback', force, x: r.x, z: r.z });
      ctx.events.push({ type: 'bossAttack', kind: 'knockback', x: boss.x, z: boss.z });
      return;
    }
    case 'aura': {
      const d = Math.hypot(r.x - boss.x, r.z - boss.z);
      if (d >= ability.radius) return;
      const strength = 1 - d / ability.radius;
      influence.slowFactor = Math.min(influence.slowFactor, 1 - (1 - ability.slowFactor) * strength);
      influence.fog = Math.max(influence.fog, ability.fog * strength);
      influence.vacuumPenalty = Math.min(influence.vacuumPenalty, 1 - (1 - ability.vacuumPenalty) * strength);
    }
  }
};

/** Roomba ramming the boss with the vacuum on deals damage. */
const resolveContact = (boss: BossRuntime, ctx: BossContext): void => {
  const r = ctx.roomba;
  const dx = r.x - boss.x;
  const dz = r.z - boss.z;
  const d = Math.hypot(dx, dz);
  const minDist = boss.def.radius + ROOMBA_CONFIG.radius;
  if (d >= minDist || d < 1e-5 || boss.phase === 'gone') return;
  const nx = dx / d;
  const nz = dz / d;
  const push = minDist - d;
  r.x += nx * push * 0.85;
  r.z += nz * push * 0.85;
  boss.x -= nx * push * 0.15;
  boss.z -= nz * push * 0.15;
  ctx.world.resolveCircle(r, ROOMBA_CONFIG.radius, 2);

  if (boss.phase !== 'active' || boss.hitCooldown > 0) return;
  const vx = Math.sin(r.heading) * r.speed + r.externalVx;
  const vz = Math.cos(r.heading) * r.speed + r.externalVz;
  const approachSpeed = -(vx * nx + vz * nz);
  if (approachSpeed < BOSS_COMBAT_CONFIG.minRamSpeed) return;
  if (BOSS_COMBAT_CONFIG.requiresVacuum && !r.vacuumOn) return;

  const damage = BOSS_COMBAT_CONFIG.baseDamage * ctx.stats.vacuumPower * (r.brushOn ? 1 + BOSS_COMBAT_CONFIG.brushDamageBonus : 1);
  boss.health = Math.max(0, boss.health - damage);
  boss.hitCooldown = BOSS_COMBAT_CONFIG.hitCooldown;
  boss.fleeTimer = BOSS_COMBAT_CONFIG.fleeDuration;
  boss.pauseTimer = 0;
  boss.chaseTimer = 0;
  boss.retargetTimer = 0;
  boss.knockCooldown = Math.max(boss.knockCooldown, 0.8);
  boss.hurtAge = 0;
  applyImpulse(r, nx * BOSS_COMBAT_CONFIG.roombaRamRecoil, nz * BOSS_COMBAT_CONFIG.roombaRamRecoil, 0, 0.15);
  ctx.events.push({ type: 'bossHit', health: boss.health, maxHealth: boss.def.maxHealth, x: boss.x, z: boss.z });

  if (boss.health <= 0) {
    boss.phase = 'neutralized';
    boss.mood = 'sleeping';
    boss.path = [];
    if (boss.def.neutralized.behavior === 'vanish') {
      const final = boss.def.abilities.find((a) => a.type === 'trail' || a.type === 'burst');
      if (final) {
        const placed = scatterCluster(ctx.field, ctx.dirt, final.dirtType, boss.x, boss.z, 24, boss.def.radius * 0.6, ctx.time);
        ctx.events.push({ type: 'dirtSpawned', dirtType: final.dirtType, count: placed, x: boss.x, z: boss.z });
      }
    }
    ctx.events.push({ type: 'bossNeutralized' });
  }
};

export const stepBoss = (boss: BossRuntime, ctx: BossContext, dt: number): BossInfluence => {
  const influence: BossInfluence = { slowFactor: 1, fog: 0, vacuumPenalty: 1 };
  boss.animTime += dt;
  boss.appear = Math.min(1, boss.appear + dt / BOSS_COMBAT_CONFIG.introFadeIn);
  boss.hitCooldown = Math.max(0, boss.hitCooldown - dt);
  boss.fleeTimer = Math.max(0, boss.fleeTimer - dt);
  boss.knockCooldown = Math.max(0, boss.knockCooldown - dt);
  boss.hurtAge += dt;
  boss.attackAge += dt;

  if (boss.phase === 'gone') return influence;
  if (boss.phase === 'neutralized') {
    if (boss.def.neutralized.behavior === 'vanish') {
      boss.vanishProgress = Math.min(1, boss.vanishProgress + dt / BOSS_COMBAT_CONFIG.neutralizeVanishTime);
      if (boss.vanishProgress >= 1) boss.phase = 'gone';
    }
    boss.vx *= 0.9;
    boss.vz *= 0.9;
    resolveContact(boss, ctx);
    return influence;
  }

  // Movement AI.
  const m = boss.def.movement;
  if (m.type === 'chase') {
    boss.chaseCooldown = Math.max(0, boss.chaseCooldown - dt);
    if (boss.chaseTimer > 0) {
      boss.chaseTimer = Math.max(0, boss.chaseTimer - dt);
      if (boss.chaseTimer === 0) boss.chaseCooldown = m.cooldown;
    } else if (boss.chaseCooldown === 0 && boss.fleeTimer === 0) {
      const d = Math.hypot(ctx.roomba.x - boss.x, ctx.roomba.z - boss.z);
      if (d < m.range) {
        boss.chaseTimer = m.chaseDuration;
        boss.retargetTimer = 0;
      }
    }
  }
  boss.pauseTimer = Math.max(0, boss.pauseTimer - dt);
  boss.retargetTimer -= dt;
  if (boss.retargetTimer <= 0 || boss.path.length === 0) pickDestination(boss, ctx);

  let desiredX = 0;
  let desiredZ = 0;
  const paused = boss.pauseTimer > 0;
  const next = boss.path[0];
  if (!paused && next) {
    const dx = next.x - boss.x;
    const dz = next.z - boss.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.25) boss.path.shift();
    else {
      const speed = moveSpeed(boss);
      desiredX = (dx / d) * speed;
      desiredZ = (dz / d) * speed;
    }
  }
  const accel = 1 - Math.exp(-6 * dt);
  boss.vx += (desiredX - boss.vx) * accel;
  boss.vz += (desiredZ - boss.vz) * accel;
  const prevX = boss.x;
  const prevZ = boss.z;
  boss.x += boss.vx * dt;
  boss.z += boss.vz * dt;
  ctx.world.resolveCircle(boss, boss.def.radius * 0.9, 2);
  const moved = Math.hypot(boss.x - prevX, boss.z - prevZ);
  if (moved > 0.002) {
    const targetHeading = Math.atan2(boss.vx, boss.vz);
    boss.heading += clamp(wrapAngle(targetHeading - boss.heading), -8 * dt, 8 * dt);
  }

  // Unstick: if barely moving while trying to, pick a new route.
  boss.stuckTimer += dt;
  if (boss.stuckTimer > 1.2) {
    if (!paused && Math.hypot(boss.x - boss.lastX, boss.z - boss.lastZ) < 0.15) boss.retargetTimer = 0;
    boss.stuckTimer = 0;
    boss.lastX = boss.x;
    boss.lastZ = boss.z;
  }

  boss.mood = boss.hurtAge < 0.6 ? 'hurt' : boss.fleeTimer > 0 ? 'angry' : paused ? 'paused' : boss.chaseTimer > 0 ? 'chasing' : 'normal';

  boss.def.abilities.forEach((ability, i) => runAbility(boss, ability, i, ctx, dt, moved, influence));
  resolveContact(boss, ctx);
  return influence;
};
