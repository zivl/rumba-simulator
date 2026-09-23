import { SHOP_CONFIG } from '../config/economy';
import { RARITY_CONFIG, UPGRADE_DEFINITIONS, UPGRADE_IDS, type UpgradeId, type UpgradeLevels } from '../config/upgrades';
import type { Rng } from '../math/rng';
import { isEligibleForShop } from '../upgrades/upgrades';

/** A shop slot holds an upgrade id, or null when the pool is exhausted ("sold out"). */
export type ShopOffers = (UpgradeId | null)[];

export const eligibleUpgrades = (levels: UpgradeLevels, stage: number): UpgradeId[] =>
  UPGRADE_IDS.filter((id) => isEligibleForShop(UPGRADE_DEFINITIONS[id], levels, stage));

/**
 * Weighted pick without duplicates. Rarity drives the base weight and categories
 * already on display are penalised so the three cards feel different.
 */
export const rollOffers = (
  levels: UpgradeLevels,
  stage: number,
  rng: Rng,
  count: number,
  exclude: readonly UpgradeId[] = [],
  displayed: readonly UpgradeId[] = [],
): UpgradeId[] => {
  const pool = eligibleUpgrades(levels, stage).filter((id) => !exclude.includes(id));
  const picked: UpgradeId[] = [];
  const categories = displayed.map((id) => UPGRADE_DEFINITIONS[id].category);
  while (picked.length < count) {
    const candidates = pool.filter((id) => !picked.includes(id));
    const choice = rng.weighted(candidates, (id) => {
      const def = UPGRADE_DEFINITIONS[id];
      const sameCategory = categories.filter((c) => c === def.category).length;
      return RARITY_CONFIG[def.rarity].weight * SHOP_CONFIG.sameCategoryPenalty ** sameCategory;
    });
    if (!choice) break;
    picked.push(choice);
    categories.push(UPGRADE_DEFINITIONS[choice].category);
  }
  return picked;
};

const padOffers = (ids: UpgradeId[]): ShopOffers => {
  const offers: ShopOffers = [...ids];
  while (offers.length < SHOP_CONFIG.offerCount) offers.push(null);
  return offers;
};

export const generateOffers = (levels: UpgradeLevels, stage: number, rng: Rng): ShopOffers =>
  padOffers(rollOffers(levels, stage, rng, SHOP_CONFIG.offerCount));

/** Refresh never repeats any of the currently displayed offers. */
export const refreshOffers = (current: ShopOffers, levels: UpgradeLevels, stage: number, rng: Rng): ShopOffers => {
  const shown = current.filter((id): id is UpgradeId => id !== null);
  return padOffers(rollOffers(levels, stage, rng, SHOP_CONFIG.offerCount, shown));
};

/** Replace one slot (after a purchase) with an upgrade that is not on display. */
export const replaceOffer = (
  current: ShopOffers,
  slot: number,
  levels: UpgradeLevels,
  stage: number,
  rng: Rng,
): ShopOffers => {
  const others = current.filter((id, i): id is UpgradeId => id !== null && i !== slot);
  const bought = current[slot];
  const exclude = bought ? [...others, bought] : others;
  let [replacement] = rollOffers(levels, stage, rng, 1, exclude, others);
  if (!replacement && bought) [replacement] = rollOffers(levels, stage, rng, 1, others, others);
  const next = [...current];
  next[slot] = replacement ?? null;
  return next;
};
