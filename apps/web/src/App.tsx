import { useEffect } from 'react';
import { installController } from './game/controller';
import { isActivePhase, useGameStore } from './game/stores/gameStore';
import { GameCanvas } from './render/GameCanvas';
import { Hud } from './ui/hud/Hud';
import { TouchControls } from './ui/mobile/TouchControls';
import { BossIntroScreen, GameOverScreen, PauseScreen, StageCompleteScreen } from './ui/screens/ResultScreens';
import { MainMenu } from './ui/screens/MainMenu';
import { ShopScreen } from './ui/screens/ShopScreen';
import { useIsTouch } from './ui/useIsTouch';

export const App = () => {
  const phase = useGameStore((s) => s.phase);
  const touch = useIsTouch();
  useEffect(() => installController(), []);

  const inGame = phase !== 'MAIN_MENU';
  const active = isActivePhase(phase);
  return (
    <div className={`app ${touch ? 'is-touch' : ''}`}>
      {inGame && <GameCanvas />}
      {inGame && phase !== 'SHOP' && phase !== 'BOSS_INTRO' && <Hud touch={touch} />}
      {active && touch && <TouchControls />}
      {phase === 'MAIN_MENU' && <MainMenu />}
      {phase === 'PAUSED' && <PauseScreen />}
      {phase === 'BOSS_INTRO' && <BossIntroScreen />}
      {phase === 'STAGE_COMPLETE' && <StageCompleteScreen />}
      {phase === 'SHOP' && <ShopScreen />}
      {phase === 'GAME_OVER' && <GameOverScreen />}
    </div>
  );
};
