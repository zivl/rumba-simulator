import { createNewProgress, normalizeLevels, type Progress } from '../progression/progress';

export const SAVE_VERSION = 1;

export interface SaveData {
  version: number;
  savedAt: string;
  progress: Progress;
}

/**
 * Storage abstraction so the local implementation can later be swapped for a backend.
 * Async by design even though localStorage is synchronous.
 */
export interface SaveRepository {
  load(): Promise<SaveData | null>;
  save(progress: Progress): Promise<void>;
  clear(): Promise<void>;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const num = (value: unknown, fallback: number): number => (typeof value === 'number' && Number.isFinite(value) ? value : fallback);

/** Validates and upgrades raw saved JSON. Returns null for unusable data. */
export const migrateSave = (raw: unknown): SaveData | null => {
  if (!isRecord(raw) || !isRecord(raw.progress)) return null;
  const base = createNewProgress();
  const p = raw.progress;
  const stats = isRecord(p.stats) ? p.stats : {};
  const progress: Progress = {
    money: Math.max(0, num(p.money, base.money)),
    levels: normalizeLevels(isRecord(p.levels) ? (p.levels as Partial<Progress['levels']>) : {}),
    currentStage: Math.max(1, Math.floor(num(p.currentStage, 1))),
    highestStageReached: Math.max(1, Math.floor(num(p.highestStageReached, 1))),
    completedStages: Array.isArray(p.completedStages) ? p.completedStages.filter((s): s is number => typeof s === 'number') : [],
    defeatedBosses: Array.isArray(p.defeatedBosses) ? p.defeatedBosses.filter((s): s is string => typeof s === 'string') : [],
    stats: {
      stagesCompleted: num(stats.stagesCompleted, 0),
      bossesDefeated: num(stats.bossesDefeated, 0),
      gameOvers: num(stats.gameOvers, 0),
      dirtCleaned: num(stats.dirtCleaned, 0),
      moneyEarned: num(stats.moneyEarned, 0),
      moneySpent: num(stats.moneySpent, 0),
      upgradesPurchased: num(stats.upgradesPurchased, 0),
      refreshesUsed: num(stats.refreshesUsed, 0),
      playTimeSeconds: num(stats.playTimeSeconds, 0),
    },
  };
  return { version: SAVE_VERSION, savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : new Date(0).toISOString(), progress };
};

export class LocalStorageSaveRepository implements SaveRepository {
  constructor(
    private readonly storage: StorageLike,
    private readonly key = 'roomba-simulator.save',
  ) {}

  async load(): Promise<SaveData | null> {
    try {
      const text = this.storage.getItem(this.key);
      return text ? migrateSave(JSON.parse(text)) : null;
    } catch {
      return null;
    }
  }

  async save(progress: Progress): Promise<void> {
    const data: SaveData = { version: SAVE_VERSION, savedAt: new Date().toISOString(), progress };
    this.storage.setItem(this.key, JSON.stringify(data));
  }

  async clear(): Promise<void> {
    this.storage.removeItem(this.key);
  }
}

export class MemorySaveRepository implements SaveRepository {
  private data: SaveData | null = null;
  async load(): Promise<SaveData | null> {
    return this.data;
  }
  async save(progress: Progress): Promise<void> {
    this.data = { version: SAVE_VERSION, savedAt: new Date().toISOString(), progress: structuredClone(progress) };
  }
  async clear(): Promise<void> {
    this.data = null;
  }
}
