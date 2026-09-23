import type { AxisAction, ButtonAction, ControlInput, InputAction, KeyBindings } from '@roomba/core';

type ActionListener = (action: ButtonAction) => void;

const AXES: readonly AxisAction[] = ['forward', 'backward', 'left', 'right'];

/**
 * Centralised input: keyboard bindings (remappable) and touch axes both resolve to the
 * same ControlInput and button actions, so gameplay never reads raw devices.
 */
export class InputManager {
  private readonly pressed = new Set<string>();
  private readonly listeners = new Set<ActionListener>();
  private touch: ControlInput = { throttle: 0, turn: 0 };
  private codeToAction = new Map<string, InputAction>();
  private attached = false;
  /** When set, the next key press is captured instead of being handled (for rebinding). */
  captureNext: ((code: string) => void) | null = null;

  setBindings(bindings: KeyBindings): void {
    this.codeToAction.clear();
    for (const [action, codes] of Object.entries(bindings) as [InputAction, string[]][]) {
      for (const code of codes) this.codeToAction.set(code, action);
    }
  }

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
  }

  detach(): void {
    this.attached = false;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
  }

  onAction(listener: ActionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  trigger(action: ButtonAction): void {
    for (const listener of this.listeners) listener(action);
  }

  setTouchAxes(throttle: number, turn: number): void {
    this.touch = { throttle, turn };
  }

  private isDown(action: AxisAction): boolean {
    for (const code of this.pressed) if (this.codeToAction.get(code) === action) return true;
    return false;
  }

  getControl(): ControlInput {
    const kbThrottle = (this.isDown('forward') ? 1 : 0) - (this.isDown('backward') ? 1 : 0);
    const kbTurn = (this.isDown('right') ? 1 : 0) - (this.isDown('left') ? 1 : 0);
    return {
      throttle: Math.max(-1, Math.min(1, kbThrottle + this.touch.throttle)),
      turn: Math.max(-1, Math.min(1, kbTurn + this.touch.turn)),
    };
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (this.captureNext) {
      event.preventDefault();
      const capture = this.captureNext;
      this.captureNext = null;
      capture(event.code);
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA')) return;
    const action = this.codeToAction.get(event.code);
    if (!action) return;
    event.preventDefault();
    if (AXES.includes(action as AxisAction)) {
      this.pressed.add(event.code);
      return;
    }
    if (!event.repeat) this.trigger(action as ButtonAction);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.pressed.delete(event.code);
  };

  private readonly onBlur = (): void => {
    this.pressed.clear();
    this.touch = { throttle: 0, turn: 0 };
  };
}

export const input = new InputManager();
