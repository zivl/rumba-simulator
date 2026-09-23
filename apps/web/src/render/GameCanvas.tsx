import { GRAPHICS_PRESETS } from '@roomba/core';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { useSimulation } from '../game/session';
import { useGameStore } from '../game/stores/gameStore';
import { useSettingsStore } from '../game/stores/settingsStore';
import { Scene } from './Scene';

export const GameCanvas = () => {
  const sim = useSimulation();
  const sessionId = useGameStore((s) => s.sessionId);
  const quality = useSettingsStore((s) => s.quality);
  const preset = GRAPHICS_PRESETS[quality];
  if (!sim) return null;
  return (
    <Canvas
      key={`${quality}`}
      className="game-canvas"
      shadows={preset.shadows ? { type: THREE.PCFSoftShadowMap } : false}
      dpr={[1, preset.maxPixelRatio]}
      gl={{ antialias: preset.antialias, powerPreference: 'high-performance' }}
      camera={{ fov: 78, near: 0.01, far: 90, position: [0, 0.1, 0] }}
      onCreated={(state) => {
        if (import.meta.env.DEV) Object.assign((window as unknown as { __roomba?: object }).__roomba ?? {}, { r3f: state });
      }}
    >
      <Scene key={sessionId} sim={sim} />
    </Canvas>
  );
};
