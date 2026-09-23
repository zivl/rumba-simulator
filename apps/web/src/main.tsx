import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { useProgressStore } from './game/stores/progressStore';
import './styles/global.css';

/**
 * Dev/testing shortcuts: ?stage=10 jumps to a stage (boss every 10th), ?money=5000 sets
 * money. They apply to the loaded save so CONTINUE starts there.
 */
const readDevOverrides = (): { stage?: number; money?: number } => {
  const params = new URLSearchParams(window.location.search);
  const stage = Number(params.get('stage'));
  const money = Number(params.get('money'));
  return {
    ...(Number.isFinite(stage) && stage > 0 ? { stage: Math.floor(stage) } : {}),
    ...(Number.isFinite(money) && money > 0 ? { money: Math.floor(money) } : {}),
  };
};

const exposeDebugHandle = async () => {
  const [{ getSimulation }, { useGameStore }, { updateFrame }, { input }] = await Promise.all([
    import('./game/session'),
    import('./game/stores/gameStore'),
    import('./game/controller'),
    import('./game/input/InputManager'),
  ]);
  /** Advances the game loop without rendering (useful when the tab is in the background). */
  const pump = (seconds: number, throttle = 0, turn = 0) => {
    input.setTouchAxes(throttle, turn);
    for (let t = 0; t < seconds; t += 1 / 60) updateFrame(1 / 60);
    input.setTouchAxes(0, 0);
  };
  Object.assign(window, { __roomba: { getSimulation, game: useGameStore, progress: useProgressStore, pump, input } });
};

const boot = async () => {
  if (import.meta.env.DEV) await exposeDebugHandle();
  const progress = useProgressStore.getState();
  await progress.load();
  const overrides = readDevOverrides();
  if (overrides.stage !== undefined || overrides.money !== undefined) {
    progress.applyDevOverrides(overrides);
    await useProgressStore.getState().persist();
  }
  const root = document.getElementById('root');
  if (!root) throw new Error('Missing #root');
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
};

void boot();
