export const ECONOMY_CONFIG = {
  baseStageReward: 200,
  rewardPerHouseLevel: 100,
  bossRewardMultiplier: 2,
  startingMoney: 0,
  currencySymbol: '₪',
} as const;

export const SHOP_CONFIG = {
  offerCount: 3,
  refreshCost: 100,
  /** Weight multiplier applied to an upgrade whose category was already picked in this roll. */
  sameCategoryPenalty: 0.3,
} as const;
