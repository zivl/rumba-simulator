import { useEffect, useState } from 'react';
import { useSimulation } from '../../game/session';
import { useSettingsStore } from '../../game/stores/settingsStore';
import type { MissionState } from '@roomba/core';

export const MissionPanel = () => {
  const sim = useSimulation();
  const [mission, setMission] = useState<MissionState | null>(sim?.mission ?? null);
  const key = useSettingsStore((s) => s.bindings.toggleMission[0]?.replace('Key', '') ?? 'O');
  useEffect(() => {
    const id = window.setInterval(() => setMission(sim ? { ...sim.mission } : null), 200);
    return () => window.clearInterval(id);
  }, [sim]);
  if (!sim || !mission) return null;
  return (
    <div className="mission">
      <h3>{mission.title}</h3>
      {mission.objectives.map((o) => (
        <div key={o.id} className={`objective ${o.done ? 'done' : ''}`}>
          <div className="check">{o.done ? '✓' : ''}</div>
          <div className="label">{o.label}</div>
          <div className="detail">{o.detail}</div>
          <div className="bar">
            <div style={{ width: `${o.progress * 100}%` }} />
          </div>
        </div>
      ))}
      <div className="hint">🔋 Battery: {Math.ceil(sim.batteryFraction * 100)}%</div>
      <div className="hint">{mission.hint}</div>
      <div className="close-hint">Press {key} to close</div>
    </div>
  );
};
