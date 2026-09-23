import { describe, expect, it } from 'vitest';
import {
  completeStage,
  createNewProgress,
  createRng,
  deriveStats,
  generateOffers,
  LocalStorageSaveRepository,
  migrateSave,
  openShop,
  purchaseUpgrade,
  refreshOffers,
  SHOP_CONFIG,
  shopBuy,
  shopRefresh,
  stageReward,
  UPGRADE_DEFINITIONS,
  UPGRADE_IDS,
  type StorageLike,
  type UpgradeId,
} from '../src';

describe('economy', () => {
  it('rewards ₪200 base and +₪100 per house level', () => {
    expect(stageReward(1, false)).toBe(200);
    expect(stageReward(2, false)).toBe(300);
    expect(stageReward(4, false)).toBe(500);
    expect(stageReward(1, true)).toBeGreaterThan(200);
  });
});

describe('upgrades', () => {
  it('every definition has a price per level step', () => {
    for (const id of UPGRADE_IDS) {
      const def = UPGRADE_DEFINITIONS[id];
      expect(def.prices.length, id).toBe(def.maxLevel - def.startLevel);
    }
  });

  it('battery upgrades follow 100 / 130 / 170 / 220', () => {
    const progress = { ...createNewProgress(), money: 10_000 };
    const capacities = [deriveStats(progress.levels).maxBattery];
    let p = progress;
    for (let i = 0; i < 3; i++) {
      const result = purchaseUpgrade(p, 'battery');
      if (!result.ok) throw new Error('purchase failed');
      p = result.progress;
      capacities.push(deriveStats(p.levels).maxBattery);
    }
    expect(capacities).toEqual([100, 130, 170, 220]);
  });

  it('refuses purchases without funds', () => {
    expect(purchaseUpgrade(createNewProgress(), 'battery')).toEqual({ ok: false, reason: 'funds' });
  });
});

describe('shop', () => {
  const rich = { ...createNewProgress(), money: 100_000, currentStage: 5 };

  it('shows exactly three distinct eligible offers', () => {
    for (let seed = 0; seed < 50; seed++) {
      const offers = generateOffers(rich.levels, 5, createRng(seed));
      expect(offers).toHaveLength(SHOP_CONFIG.offerCount);
      const ids = offers.filter((o): o is UpgradeId => o !== null);
      expect(new Set(ids).size).toBe(3);
      for (const id of ids) {
        for (const pre of UPGRADE_DEFINITIONS[id].prerequisites) expect(rich.levels[pre.id]).toBeGreaterThanOrEqual(pre.minLevel);
      }
    }
  });

  it('never offers prerequisites-locked upgrades', () => {
    for (let seed = 0; seed < 100; seed++) {
      const offers = generateOffers(rich.levels, 5, createRng(seed));
      expect(offers).not.toContain('advancedRadar');
      expect(offers).not.toContain('wallRadar');
    }
  });

  it('refresh replaces all three with different offers and costs ₪100', () => {
    const shop = openShop(rich, 5, createRng(1));
    const result = shopRefresh(rich, shop, createRng(2));
    if (!result.ok) throw new Error('refresh failed');
    expect(result.progress.money).toBe(rich.money - SHOP_CONFIG.refreshCost);
    for (const id of result.shop.offers) expect(shop.offers).not.toContain(id);
  });

  it('refresh is refused when unaffordable', () => {
    const poor = { ...rich, money: SHOP_CONFIG.refreshCost - 1 };
    expect(shopRefresh(poor, openShop(poor, 5, createRng(1)), createRng(2))).toEqual({ ok: false, reason: 'funds' });
  });

  it('buying replaces only the purchased slot', () => {
    const shop = openShop(rich, 5, createRng(3));
    const result = shopBuy(rich, shop, 1, createRng(4));
    if (!result.ok) throw new Error('buy failed');
    const bought = shop.offers[1] as UpgradeId;
    expect(result.progress.levels[bought]).toBe(rich.levels[bought] + 1);
    expect(result.shop.offers[0]).toBe(shop.offers[0]);
    expect(result.shop.offers[2]).toBe(shop.offers[2]);
    expect(result.shop.offers[1]).not.toBe(bought);
    expect(new Set(result.shop.offers).size).toBe(3);
  });

  it('never offers maxed upgrades', () => {
    const levels = { ...rich.levels, battery: UPGRADE_DEFINITIONS.battery.maxLevel };
    for (let seed = 0; seed < 50; seed++) expect(refreshOffers([null, null, null], levels, 5, createRng(seed))).not.toContain('battery');
  });
});

describe('save system', () => {
  const memoryStorage = (): StorageLike => {
    const data = new Map<string, string>();
    return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v), removeItem: (k) => void data.delete(k) };
  };

  it('round-trips progress', async () => {
    const repo = new LocalStorageSaveRepository(memoryStorage());
    const progress = completeStage(createNewProgress(), { stage: 1, reward: 200, dirtCleaned: 300, playTime: 60 });
    await repo.save(progress);
    const loaded = await repo.load();
    expect(loaded?.progress.money).toBe(200);
    expect(loaded?.progress.currentStage).toBe(2);
    expect(loaded?.progress.completedStages).toEqual([1]);
  });

  it('repairs partial or corrupt data', () => {
    expect(migrateSave('nope')).toBeNull();
    const migrated = migrateSave({ progress: { money: 50, levels: { battery: 3 } } });
    expect(migrated?.progress.levels.battery).toBe(3);
    expect(migrated?.progress.levels.vacuum).toBe(1);
    expect(migrated?.progress.currentStage).toBe(1);
  });
});
