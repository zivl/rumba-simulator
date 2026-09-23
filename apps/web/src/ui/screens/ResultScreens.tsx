import { formatMoney } from '@roomba/core';
import { useEffect, useMemo, useState } from 'react';
import { beginBossFight, openShop, quitToMenu, startStage } from '../../game/flow';
import { audio, useSimulation } from '../../game/session';
import { useGameStore } from '../../game/stores/gameStore';
import { Button } from '../components/Button';
import { SettingsScreen } from './SettingsScreen';

const formatTime = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

const Confetti = () => {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 2 + Math.random() * 2,
        color: ['#40c4ff', '#ffd166', '#3ddc84', '#ff6b9a', '#b57bff'][i % 5],
      })),
    [],
  );
  return (
    <div className="confetti">
      {pieces.map((p, i) => (
        <i key={i} style={{ left: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s` }} />
      ))}
    </div>
  );
};

const useCountUp = (target: number, duration = 1.1): number => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = () => {
      const t = Math.min(1, (performance.now() - start) / (duration * 1000));
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
};

export const StageCompleteScreen = () => {
  const result = useGameStore((s) => s.result);
  const reward = useCountUp(result?.reward ?? 0);
  if (!result) return null;
  return (
    <div className="overlay">
      <Confetti />
      <div className="panel">
        <div className="result-title good">{result.bossName ? 'BOSS DEFEATED!' : 'HOUSE CLEAN!'}</div>
        <div className="result-sub">STAGE {result.stage} COMPLETE</div>
        <dl className="stats">
          <dt>Cleaning</dt>
          <dd>{Math.floor(result.clean * 100)}%</dd>
          <dt>Dirt collected</dt>
          <dd>{result.dirtCleaned}</dd>
          <dt>Time</dt>
          <dd>{formatTime(result.time)}</dd>
          <dt>Battery left</dt>
          <dd>{Math.round(result.batteryLeft * 100)}%</dd>
          {result.bossName && (
            <>
              <dt>Boss</dt>
              <dd>{result.bossName}</dd>
            </>
          )}
          <dt>Reward</dt>
          <dd className="reward">+{formatMoney(reward)}</dd>
        </dl>
        <div className="row">
          <Button variant="primary" onClick={() => openShop()}>
            🛒 OPEN SHOP
          </Button>
        </div>
      </div>
    </div>
  );
};

export const GameOverScreen = () => {
  const sim = useSimulation();
  return (
    <div className="overlay">
      <div className="panel">
        <div className="result-title bad">GAME OVER</div>
        <div className="result-sub">🪫 BATTERY EMPTY</div>
        <p style={{ textAlign: 'center', color: 'var(--muted)' }}>
          You cleaned {Math.floor((sim?.cleanFraction ?? 0) * 100)}% of {Math.floor((sim?.stage.requiredClean ?? 0) * 100)}% needed. Your money and upgrades are safe.
          <br />
          Tip: head back to the dock before the battery turns red.
        </p>
        <div className="row" style={{ marginTop: 18 }}>
          <Button variant="primary" onClick={() => startStage()}>
            ↻ RETRY
          </Button>
          <Button variant="ghost" onClick={() => quitToMenu()}>
            RETURN TO MENU
          </Button>
        </div>
      </div>
    </div>
  );
};

export const BossIntroScreen = () => {
  const sim = useSimulation();
  const boss = sim?.stage.boss;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') beginBossFight();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (!boss) return null;
  return (
    <div className="overlay" style={{ background: 'radial-gradient(circle at 50% 35%, rgba(90,20,10,0.8), rgba(5,2,2,0.95))' }}>
      <div className="boss-intro">
        <div className="flash">⚠ BOSS STAGE ⚠</div>
        <div className="portrait">{boss.icon}</div>
        <h2>{boss.name}</h2>
        <div className="nick">“{boss.nickname}”</div>
        <p className="tagline">{boss.tagline}</p>
        <ul>
          <li>🛡️ SURVIVE THE BOSS</li>
          <li>💥 NEUTRALIZE THE BOSS — ram it with the vacuum ON ({boss.maxHealth} HP)</li>
          <li>🧹 CLEAN THE MESS ({Math.round(sim.stage.requiredClean * 100)}%)</li>
        </ul>
        <Button
          variant="danger"
          onClick={() => {
            audio.play('bossAttack');
            beginBossFight();
          }}
        >
          LET'S CLEAN! ▶
        </Button>
      </div>
    </div>
  );
};

export const PauseScreen = () => {
  const resume = useGameStore((s) => s.resume);
  const settingsOpen = useGameStore((s) => s.settingsOpen);
  const setSettingsOpen = useGameStore((s) => s.setSettingsOpen);
  const title = useGameStore((s) => s.stageTitle);
  if (settingsOpen) return <SettingsScreen onClose={() => setSettingsOpen(false)} />;
  return (
    <div className="overlay">
      <div className="panel stack">
        <h2>PAUSED</h2>
        <p style={{ textAlign: 'center', color: 'var(--muted)', margin: '-8px 0 8px' }}>{title}</p>
        <Button variant="primary" onClick={resume}>
          ▶ RESUME
        </Button>
        <Button onClick={() => setSettingsOpen(true)}>⚙ SETTINGS</Button>
        <Button onClick={() => startStage()}>↻ RESTART STAGE</Button>
        <Button variant="ghost" onClick={() => quitToMenu()}>
          QUIT TO MENU
        </Button>
      </div>
    </div>
  );
};
