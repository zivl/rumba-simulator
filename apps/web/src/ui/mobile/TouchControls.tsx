import { TOUCH_CONFIG, type ButtonAction } from '@roomba/core';
import { useRef, type PointerEvent } from 'react';
import { input } from '../../game/input/InputManager';
import { useGameStore } from '../../game/stores/gameStore';

const Joystick = () => {
  const base = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const pointer = useRef<number | null>(null);

  const update = (event: PointerEvent<HTMLDivElement>) => {
    const el = base.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const radius = Math.min(rect.width / 2, TOUCH_CONFIG.joystickRadius);
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);
    const len = Math.hypot(dx, dy);
    if (len > radius) {
      dx = (dx / len) * radius;
      dy = (dy / len) * radius;
    }
    if (knob.current) knob.current.style.transform = `translate(${dx}px, ${dy}px)`;
    const nx = dx / radius;
    const ny = -dy / radius;
    const dead = (v: number) => (Math.abs(v) < TOUCH_CONFIG.deadZone ? 0 : (v - Math.sign(v) * TOUCH_CONFIG.deadZone) / (1 - TOUCH_CONFIG.deadZone));
    // Ease steering so small thumb movements give fine control.
    const turn = dead(nx);
    input.setTouchAxes(dead(ny), Math.sign(turn) * Math.abs(turn) ** 1.4);
  };

  const release = () => {
    pointer.current = null;
    input.setTouchAxes(0, 0);
    if (knob.current) knob.current.style.transform = 'translate(0px, 0px)';
  };

  return (
    <div
      ref={base}
      className="joystick"
      onPointerDown={(e) => {
        pointer.current = e.pointerId;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Capture can fail for synthetic or already-released pointers; move events still arrive.
        }
        update(e);
      }}
      onPointerMove={(e) => {
        if (pointer.current === e.pointerId) update(e);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <div ref={knob} className="joystick-knob" />
    </div>
  );
};

interface TouchButtonProps {
  icon: string;
  label: string;
  action: ButtonAction;
  on?: boolean;
}

const TouchButton = ({ icon, label, action, on }: TouchButtonProps) => (
  <button
    className={`touch-btn ${on ? 'on' : ''}`}
    onPointerDown={(e) => {
      e.preventDefault();
      input.trigger(action);
    }}
  >
    <span className="icon">{icon}</span>
    <span>{label}</span>
  </button>
);

export const TouchControls = () => {
  const hud = useGameStore((s) => s.hud);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const missionOpen = useGameStore((s) => s.missionOpen);
  return (
    <div className="touch">
      <Joystick />
      <div className="touch-buttons">
        <TouchButton icon="🧹" label={`BRUSH ${hud?.brush ? 'ON' : 'OFF'}`} action="toggleBrush" on={hud?.brush} />
        <TouchButton icon="🌪️" label={`VAC ${hud?.vacuum ? 'ON' : 'OFF'}`} action="toggleVacuum" on={hud?.vacuum} />
        <TouchButton icon="💡" label={`LIGHT ${hud?.lights ? 'ON' : 'OFF'}`} action="toggleLights" on={hud?.lights} />
        <TouchButton icon="🎥" label={cameraMode === 'first' ? '1ST' : '3RD'} action="toggleCamera" />
        <TouchButton icon="📋" label="MISSION" action="toggleMission" on={missionOpen} />
        {hud?.infraredAvailable ? (
          <TouchButton icon="🌡️" label="IR" action="toggleInfrared" on={hud.infrared} />
        ) : (
          <TouchButton icon="⏸" label="PAUSE" action="pause" />
        )}
      </div>
    </div>
  );
};
