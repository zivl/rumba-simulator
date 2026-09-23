import { INPUT_ACTION_LABELS, type GraphicsQuality, type InputAction } from '@roomba/core';
import { useState } from 'react';
import { input } from '../../game/input/InputManager';
import { getSimulation } from '../../game/session';
import { useProgressStore } from '../../game/stores/progressStore';
import { useSettingsStore, type TouchMode } from '../../game/stores/settingsStore';
import { Button } from '../components/Button';
import { useIsTouch } from '../useIsTouch';

const Slider = ({ label, value, onChange, min = 0, max = 1, step = 0.05 }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) => (
  <div className="field">
    <label>{label}</label>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
  </div>
);

const Segmented = <T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (v: T) => void }) => (
  <div className="field">
    <label>{label}</label>
    <div className="segmented">
      {options.map((o) => (
        <button key={o} className={o === value ? 'active' : ''} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  </div>
);

const pretty = (code: string | undefined): string => (code ? code.replace('Key', '').replace('Arrow', 'Arrow ').replace('Digit', '') : '—');

export const SettingsScreen = ({ onClose, allowReset }: { onClose: () => void; allowReset?: boolean }) => {
  const s = useSettingsStore();
  const touch = useIsTouch();
  const [capturing, setCapturing] = useState<InputAction | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const resetProgress = useProgressStore((p) => p.resetProgress);

  const capture = (action: InputAction) => {
    setCapturing(action);
    input.captureNext = (code) => {
      if (code !== 'Escape') s.rebind(action, code);
      setCapturing(null);
    };
  };

  return (
    <div className="overlay">
      <div className="panel">
        <h2>SETTINGS</h2>
        <div className="section-title">AUDIO</div>
        <Slider label="Master volume" value={s.masterVolume} onChange={(v) => s.update({ masterVolume: v })} />
        <Slider label="Sound effects" value={s.sfxVolume} onChange={(v) => s.update({ sfxVolume: v })} />
        <Slider label="Music" value={s.musicVolume} onChange={(v) => s.update({ musicVolume: v })} />
        <div className="section-title">GRAPHICS & CONTROLS</div>
        <Segmented<GraphicsQuality> label="Graphics quality" value={s.quality} options={['low', 'medium', 'high']} onChange={(v) => s.update({ quality: v })} />
        <Slider
          label={`Turn sensitivity (${s.turnSensitivity.toFixed(2)}x)`}
          value={s.turnSensitivity}
          min={0.5}
          max={1.6}
          onChange={(v) => {
            s.update({ turnSensitivity: v });
            const sim = getSimulation();
            if (sim) sim.turnSensitivity = v;
          }}
        />
        <Segmented<'on' | 'off'> label="Camera shake" value={s.cameraShake ? 'on' : 'off'} options={['on', 'off']} onChange={(v) => s.update({ cameraShake: v === 'on' })} />
        <Segmented<TouchMode> label="Touch controls" value={s.touchControls} options={['auto', 'on', 'off']} onChange={(v) => s.update({ touchControls: v })} />
        {!touch && (
          <>
            <div className="section-title">KEY BINDINGS</div>
            {(Object.keys(INPUT_ACTION_LABELS) as InputAction[]).map((action) => (
              <div key={action} className="field">
                <label>{INPUT_ACTION_LABELS[action]}</label>
                <button className={`binding ${capturing === action ? 'capturing' : ''}`} onClick={() => capture(action)}>
                  {capturing === action ? 'Press a key...' : s.bindings[action].map(pretty).join(' / ')}
                </button>
              </div>
            ))}
            <div className="row" style={{ marginTop: 10 }}>
              <Button small variant="ghost" onClick={() => s.resetBindings()}>
                Reset bindings
              </Button>
            </div>
          </>
        )}
        {allowReset && (
          <>
            <div className="section-title">SAVE DATA</div>
            <div className="row">
              {confirmReset ? (
                <>
                  <Button small variant="danger" onClick={() => void resetProgress().then(() => setConfirmReset(false))}>
                    Yes, erase everything
                  </Button>
                  <Button small variant="ghost" onClick={() => setConfirmReset(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button small variant="ghost" onClick={() => setConfirmReset(true)}>
                  Reset progress
                </Button>
              )}
            </div>
          </>
        )}
        <div className="row" style={{ marginTop: 22 }}>
          <Button variant="primary" onClick={onClose}>
            DONE
          </Button>
        </div>
      </div>
    </div>
  );
};
