import { WebAudioManager, type AudioManager } from '@roomba/audio';
import type { Simulation } from '@roomba/core';
import { useGameStore } from './stores/gameStore';

/**
 * The running stage lives outside React state: it mutates every frame and renderers read
 * it directly. React only learns about a new session through gameStore.sessionId.
 */
let current: Simulation | null = null;

export const getSimulation = (): Simulation | null => current;

export const setSimulation = (sim: Simulation | null): void => {
  current = sim;
};

export const useSimulation = (): Simulation | null => {
  useGameStore((s) => s.sessionId);
  return current;
};

export const audio: AudioManager = new WebAudioManager();
