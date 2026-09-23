export type AxisAction = 'forward' | 'backward' | 'left' | 'right';

export type ButtonAction =
  | 'toggleCamera'
  | 'toggleBrush'
  | 'toggleVacuum'
  | 'toggleLights'
  | 'toggleMission'
  | 'toggleInfrared'
  | 'pause';

export type InputAction = AxisAction | ButtonAction;

export type KeyBindings = Record<InputAction, string[]>;

/** Bindings use KeyboardEvent.code so layouts like AZERTY still map physically. */
export const DEFAULT_KEY_BINDINGS: KeyBindings = {
  forward: ['KeyW', 'ArrowUp'],
  backward: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  toggleCamera: ['KeyC'],
  toggleBrush: ['KeyQ'],
  toggleVacuum: ['KeyE'],
  toggleLights: ['KeyF'],
  toggleMission: ['KeyO'],
  toggleInfrared: ['KeyI'],
  pause: ['Escape', 'KeyP'],
};

export const INPUT_ACTION_LABELS: Record<InputAction, string> = {
  forward: 'Move forward',
  backward: 'Move backward',
  left: 'Rotate left',
  right: 'Rotate right',
  toggleCamera: 'Switch camera',
  toggleBrush: 'Toggle brush',
  toggleVacuum: 'Toggle vacuum',
  toggleLights: 'Toggle lights',
  toggleMission: 'Show mission',
  toggleInfrared: 'Infrared vision',
  pause: 'Pause',
};

export const TOUCH_CONFIG = {
  joystickRadius: 62,
  deadZone: 0.12,
} as const;

export type GraphicsQuality = 'low' | 'medium' | 'high';

export const GRAPHICS_PRESETS: Record<
  GraphicsQuality,
  { shadows: boolean; shadowMapSize: number; maxPixelRatio: number; particleScale: number; antialias: boolean }
> = {
  low: { shadows: false, shadowMapSize: 512, maxPixelRatio: 1, particleScale: 0.4, antialias: false },
  medium: { shadows: true, shadowMapSize: 1024, maxPixelRatio: 1.5, particleScale: 0.7, antialias: true },
  high: { shadows: true, shadowMapSize: 2048, maxPixelRatio: 2, particleScale: 1, antialias: true },
};
