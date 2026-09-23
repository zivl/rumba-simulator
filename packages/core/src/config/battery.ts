/** Energy drained per second (at 100% usage) by each consumer, before upgrade multipliers. */
export const BATTERY_CONFIG = {
  drainPerSecond: {
    idle: 0.12,
    movingAtMaxSpeed: 0.34,
    turning: 0.05,
    brush: 0.22,
    vacuum: 0.36,
    lights: 0.12,
    radarPerSystem: 0.035,
    infrared: 0.14,
  },
  /** Warning levels as battery fractions, from mild to critical. */
  warningThresholds: [0.3, 0.15, 0.06] as readonly number[],
  charging: {
    dockRadius: 0.32,
    maxDockSpeed: 0.45,
    /** Seconds before charging starts after docking (handshake). */
    engageDelay: 0.35,
  },
} as const;
