import { GRAPHICS_PRESETS, INFRARED_COLORS, ROOM_TYPES, type LightingMood, type Simulation } from '@roomba/core';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { updateFrame } from '../game/controller';
import { useGameStore } from '../game/stores/gameStore';
import { useSettingsStore } from '../game/stores/settingsStore';
import { BossModel } from './bosses/BossModels';
import { CameraRig } from './CameraRig';
import { ChargingStation } from './ChargingStation';
import { DirtLayer, FloorGrime } from './DirtLayer';
import { Particles } from './effects/Particles';
import { WallRadarMarkers } from './effects/WallRadarMarkers';
import { House } from './House';
import { Roomba } from './Roomba';

interface MoodLighting {
  background: string;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  sunColor: string;
  sunIntensity: number;
  sunDirection: [number, number, number];
  fogColor: string;
}

const MOODS: Record<LightingMood, MoodLighting> = {
  day: {
    background: '#cfe3f5',
    hemiSky: '#eef6ff',
    hemiGround: '#b8a58c',
    hemiIntensity: 1.15,
    sunColor: '#fff3df',
    sunIntensity: 2.2,
    sunDirection: [0.45, 1, 0.3],
    fogColor: '#cfc8bb',
  },
  evening: {
    background: '#e0a276',
    hemiSky: '#ffd2a8',
    hemiGround: '#6b4f3a',
    hemiIntensity: 0.55,
    sunColor: '#ff9a52',
    sunIntensity: 1.2,
    sunDirection: [0.9, 0.55, 0.2],
    fogColor: '#a58a70',
  },
  night: {
    background: '#0b1224',
    hemiSky: '#445b8a',
    hemiGround: '#141824',
    hemiIntensity: 0.12,
    sunColor: '#8fa8ff',
    sunIntensity: 0.18,
    sunDirection: [0.3, 1, -0.4],
    fogColor: '#10131c',
  },
};

/** Drives the simulation once per frame before anything renders. */
const LoopDriver = () => {
  useFrame((_, delta) => updateFrame(delta), -1);
  return null;
};

const Atmosphere = ({ sim, mood, infrared }: { sim: Simulation; mood: MoodLighting; infrared: boolean }) => {
  const scene = useThree((s) => s.scene);
  // Fog only appears in boss dust, so it is tinted dust-grey towards the mood colour.
  const fog = useMemo(() => new THREE.FogExp2(new THREE.Color('#bdb6a8').lerp(new THREE.Color(mood.fogColor), 0.4).getHex(), 0), [mood.fogColor]);
  useEffect(() => {
    scene.fog = fog;
    scene.background = new THREE.Color(infrared ? INFRARED_COLORS.background : mood.background);
    return () => {
      scene.fog = null;
    };
  }, [scene, fog, mood, infrared]);
  useFrame(() => {
    // Boss dust thickens the air; infrared cuts through most of it.
    fog.density = sim.fog * (infrared ? 0.15 : 1.1);
  });
  return null;
};

const Lights = ({ sim, mood, shadows, shadowMapSize }: { sim: Simulation; mood: MoodLighting; shadows: boolean; shadowMapSize: number }) => {
  const sun = useRef<THREE.DirectionalLight>(null);
  const { bounds } = sim.house;
  const size = Math.max(bounds.maxX - bounds.minX, bounds.maxZ - bounds.minZ);
  useEffect(() => {
    const light = sun.current;
    if (!light) return;
    const [dx, dy, dz] = mood.sunDirection;
    light.position.set(dx * size, dy * size, dz * size);
    light.target.position.set(0, 0, 0);
    light.target.updateMatrixWorld();
    const cam = light.shadow.camera;
    cam.left = -size * 0.75;
    cam.right = size * 0.75;
    cam.top = size * 0.75;
    cam.bottom = -size * 0.75;
    cam.near = 0.5;
    cam.far = size * 3;
    cam.updateProjectionMatrix();
    light.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    light.shadow.bias = -0.0006;
    light.shadow.normalBias = 0.02;
  }, [mood, size, shadowMapSize]);
  return (
    <>
      <hemisphereLight args={[mood.hemiSky, mood.hemiGround, mood.hemiIntensity]} />
      <directionalLight ref={sun} color={mood.sunColor} intensity={mood.sunIntensity} castShadow={shadows} />
      <ambientLight intensity={0.08} />
    </>
  );
};

export const Scene = ({ sim }: { sim: Simulation }) => {
  const cameraMode = useGameStore((s) => s.cameraMode);
  const infrared = useGameStore((s) => s.hud?.infrared ?? false);
  const quality = useSettingsStore((s) => s.quality);
  const preset = GRAPHICS_PRESETS[quality];
  const mood = MOODS[sim.stage.mood];
  const wallColor = sim.house.isArena ? sim.stage.boss?.color ?? '#e9e2d6' : ROOM_TYPES.living.wallColor;
  const arenaWall = useMemo(() => {
    if (!sim.house.isArena) return wallColor;
    return `#${new THREE.Color(wallColor).lerp(new THREE.Color('#ffffff'), 0.55).getHexString()}`;
  }, [sim.house.isArena, wallColor]);

  return (
    <>
      <LoopDriver />
      <Atmosphere sim={sim} mood={mood} infrared={infrared} />
      <Lights sim={sim} mood={mood} shadows={preset.shadows} shadowMapSize={preset.shadowMapSize} />
      <House house={sim.house} infrared={infrared} mood={sim.stage.mood} wallColor={arenaWall} shadows={preset.shadows} />
      <ChargingStation sim={sim} infrared={infrared} />
      <FloorGrime sim={sim} resolution={quality === 'low' ? 512 : 1024} />
      <DirtLayer sim={sim} infrared={infrared} />
      <Roomba sim={sim} infrared={infrared} shadows={preset.shadows} />
      {sim.boss && <BossModel boss={sim.boss} infrared={infrared} />}
      {sim.stats.wallRadarRange > 0 && <WallRadarMarkers sim={sim} />}
      <Particles sim={sim} capacity={Math.round(900 * preset.particleScale) + 200} />
      <CameraRig sim={sim} mode={cameraMode} />
    </>
  );
};
