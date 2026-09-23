export type FxEvent =
  | { kind: 'puff'; x: number; z: number; color: string; count: number; y?: number; spread?: number; speed?: number }
  | { kind: 'spark'; x: number; z: number; count: number }
  | { kind: 'ring'; x: number; z: number; color: string };

type Listener = (event: FxEvent) => void;

const listeners = new Set<Listener>();

/** Tiny event bus from game logic to the particle renderer. */
export const fxBus = {
  emit(event: FxEvent): void {
    for (const listener of listeners) listener(event);
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

/** Camera shake, read and decayed by the camera rig. */
export const cameraFx = {
  shake: 0,
  addShake(amount: number): void {
    this.shake = Math.min(0.12, this.shake + amount);
  },
};
