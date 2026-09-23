import { createBoss, stepBoss, type BossInfluence, type BossRuntime } from '../bosses/bossController';
import { BATTERY_CONFIG } from '../config/battery';
import { ROOMBA_CONFIG } from '../config/roomba';
import { generateDirt, type DirtPlacementContext } from '../dirt/dirtGenerator';
import type { DirtField } from '../dirt/dirtField';
import { evaluateMission, type MissionState } from '../missions/missions';
import { createRng, type Rng } from '../math/rng';
import { damp } from '../math/vec';
import { CollisionWorld } from '../physics/collision';
import type { StageDefinition } from '../stages/stages';
import type { RoombaStats } from '../stats/deriveStats';
import { generateHouse } from '../world/houseGenerator';
import { NavGrid } from '../world/navGrid';
import { ReachabilityMap } from '../world/reachability';
import type { HouseLayout } from '../world/types';
import { computeDrain, warningLevel, type DrainBreakdown } from './battery';
import { stepCleaning } from './cleaning';
import type { ControlInput, SimEvent } from './events';
import { createRoomba, stepRoombaMovement, type RoombaState } from './roomba';

export type SimulationStatus = 'running' | 'complete' | 'failed';

export type Equipment = 'brush' | 'vacuum' | 'lights' | 'infrared';

export interface SimulationOptions {
  stage: StageDefinition;
  stats: RoombaStats;
  turnSensitivity?: number;
}

const REACH_RESOLUTION = 0.1;
const NAV_RESOLUTION = 0.4;

/**
 * Framework-free simulation of one stage. Rendering layers read its public state every
 * frame; UI reads a throttled snapshot.
 */
export class Simulation {
  readonly stage: StageDefinition;
  readonly stats: RoombaStats;
  readonly house: HouseLayout;
  readonly world: CollisionWorld;
  readonly reach: ReachabilityMap;
  readonly dirt: DirtField;
  readonly roomba: RoombaState;
  readonly boss: BossRuntime | null;
  readonly initialDirtCount: number;
  status: SimulationStatus = 'running';
  time = 0;
  mission: MissionState;
  drain: DrainBreakdown;
  /** 0..1 visibility obstruction (boss dust). */
  fog = 0;
  turnSensitivity: number;
  private readonly rng: Rng;
  private readonly nav: NavGrid | null;
  private readonly dirtContext: DirtPlacementContext;
  private events: SimEvent[] = [];
  private influence: BossInfluence = { slowFactor: 1, fog: 0, vacuumPenalty: 1 };
  private lastWarning = -1;
  private chargeFullNotified = false;
  private completedObjectives = new Set<string>();

  constructor(options: SimulationOptions) {
    const { stage, stats } = options;
    this.stage = stage;
    this.stats = stats;
    this.turnSensitivity = options.turnSensitivity ?? 1;
    this.rng = createRng(stage.dirtSeed ^ 0x5bd1e995);
    this.house = generateHouse(stage.blueprint, stage.houseSeed, stage.dirtSeed);
    this.world = new CollisionWorld(this.house.bounds, this.house.colliders);
    const { station } = this.house;
    this.reach = new ReachabilityMap(this.world, this.house.bounds, REACH_RESOLUTION, ROOMBA_CONFIG.radius + 0.005, station.dockX, station.dockZ);
    this.dirtContext = { world: this.world, reach: this.reach, rng: this.rng };
    this.dirt = generateDirt(this.house, stage, this.dirtContext);
    this.initialDirtCount = this.dirt.particles.length;
    this.roomba = createRoomba(station.dockX, station.dockZ, station.rotation, stats.maxBattery);

    if (stage.boss) {
      this.nav = new NavGrid(this.world, this.house.bounds, NAV_RESOLUTION, stage.boss.radius * 0.9);
      let spawn = { x: station.dockX, z: station.dockZ };
      let best = -1;
      for (let i = 0; i < 24; i++) {
        const p = this.nav.randomPoint(this.rng);
        if (!p) break;
        const d = Math.hypot(p.x - station.dockX, p.z - station.dockZ);
        if (d > best) {
          best = d;
          spawn = p;
        }
      }
      this.boss = createBoss(stage.boss, spawn.x, spawn.z, this.rng);
    } else {
      this.nav = null;
      this.boss = null;
    }
    this.mission = evaluateMission(stage, this.dirt.cleanFraction, this.boss);
    this.drain = computeDrain(this.roomba, stats);
  }

  get batteryFraction(): number {
    return this.stats.maxBattery > 0 ? this.roomba.battery / this.stats.maxBattery : 0;
  }

  get cleanFraction(): number {
    return this.dirt.cleanFraction;
  }

  /** Returns and clears events produced since the last call. */
  drainEvents(): SimEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  toggle(equipment: Equipment): boolean {
    const r = this.roomba;
    switch (equipment) {
      case 'brush':
        r.brushOn = !r.brushOn;
        return r.brushOn;
      case 'vacuum':
        r.vacuumOn = !r.vacuumOn;
        return r.vacuumOn;
      case 'lights':
        r.lightsOn = !r.lightsOn;
        return r.lightsOn;
      case 'infrared':
        if (this.stats.infraredLevel <= 0) return false;
        r.infraredOn = !r.infraredOn;
        return r.infraredOn;
    }
  }

  private isOnCarpet(): boolean {
    const { x, z } = this.roomba;
    return this.house.rugs.some((rug) => x > rug.bounds.minX && x < rug.bounds.maxX && z > rug.bounds.minZ && z < rug.bounds.maxZ);
  }

  step(dt: number, input: ControlInput): void {
    if (this.status !== 'running') return;
    this.time += dt;
    const r = this.roomba;

    const speedFactor = (this.isOnCarpet() ? ROOMBA_CONFIG.carpetSpeedFactor : 1) * this.influence.slowFactor;
    const movement = stepRoombaMovement(r, input, dt, this.world, speedFactor, this.turnSensitivity);
    if (movement.impactSpeed > ROOMBA_CONFIG.collisionEventMinSpeed && r.collisionCooldown <= 0) {
      r.collisionCooldown = 0.22;
      r.bumpAge = 0;
      this.events.push({ type: 'collision', speed: movement.impactSpeed, x: r.x, z: r.z });
    }

    this.stepCharging(dt);
    this.drain = computeDrain(r, this.stats);
    if (!r.charging) r.battery = Math.max(0, r.battery - this.drain.total * dt);

    const level = warningLevel(this.batteryFraction);
    if (level > this.lastWarning) this.events.push({ type: 'batteryWarning', level });
    this.lastWarning = level;

    stepCleaning({
      field: this.dirt,
      roomba: r,
      stats: this.stats,
      world: this.world,
      dt,
      vacuumPenalty: this.influence.vacuumPenalty,
      events: this.events,
    });

    if (this.boss && this.nav) {
      this.influence = stepBoss(
        this.boss,
        {
          world: this.world,
          nav: this.nav,
          roomba: r,
          stats: this.stats,
          field: this.dirt,
          dirt: this.dirtContext,
          rng: this.rng,
          events: this.events,
          time: this.time,
        },
        dt,
      );
    }
    this.fog += (this.influence.fog - this.fog) * damp(3, dt);

    this.mission = evaluateMission(this.stage, this.dirt.cleanFraction, this.boss);
    for (const objective of this.mission.objectives) {
      if (objective.done && !this.completedObjectives.has(objective.id)) {
        this.completedObjectives.add(objective.id);
        this.events.push({ type: 'objectiveComplete', id: objective.id });
      }
    }
    if (this.mission.complete) {
      this.status = 'complete';
      this.events.push({ type: 'stageComplete' });
      return;
    }
    if (r.battery <= 0) {
      this.status = 'failed';
      this.events.push({ type: 'batteryEmpty' });
    }
  }

  private stepCharging(dt: number): void {
    const r = this.roomba;
    const { station } = this.house;
    const cfg = BATTERY_CONFIG.charging;
    const docked = Math.hypot(r.x - station.dockX, r.z - station.dockZ) < cfg.dockRadius && Math.abs(r.speed) < cfg.maxDockSpeed;
    if (!docked) {
      r.chargeEngage = 0;
      if (r.charging) {
        r.charging = false;
        this.events.push({ type: 'chargeStop' });
      }
      return;
    }
    if (!r.charging) {
      r.chargeEngage += dt;
      if (r.chargeEngage >= cfg.engageDelay) {
        r.charging = true;
        this.chargeFullNotified = false;
        this.events.push({ type: 'chargeStart' });
      }
      return;
    }
    r.battery = Math.min(this.stats.maxBattery, r.battery + this.stats.chargeRate * dt);
    if (r.battery >= this.stats.maxBattery && !this.chargeFullNotified) {
      this.chargeFullNotified = true;
      this.events.push({ type: 'chargeFull' });
    }
  }
}
