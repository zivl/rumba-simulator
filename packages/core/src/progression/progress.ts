import { ECONOMY_CONFIG, SHOP_CONFIG } from '../config/economy';
import { createStartingLevels, UPGRADE_IDS, type UpgradeId, type UpgradeLevels } from '../config/upgrades';
import type { Rng } from '../math/rng';
import { generateOffers, refreshOffers, replaceOffer, type ShopOffers } from '../shop/offerGenerator';
import { applyUpgrade, nextPrice } from '../upgrades/upgrades';

export interface ProgressStats {
  stagesCompleted: number;
  bossesDefeated: number;
  gameOvers: number;
  dirtCleaned: number;
  moneyEarned: number;
  moneySpent: number;
  upgradesPurchased: number;
  refreshesUsed: number;
  playTimeSeconds: number;
}

export interface Progress {
  money: number;
  levels: UpgradeLevels;
  currentStage: number;
  highestStageReached: number;
  completedStages: number[];
  defeatedBosses: string[];
  stats: ProgressStats;
}

export const createNewProgress = (): Progress => ({
  money: ECONOMY_CONFIG.startingMoney,
  levels: createStartingLevels(),
  currentStage: 1,
  highestStageReached: 1,
  completedStages: [],
  defeatedBosses: [],
  stats: {
    stagesCompleted: 0,
    bossesDefeated: 0,
    gameOvers: 0,
    dirtCleaned: 0,
    moneyEarned: 0,
    moneySpent: 0,
    upgradesPurchased: 0,
    refreshesUsed: 0,
    playTimeSeconds: 0,
  },
});

/** Fills missing levels (e.g. an upgrade added in a later version) with starting values. */
export const normalizeLevels = (levels: Partial<UpgradeLevels>): UpgradeLevels => {
  const start = createStartingLevels();
  for (const id of UPGRADE_IDS) {
    const value = levels[id];
    if (typeof value === 'number' && Number.isFinite(value)) start[id] = Math.max(start[id], Math.floor(value));
  }
  return start;
};

export type PurchaseResult = { ok: true; progress: Progress; price: number } | { ok: false; reason: 'maxed' | 'funds' };

export const purchaseUpgrade = (progress: Progress, id: UpgradeId): PurchaseResult => {
  const price = nextPrice(id, progress.levels);
  if (price === null) return { ok: false, reason: 'maxed' };
  if (progress.money < price) return { ok: false, reason: 'funds' };
  return {
    ok: true,
    price,
    progress: {
      ...progress,
      money: progress.money - price,
      levels: applyUpgrade(progress.levels, id),
      stats: { ...progress.stats, moneySpent: progress.stats.moneySpent + price, upgradesPurchased: progress.stats.upgradesPurchased + 1 },
    },
  };
};

export interface StageResult {
  stage: number;
  reward: number;
  dirtCleaned: number;
  bossId?: string;
  playTime: number;
}

export const completeStage = (progress: Progress, result: StageResult): Progress => {
  const nextStage = result.stage + 1;
  return {
    ...progress,
    money: progress.money + result.reward,
    currentStage: nextStage,
    highestStageReached: Math.max(progress.highestStageReached, nextStage),
    completedStages: progress.completedStages.includes(result.stage) ? progress.completedStages : [...progress.completedStages, result.stage],
    defeatedBosses:
      result.bossId && !progress.defeatedBosses.includes(result.bossId) ? [...progress.defeatedBosses, result.bossId] : progress.defeatedBosses,
    stats: {
      ...progress.stats,
      stagesCompleted: progress.stats.stagesCompleted + 1,
      bossesDefeated: progress.stats.bossesDefeated + (result.bossId ? 1 : 0),
      dirtCleaned: progress.stats.dirtCleaned + result.dirtCleaned,
      moneyEarned: progress.stats.moneyEarned + result.reward,
      playTimeSeconds: progress.stats.playTimeSeconds + result.playTime,
    },
  };
};

export const recordGameOver = (progress: Progress, playTime: number): Progress => ({
  ...progress,
  stats: { ...progress.stats, gameOvers: progress.stats.gameOvers + 1, playTimeSeconds: progress.stats.playTimeSeconds + playTime },
});

/** Pure shop session. The three offers only change on refresh or purchase. */
export interface ShopState {
  stage: number;
  offers: ShopOffers;
}

export const openShop = (progress: Progress, stage: number, rng: Rng): ShopState => ({
  stage,
  offers: generateOffers(progress.levels, stage, rng),
});

export type ShopActionResult =
  | { ok: true; progress: Progress; shop: ShopState }
  | { ok: false; reason: 'funds' | 'maxed' | 'empty' };

export const shopRefresh = (progress: Progress, shop: ShopState, rng: Rng, cost: number = SHOP_CONFIG.refreshCost): ShopActionResult => {
  if (progress.money < cost) return { ok: false, reason: 'funds' };
  return {
    ok: true,
    progress: {
      ...progress,
      money: progress.money - cost,
      stats: { ...progress.stats, moneySpent: progress.stats.moneySpent + cost, refreshesUsed: progress.stats.refreshesUsed + 1 },
    },
    shop: { ...shop, offers: refreshOffers(shop.offers, progress.levels, shop.stage, rng) },
  };
};

export const shopBuy = (progress: Progress, shop: ShopState, slot: number, rng: Rng): ShopActionResult => {
  const id = shop.offers[slot];
  if (!id) return { ok: false, reason: 'empty' };
  const purchase = purchaseUpgrade(progress, id);
  if (!purchase.ok) return purchase;
  return {
    ok: true,
    progress: purchase.progress,
    shop: { ...shop, offers: replaceOffer(shop.offers, slot, purchase.progress.levels, shop.stage, rng) },
  };
};
