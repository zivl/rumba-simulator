import { formatMoney, getHouseConfig } from '@roomba/core';
import { useState } from 'react';
import { startStage } from '../../game/flow';
import { useGameStore } from '../../game/stores/gameStore';
import { useProgressStore } from '../../game/stores/progressStore';
import { Button } from '../components/Button';
import { HouseScreen } from './HouseScreen';
import { SettingsScreen } from './SettingsScreen';
import { UpgradesScreen } from './UpgradesScreen';

export const MainMenu = () => {
  const view = useGameStore((s) => s.menuView);
  const setView = useGameStore((s) => s.setMenuView);
  const { hasSave, progress, newGame } = useProgressStore();
  const [confirmNew, setConfirmNew] = useState(false);

  const play = async () => {
    if (hasSave && progress.stats.stagesCompleted > 0 && !confirmNew) {
      setConfirmNew(true);
      return;
    }
    setConfirmNew(false);
    await newGame();
    startStage();
  };

  return (
    <div className="menu">
      <div className="menu-floor" />
      <div className="menu-roomba" />
      <div className="menu-title">
        <h1>ROOMBA SIMULATOR</h1>
        <p>Clean the house. Mind the battery. Fear the dog.</p>
      </div>
      <div className="menu-buttons">
        <Button variant="primary" onClick={() => void play()}>
          ▶ PLAY
        </Button>
        <Button variant="good" disabled={!hasSave} onClick={() => startStage()}>
          ⏯ CONTINUE {hasSave ? `· STAGE ${progress.currentStage}` : ''}
        </Button>
        <Button onClick={() => setView('upgrades')}>🛠 UPGRADES</Button>
        <Button onClick={() => setView('house')}>🏠 HOUSE</Button>
        <Button onClick={() => setView('settings')}>⚙ SETTINGS</Button>
      </div>
      {hasSave && (
        <div className="menu-footer">
          {formatMoney(progress.money)} · {getHouseConfig(progress.levels.house).name} · {progress.stats.stagesCompleted} stages cleaned
        </div>
      )}
      {confirmNew && (
        <div className="overlay">
          <div className="panel stack">
            <h2>Start over?</h2>
            <p style={{ textAlign: 'center', color: 'var(--muted)' }}>
              A new game resets your money, upgrades and house. Use CONTINUE to keep your progress.
            </p>
            <div className="row">
              <Button variant="danger" onClick={() => void play()}>
                NEW GAME
              </Button>
              <Button variant="ghost" onClick={() => setConfirmNew(false)}>
                CANCEL
              </Button>
            </div>
          </div>
        </div>
      )}
      {view === 'settings' && <SettingsScreen onClose={() => setView('main')} allowReset />}
      {view === 'upgrades' && <UpgradesScreen onClose={() => setView('main')} />}
      {view === 'house' && <HouseScreen onClose={() => setView('main')} />}
    </div>
  );
};
