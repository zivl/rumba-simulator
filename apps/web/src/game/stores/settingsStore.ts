import { DEFAULT_KEY_BINDINGS, type GraphicsQuality, type InputAction, type KeyBindings } from '@roomba/core';
import { create } from 'zustand';

export type TouchMode = 'auto' | 'on' | 'off';

export interface Settings {
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  quality: GraphicsQuality;
  turnSensitivity: number;
  cameraShake: boolean;
  touchControls: TouchMode;
  bindings: KeyBindings;
}

interface SettingsStore extends Settings {
  update: (patch: Partial<Settings>) => void;
  rebind: (action: InputAction, code: string) => void;
  resetBindings: () => void;
}

const STORAGE_KEY = 'roomba-simulator.settings';

const defaultQuality = (): GraphicsQuality => {
  if (typeof window === 'undefined') return 'medium';
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  return coarse ? 'low' : 'high';
};

const DEFAULTS: Settings = {
  masterVolume: 0.8,
  sfxVolume: 0.8,
  musicVolume: 0.45,
  quality: defaultQuality(),
  turnSensitivity: 1,
  cameraShake: true,
  touchControls: 'auto',
  bindings: DEFAULT_KEY_BINDINGS,
};

const load = (): Settings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULTS, ...parsed, bindings: { ...DEFAULT_KEY_BINDINGS, ...(parsed.bindings ?? {}) } };
  } catch {
    return DEFAULTS;
  }
};

const persist = (settings: Settings): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage may be unavailable (private mode); settings then last for the session only.
  }
};

const pick = (s: SettingsStore): Settings => ({
  masterVolume: s.masterVolume,
  sfxVolume: s.sfxVolume,
  musicVolume: s.musicVolume,
  quality: s.quality,
  turnSensitivity: s.turnSensitivity,
  cameraShake: s.cameraShake,
  touchControls: s.touchControls,
  bindings: s.bindings,
});

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...load(),
  update: (patch) => {
    set(patch);
    persist(pick(get()));
  },
  rebind: (action, code) => {
    const bindings = { ...get().bindings };
    // A key can only drive one action.
    for (const key of Object.keys(bindings) as InputAction[]) bindings[key] = bindings[key].filter((c) => c !== code);
    bindings[action] = [code, ...bindings[action].filter((c) => c !== code)].slice(0, 2);
    set({ bindings });
    persist(pick(get()));
  },
  resetBindings: () => {
    set({ bindings: DEFAULT_KEY_BINDINGS });
    persist(pick(get()));
  },
}));
