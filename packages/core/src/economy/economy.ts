import { ECONOMY_CONFIG } from '../config/economy';

export const stageReward = (houseLevel: number, isBoss: boolean): number => {
  const base = ECONOMY_CONFIG.baseStageReward + Math.max(0, houseLevel - 1) * ECONOMY_CONFIG.rewardPerHouseLevel;
  return isBoss ? Math.round(base * ECONOMY_CONFIG.bossRewardMultiplier) : base;
};

export const formatMoney = (amount: number): string =>
  `${ECONOMY_CONFIG.currencySymbol}${Math.round(amount).toLocaleString('en-US')}`;
