export type LoopId = 'motor' | 'brush' | 'vacuum' | 'charging' | 'music';

export type SoundId =
  | 'pickup'
  | 'pickupHeavy'
  | 'uiClick'
  | 'uiBuy'
  | 'uiError'
  | 'uiRefresh'
  | 'toggleOn'
  | 'toggleOff'
  | 'stageComplete'
  | 'gameOver'
  | 'bossIntro'
  | 'bossAttack'
  | 'bossHit'
  | 'bossNeutralized'
  | 'bark'
  | 'meow'
  | 'collision'
  | 'knockback'
  | 'radarPing'
  | 'warning'
  | 'chargeStart'
  | 'chargeFull'
  | 'cameraSwitch'
  | 'objective';

export interface PlayOptions {
  volume?: number;
  pitch?: number;
}

export interface LoopParams {
  volume?: number;
  /** Loop-specific intensity, e.g. motor speed 0..1. */
  intensity?: number;
}

export interface VolumeSettings {
  master: number;
  sfx: number;
  music: number;
}

/**
 * Game-facing audio API. The default implementation synthesises everything; real assets
 * can be registered per id and take precedence.
 */
export interface AudioManager {
  /** Must be called from a user gesture on mobile browsers. */
  unlock(): void;
  play(id: SoundId, options?: PlayOptions): void;
  setLoop(id: LoopId, active: boolean, params?: LoopParams): void;
  setVolumes(volumes: VolumeSettings): void;
  stopAllLoops(): void;
  registerSample(id: SoundId, url: string): Promise<void>;
}
