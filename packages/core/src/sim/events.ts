import type { DirtTypeId } from '../config/dirt';

export type SimEvent =
  | { type: 'pickup'; dirtType: DirtTypeId; x: number; z: number }
  | { type: 'collision'; speed: number; x: number; z: number }
  | { type: 'chargeStart' }
  | { type: 'chargeStop' }
  | { type: 'chargeFull' }
  | { type: 'batteryWarning'; level: number }
  | { type: 'batteryEmpty' }
  | { type: 'objectiveComplete'; id: string }
  | { type: 'stageComplete' }
  | { type: 'bossHit'; health: number; maxHealth: number; x: number; z: number }
  | { type: 'bossAttack'; kind: 'knockback' | 'burst' | 'taunt'; x: number; z: number }
  | { type: 'knockback'; force: number; x: number; z: number }
  | { type: 'bossNeutralized' }
  | { type: 'dirtSpawned'; dirtType: DirtTypeId; count: number; x: number; z: number };

export interface ControlInput {
  /** -1 (reverse) .. 1 (forward). */
  throttle: number;
  /** -1 (left) .. 1 (right). */
  turn: number;
}
