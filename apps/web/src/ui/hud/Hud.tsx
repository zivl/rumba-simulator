import { formatMoney, getHouseConfig } from '@roomba/core';
import { useEffect, useState } from 'react';
import { input } from '../../game/input/InputManager';
import { audio, useSimulation } from '../../game/session';
import { useGameStore, type HudSnapshot } from '../../game/stores/gameStore';
import { useProgressStore } from '../../game/stores/progressStore';
import { useSettingsStore } from '../../game/stores/settingsStore';
import { DirectionalArrows, RadarWidget } from './Radar';
import { MissionPanel } from './MissionPanel';

const batteryColor = (f: number): string => (f > 0.5 ? '#3ddc84' : f > 0.3 ? '#c6e04a' : f > 0.15 ? '#ffb020' : '#ff4d5e');

const keyLabel = (code: string | undefined): string => (code ? code.replace('Key', '').replace('Arrow', '') : '-');

const TopBar = ({ hud }: { hud: HudSnapshot }) => {
  const money = useProgressStore((s) => s.progress.money);
  const houseLevel = useProgressStore((s) => s.progress.levels.house);
  const stage = useGameStore((s) => s.stageNumber);
  const isBoss = useGameStore((s) => s.isBossStage);
  const warnClass = hud.warningLevel >= 2 ? 'battery-warn-2' : hud.warningLevel >= 1 ? 'battery-warn-1' : '';
  return (
    <div className="hud-top">
      <div className="pill pill-money">
        <span>💰</span>
        <span className="value">{formatMoney(money)}</span>
      </div>
      <div className={`pill ${warnClass}`}>
        <span>🔋</span>
        <div>
          <small>Battery</small>
          <span className="value">{Math.ceil(hud.batteryFraction * 100)}%</span>
        </div>
        <div className="meter">
          <div className="meter-fill" style={{ width: `${hud.batteryFraction * 100}%`, background: batteryColor(hud.batteryFraction) }} />
        </div>
      </div>
      <div className="pill">
        <span>🧹</span>
        <div>
          <small>Cleaning</small>
          <span className="value">{Math.floor(hud.clean * 100)}%</span>
        </div>
        <div className="meter hide-mobile">
          <div className="meter-fill" style={{ width: `${hud.clean * 100}%`, background: 'linear-gradient(90deg,#40c4ff,#8ff0ff)' }} />
          <div className="meter-mark" style={{ left: `${hud.required * 100}%` }} />
        </div>
      </div>
      <div className="pill hide-mobile">
        <span>🏠</span>
        <div>
          <small>House</small>
          <span className="value">{isBoss ? 'Boss Arena' : getHouseConfig(houseLevel).name}</span>
        </div>
      </div>
      <div className="pill">
        <span>🎮</span>
        <div>
          <small>Stage</small>
          <span className="value">{stage}</span>
        </div>
      </div>
      <div className="hud-spacer" />
      <button
        className="icon-btn"
        aria-label="Pause"
        onClick={() => {
          audio.play('uiClick');
          input.trigger('pause');
        }}
      >
        ⏸
      </button>
    </div>
  );
};

const EquipmentPanel = ({ hud }: { hud: HudSnapshot }) => {
  const cameraMode = useGameStore((s) => s.cameraMode);
  const bindings = useSettingsStore((s) => s.bindings);
  const items = [
    { label: '🧹 Brush', on: hud.brush, key: bindings.toggleBrush[0], text: hud.brush ? 'ON' : 'OFF' },
    { label: '🌪️ Vacuum', on: hud.vacuum, key: bindings.toggleVacuum[0], text: hud.vacuum ? 'ON' : 'OFF' },
    { label: '💡 Lights', on: hud.lights, key: bindings.toggleLights[0], text: hud.lights ? 'ON' : 'OFF' },
    { label: '🎥 Camera', on: true, key: bindings.toggleCamera[0], text: cameraMode === 'first' ? 'FIRST PERSON' : 'THIRD PERSON' },
    ...(hud.infraredAvailable
      ? [{ label: '🌡️ Infrared', on: hud.infrared, key: bindings.toggleInfrared[0], text: hud.infrared ? 'ON' : 'OFF' }]
      : []),
  ];
  return (
    <div className="equipment">
      {items.map((item) => (
        <div key={item.label} className={`chip ${item.on ? 'on' : 'off'}`}>
          <span>{item.label}</span>
          <span className="state">{item.text}</span>
          <kbd>{keyLabel(item.key)}</kbd>
        </div>
      ))}
      <div className="chip off">
        <span>📋 Mission</span>
        <kbd>{keyLabel(bindings.toggleMission[0])}</kbd>
      </div>
    </div>
  );
};

const MOOD_TEXT: Record<string, string> = {
  normal: 'Roaming',
  angry: 'Furious!',
  hurt: 'Ouch!',
  paused: 'Grooming...',
  chasing: 'CHARGING AT YOU!',
  sleeping: 'Neutralized',
};

const BossBar = ({ hud }: { hud: HudSnapshot }) => {
  const boss = hud.boss;
  if (!boss) return null;
  const fraction = boss.health / boss.maxHealth;
  return (
    <div className="boss-bar">
      <div className="title">
        <span>
          {boss.icon} {boss.name}
        </span>
        <span className="mood">{boss.phase === 'active' ? MOOD_TEXT[boss.mood] ?? '' : 'NEUTRALIZED'}</span>
      </div>
      <div className="boss-health">
        <div style={{ width: `${fraction * 100}%` }} />
      </div>
    </div>
  );
};

const Toasts = () => {
  const toasts = useGameStore((s) => s.toasts);
  return (
    <div className="toasts">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
};

const ControlsHint = () => {
  const [visible, setVisible] = useState(true);
  const sessionId = useGameStore((s) => s.sessionId);
  useEffect(() => {
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 9000);
    return () => window.clearTimeout(timer);
  }, [sessionId]);
  return (
    <div className="controls-hint" style={{ opacity: visible ? 1 : 0 }}>
      <b>WASD</b> drive · <b>C</b> camera · <b>Q</b> brush · <b>E</b> vacuum · <b>F</b> lights · <b>O</b> mission · <b>Esc</b> pause
    </div>
  );
};

export const Hud = ({ touch }: { touch: boolean }) => {
  const hud = useGameStore((s) => s.hud);
  const missionOpen = useGameStore((s) => s.missionOpen);
  const sim = useSimulation();
  if (!hud || !sim) return null;
  const showRadar = sim.stats.dirtRadarRange > 0 || sim.stats.advancedRadar;
  return (
    <div className="hud">
      {hud.warningLevel >= 0 && !hud.charging && <div className={`vignette level-${hud.warningLevel}`} />}
      <FogVeil />
      <TopBar hud={hud} />
      <BossBar hud={hud} />
      {!touch && <EquipmentPanel hud={hud} />}
      {hud.charging && <div className="charging-badge">🔋 CHARGING... {Math.floor(hud.batteryFraction * 100)}%</div>}
      {showRadar && <RadarWidget sim={sim} compact={touch} />}
      {sim.stats.directionalTargets > 0 && <DirectionalArrows sim={sim} />}
      {missionOpen && <MissionPanel />}
      <Toasts />
      {!touch && <ControlsHint />}
    </div>
  );
};

/** Screen-space dust overlay when inside a boss dust cloud (complements 3D fog). */
const FogVeil = () => {
  const sim = useSimulation();
  const [opacity, setOpacity] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setOpacity(sim && !sim.roomba.infraredOn ? sim.fog * 0.8 : 0), 120);
    return () => window.clearInterval(id);
  }, [sim]);
  if (opacity < 0.02) return null;
  return <div className="fog-veil" style={{ opacity }} />;
};
