import { buildStage, deriveStats, Simulation } from '@roomba/core';
import { audio, getSimulation, setSimulation } from './session';
import { useGameStore } from './stores/gameStore';
import { useProgressStore } from './stores/progressStore';
import { useSettingsStore } from './stores/settingsStore';

/** Stage lifecycle: every state transition of a run goes through these functions. */
export const startStage = (): void => {
  const { progress } = useProgressStore.getState();
  const stage = buildStage(progress.currentStage, progress.levels.house);
  const sim = new Simulation({
    stage,
    stats: deriveStats(progress.levels),
    turnSensitivity: useSettingsStore.getState().turnSensitivity,
  });
  setSimulation(sim);
  const game = useGameStore.getState();
  game.beginSession({ stageTitle: stage.title, stageNumber: stage.number, isBoss: stage.isBoss });
  game.transition(stage.isBoss ? 'BOSS_INTRO' : 'PLAYING');
  if (stage.isBoss) audio.play('bossIntro');
};

export const beginBossFight = (): void => {
  useGameStore.getState().transition('BOSS_FIGHT');
};

export const completeCurrentStage = (): void => {
  const sim = getSimulation();
  if (!sim) return;
  const game = useGameStore.getState();
  if (!game.transition('STAGE_COMPLETE')) return;
  const stage = sim.stage;
  game.setResult({
    stage: stage.number,
    title: stage.title,
    clean: sim.cleanFraction,
    reward: stage.reward,
    time: sim.time,
    batteryLeft: sim.batteryFraction,
    dirtCleaned: sim.dirt.cleanedCount,
    bossName: stage.boss?.name ?? null,
  });
  void useProgressStore.getState().finishStage({
    stage: stage.number,
    reward: stage.reward,
    dirtCleaned: sim.dirt.cleanedCount,
    playTime: sim.time,
    ...(stage.boss ? { bossId: stage.boss.id } : {}),
  });
  audio.stopAllLoops();
  audio.play('stageComplete');
};

export const failCurrentStage = (): void => {
  const sim = getSimulation();
  if (!useGameStore.getState().transition('GAME_OVER')) return;
  void useProgressStore.getState().gameOver(sim?.time ?? 0);
  audio.stopAllLoops();
  audio.play('gameOver');
};

export const openShop = (): void => {
  const progress = useProgressStore.getState().progress;
  useProgressStore.getState().openShop(progress.currentStage);
  useGameStore.getState().transition('SHOP');
};

export const continueFromShop = async (): Promise<void> => {
  await useProgressStore.getState().persist();
  startStage();
};

export const quitToMenu = (): void => {
  audio.stopAllLoops();
  const game = useGameStore.getState();
  game.transition('MAIN_MENU');
  game.setMenuView('main');
  game.setSettingsOpen(false);
  setSimulation(null);
};
