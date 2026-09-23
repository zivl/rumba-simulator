import { UPGRADE_DEFINITIONS, type UpgradeDefinition, type UpgradeId, type UpgradeLevels } from '../config/upgrades';

export const isMaxed = (def: UpgradeDefinition, levels: UpgradeLevels): boolean => levels[def.id] >= def.maxLevel;

export const prerequisitesMet = (def: UpgradeDefinition, levels: UpgradeLevels): boolean =>
  def.prerequisites.every((p) => levels[p.id] >= p.minLevel);

/** Price of the next level, or null when maxed. */
export const nextPrice = (id: UpgradeId, levels: UpgradeLevels): number | null => {
  const def = UPGRADE_DEFINITIONS[id];
  if (isMaxed(def, levels)) return null;
  return def.prices[levels[id] - def.startLevel] ?? null;
};

export const isEligibleForShop = (def: UpgradeDefinition, levels: UpgradeLevels, stage: number): boolean =>
  !isMaxed(def, levels) && prerequisitesMet(def, levels) && stage >= def.minStage && nextPrice(def.id, levels) !== null;

export const applyUpgrade = (levels: UpgradeLevels, id: UpgradeId): UpgradeLevels => {
  const def = UPGRADE_DEFINITIONS[id];
  return { ...levels, [id]: Math.min(def.maxLevel, levels[id] + 1) };
};

export interface UpgradePreview {
  id: UpgradeId;
  name: string;
  icon: string;
  description: string;
  rarity: UpgradeDefinition['rarity'];
  currentLevel: number;
  nextLevel: number;
  maxLevel: number;
  currentEffect: string;
  nextEffect: string;
  price: number;
}

export const previewUpgrade = (id: UpgradeId, levels: UpgradeLevels): UpgradePreview | null => {
  const def = UPGRADE_DEFINITIONS[id];
  const price = nextPrice(id, levels);
  if (price === null) return null;
  const current = levels[id];
  return {
    id,
    name: def.name,
    icon: def.icon,
    description: def.description,
    rarity: def.rarity,
    currentLevel: current,
    nextLevel: current + 1,
    maxLevel: def.maxLevel,
    currentEffect: def.effectAt(current),
    nextEffect: def.effectAt(current + 1),
    price,
  };
};
