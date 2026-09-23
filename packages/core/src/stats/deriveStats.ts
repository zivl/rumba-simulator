import { UPGRADE_TABLES, upgradeTableValue as v, type UpgradeLevels } from '../config/upgrades';

export interface RoombaStats {
  maxBattery: number;
  drainMultiplier: number;
  vacuumDrainMultiplier: number;
  lightDrainMultiplier: number;
  infraredDrainMultiplier: number;
  chargeRate: number;
  brushPower: number;
  brushCount: number;
  brushCoverage: number;
  brushRate: number;
  advancedBrushBonus: number;
  vacuumPower: number;
  vacuumRange: number;
  lightIntensity: number;
  lightRange: number;
  dirtRadarRange: number;
  proximityRadarRange: number;
  directionalTargets: number;
  wallRadarRange: number;
  advancedRadar: boolean;
  infraredLevel: number;
  activeRadarSystems: number;
  houseLevel: number;
}

/** The single place where upgrade levels become gameplay numbers. */
export const deriveStats = (levels: UpgradeLevels): RoombaStats => {
  const radarSystems = [levels.dirtRadar, levels.proximityRadar, levels.directionalRadar, levels.wallRadar, levels.advancedRadar].filter(
    (level) => level > 0,
  ).length;
  return {
    maxBattery: v(UPGRADE_TABLES.batteryCapacity, levels.battery),
    drainMultiplier: v(UPGRADE_TABLES.batteryDrainMultiplier, levels.batteryEfficiency),
    vacuumDrainMultiplier: v(UPGRADE_TABLES.vacuumDrainMultiplier, levels.vacuumEfficiency),
    lightDrainMultiplier: v(UPGRADE_TABLES.lightDrainMultiplier, levels.lights),
    infraredDrainMultiplier: v(UPGRADE_TABLES.infraredDrainMultiplier, levels.infrared),
    chargeRate: v(UPGRADE_TABLES.chargeRate, levels.chargingStation),
    brushPower: v(UPGRADE_TABLES.brushPower, levels.brush),
    brushCount: v(UPGRADE_TABLES.brushCount, levels.extraBrush),
    brushCoverage: v(UPGRADE_TABLES.brushCoverage, levels.extraBrush),
    brushRate: v(UPGRADE_TABLES.brushRate, levels.extraBrush),
    advancedBrushBonus: v(UPGRADE_TABLES.advancedBrushBonus, levels.advancedBrush),
    vacuumPower: v(UPGRADE_TABLES.vacuumPower, levels.vacuum),
    vacuumRange: v(UPGRADE_TABLES.vacuumRange, levels.vacuum),
    lightIntensity: v(UPGRADE_TABLES.lightIntensity, levels.lights),
    lightRange: v(UPGRADE_TABLES.lightRange, levels.lights),
    dirtRadarRange: v(UPGRADE_TABLES.dirtRadarRange, levels.dirtRadar),
    proximityRadarRange: v(UPGRADE_TABLES.proximityRadarRange, levels.proximityRadar),
    directionalTargets: v(UPGRADE_TABLES.directionalRadarTargets, levels.directionalRadar),
    wallRadarRange: v(UPGRADE_TABLES.wallRadarRange, levels.wallRadar),
    advancedRadar: levels.advancedRadar > 0,
    infraredLevel: levels.infrared,
    activeRadarSystems: radarSystems,
    houseLevel: levels.house,
  };
};
