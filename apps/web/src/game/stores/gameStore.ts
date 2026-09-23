import { create } from 'zustand';

export type GamePhase =
  | 'MAIN_MENU'
  | 'PLAYING'
  | 'PAUSED'
  | 'SHOP'
  | 'GAME_OVER'
  | 'STAGE_COMPLETE'
  | 'BOSS_INTRO'
  | 'BOSS_FIGHT';

export type CameraMode = 'first' | 'third';

export type MenuView = 'main' | 'settings' | 'upgrades' | 'house';

/** Allowed transitions; anything else is a bug and is ignored. */
const TRANSITIONS: Record<GamePhase, readonly GamePhase[]> = {
  MAIN_MENU: ['PLAYING', 'BOSS_INTRO'],
  PLAYING: ['PAUSED', 'STAGE_COMPLETE', 'GAME_OVER', 'MAIN_MENU'],
  BOSS_INTRO: ['BOSS_FIGHT', 'MAIN_MENU'],
  BOSS_FIGHT: ['PAUSED', 'STAGE_COMPLETE', 'GAME_OVER', 'MAIN_MENU'],
  PAUSED: ['PLAYING', 'BOSS_FIGHT', 'MAIN_MENU', 'BOSS_INTRO'],
  STAGE_COMPLETE: ['SHOP', 'MAIN_MENU'],
  SHOP: ['PLAYING', 'BOSS_INTRO', 'MAIN_MENU'],
  GAME_OVER: ['PLAYING', 'BOSS_INTRO', 'MAIN_MENU'],
};

export const isActivePhase = (phase: GamePhase): boolean => phase === 'PLAYING' || phase === 'BOSS_FIGHT';

export interface BossHud {
  name: string;
  nickname: string;
  icon: string;
  health: number;
  maxHealth: number;
  phase: 'active' | 'neutralized' | 'gone';
  mood: string;
}

export interface HudSnapshot {
  battery: number;
  maxBattery: number;
  batteryFraction: number;
  clean: number;
  required: number;
  charging: boolean;
  brush: boolean;
  vacuum: boolean;
  lights: boolean;
  infrared: boolean;
  infraredAvailable: boolean;
  warningLevel: number;
  runtimeLeft: number;
  boss: BossHud | null;
}

export interface StageResultView {
  stage: number;
  title: string;
  clean: number;
  reward: number;
  time: number;
  batteryLeft: number;
  dirtCleaned: number;
  bossName: string | null;
}

export interface Toast {
  id: number;
  text: string;
  tone: 'info' | 'good' | 'warn' | 'boss';
}

interface GameStore {
  phase: GamePhase;
  pausedFrom: GamePhase | null;
  menuView: MenuView;
  settingsOpen: boolean;
  sessionId: number;
  stageTitle: string;
  stageNumber: number;
  isBossStage: boolean;
  cameraMode: CameraMode;
  missionOpen: boolean;
  hud: HudSnapshot | null;
  result: StageResultView | null;
  toasts: Toast[];
  transition: (to: GamePhase) => boolean;
  beginSession: (info: { stageTitle: string; stageNumber: number; isBoss: boolean }) => void;
  pause: () => void;
  resume: () => void;
  setMenuView: (view: MenuView) => void;
  setSettingsOpen: (open: boolean) => void;
  toggleCamera: () => void;
  toggleMission: () => void;
  setHud: (hud: HudSnapshot) => void;
  setResult: (result: StageResultView | null) => void;
  pushToast: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useGameStore = create<GameStore>((set, get) => ({
  phase: 'MAIN_MENU',
  pausedFrom: null,
  menuView: 'main',
  settingsOpen: false,
  sessionId: 0,
  stageTitle: '',
  stageNumber: 1,
  isBossStage: false,
  cameraMode: 'first',
  missionOpen: false,
  hud: null,
  result: null,
  toasts: [],
  transition: (to) => {
    const from = get().phase;
    if (from === to) return true;
    if (!TRANSITIONS[from].includes(to)) {
      console.warn(`Ignored invalid transition ${from} -> ${to}`);
      return false;
    }
    set({ phase: to, missionOpen: to === 'BOSS_INTRO' ? false : get().missionOpen });
    return true;
  },
  beginSession: ({ stageTitle, stageNumber, isBoss }) =>
    set((s) => ({ sessionId: s.sessionId + 1, stageTitle, stageNumber, isBossStage: isBoss, hud: null, result: null, missionOpen: false, toasts: [] })),
  pause: () => {
    const { phase, transition } = get();
    if (phase !== 'PLAYING' && phase !== 'BOSS_FIGHT') return;
    if (transition('PAUSED')) set({ pausedFrom: phase });
  },
  resume: () => {
    const { pausedFrom, transition } = get();
    if (get().phase !== 'PAUSED' || !pausedFrom) return;
    if (transition(pausedFrom)) set({ pausedFrom: null, settingsOpen: false });
  },
  setMenuView: (menuView) => set({ menuView }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  toggleCamera: () => set((s) => ({ cameraMode: s.cameraMode === 'first' ? 'third' : 'first' })),
  toggleMission: () => set((s) => ({ missionOpen: !s.missionOpen })),
  setHud: (hud) => set({ hud }),
  setResult: (result) => set({ result }),
  pushToast: (text, tone = 'info') => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, tone }] }));
    window.setTimeout(() => get().dismissToast(id), 2600);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
