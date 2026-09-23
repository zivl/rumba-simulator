import {
  CLEANING_CONFIG,
  DIRT_TYPES,
  proximityStrength,
  ROOMBA_CONFIG,
  SIMULATION_CONFIG,
  estimateRuntime,
  warningLevel,
  type ButtonAction,
  type SimEvent,
  type Simulation,
} from '@roomba/core';
import { completeCurrentStage, failCurrentStage } from './flow';
import { cameraFx, fxBus } from './fx';
import { input } from './input/InputManager';
import { audio, getSimulation } from './session';
import { isActivePhase, useGameStore } from './stores/gameStore';
import { useSettingsStore } from './stores/settingsStore';

let accumulator = 0;
let hudTimer = 0;
let pickupSoundTimer = 0;
let proximityTimer = 0;

const WARNING_TEXT = ['Battery low', 'Battery critical', 'BATTERY ALMOST EMPTY'];

const shake = (amount: number): void => {
  if (useSettingsStore.getState().cameraShake) cameraFx.addShake(amount);
};

const handleEvent = (sim: Simulation, event: SimEvent): void => {
  const game = useGameStore.getState();
  switch (event.type) {
    case 'pickup': {
      const config = DIRT_TYPES[event.dirtType];
      fxBus.emit({ kind: 'puff', x: event.x, z: event.z, color: config.colors[0] ?? '#999', count: 2 });
      if (pickupSoundTimer <= 0) {
        pickupSoundTimer = CLEANING_CONFIG.pickupSoundInterval;
        const heavy = event.dirtType === 'debris' || event.dirtType === 'mud';
        audio.play(heavy ? 'pickupHeavy' : 'pickup', { pitch: 0.85 + Math.random() * 0.4, volume: 0.8 });
      }
      break;
    }
    case 'collision':
      audio.play('collision', { volume: Math.min(1, event.speed / ROOMBA_CONFIG.maxSpeed + 0.3) });
      fxBus.emit({ kind: 'spark', x: event.x, z: event.z, count: 6 });
      shake(0.02 * Math.min(1.5, event.speed));
      break;
    case 'chargeStart':
      audio.play('chargeStart');
      game.pushToast('Charging...', 'good');
      break;
    case 'chargeFull':
      audio.play('chargeFull');
      game.pushToast('Battery full!', 'good');
      break;
    case 'chargeStop':
      break;
    case 'batteryWarning':
      audio.play('warning', { volume: 0.6 + event.level * 0.2 });
      game.pushToast(`${WARNING_TEXT[event.level] ?? 'Battery low'} - head to the dock!`, 'warn');
      break;
    case 'batteryEmpty':
      failCurrentStage();
      break;
    case 'objectiveComplete':
      if (event.id !== 'clean') {
        audio.play('objective');
        game.pushToast(event.id === 'neutralize' ? 'Boss neutralized!' : 'Objective complete!', 'good');
      }
      break;
    case 'stageComplete':
      publishHud(sim);
      completeCurrentStage();
      break;
    case 'bossHit':
      audio.play('bossHit');
      fxBus.emit({ kind: 'spark', x: event.x, z: event.z, count: 14 });
      fxBus.emit({ kind: 'ring', x: event.x, z: event.z, color: '#ffe066' });
      shake(0.04);
      break;
    case 'bossAttack': {
      const model = sim.boss?.def.model;
      if (event.kind === 'knockback') audio.play('knockback');
      else audio.play('bossAttack', { volume: 0.7 });
      if (model === 'dog' && event.kind !== 'burst') audio.play('bark', { pitch: 0.9 + Math.random() * 0.2 });
      if (model === 'cat' && event.kind !== 'burst') audio.play('meow', { pitch: 0.9 + Math.random() * 0.3 });
      break;
    }
    case 'knockback':
      shake(0.07);
      fxBus.emit({ kind: 'spark', x: event.x, z: event.z, count: 10 });
      break;
    case 'bossNeutralized':
      audio.play('bossNeutralized');
      if (sim.boss) game.pushToast(sim.boss.def.neutralized.line, 'boss');
      break;
    case 'dirtSpawned':
      fxBus.emit({ kind: 'puff', x: event.x, z: event.z, color: DIRT_TYPES[event.dirtType].colors[0] ?? '#888', count: 18, y: 0.3, spread: 0.6, speed: 1.4 });
      break;
  }
};

const updateLoops = (sim: Simulation | null, active: boolean): void => {
  if (!sim || !active) {
    audio.setLoop('motor', false);
    audio.setLoop('brush', false);
    audio.setLoop('vacuum', false);
    audio.setLoop('charging', false);
    return;
  }
  const r = sim.roomba;
  const speed = Math.min(1, Math.abs(r.speed) / ROOMBA_CONFIG.maxSpeed + Math.abs(r.angularVelocity) * 0.1);
  audio.setLoop('motor', true, { volume: 0.25 + speed * 0.9, intensity: speed });
  audio.setLoop('brush', r.brushOn, { volume: 1 });
  audio.setLoop('vacuum', r.vacuumOn, { volume: 1, intensity: sim.stats.vacuumPower / 3 });
  audio.setLoop('charging', r.charging, { intensity: sim.batteryFraction });
};

const publishHud = (sim: Simulation): void => {
  const r = sim.roomba;
  const boss = sim.boss;
  useGameStore.getState().setHud({
    battery: r.battery,
    maxBattery: sim.stats.maxBattery,
    batteryFraction: sim.batteryFraction,
    clean: sim.cleanFraction,
    required: sim.stage.requiredClean,
    charging: r.charging,
    brush: r.brushOn,
    vacuum: r.vacuumOn,
    lights: r.lightsOn,
    infrared: r.infraredOn,
    infraredAvailable: sim.stats.infraredLevel > 0,
    warningLevel: warningLevel(sim.batteryFraction),
    runtimeLeft: estimateRuntime(r.battery, sim.drain.total),
    boss: boss
      ? {
          name: boss.def.name,
          nickname: boss.def.nickname,
          icon: boss.def.icon,
          health: boss.health,
          maxHealth: boss.def.maxHealth,
          phase: boss.phase,
          mood: boss.mood,
        }
      : null,
  });
};

const updateProximityRadar = (sim: Simulation, dt: number): void => {
  const range = sim.stats.proximityRadarRange;
  if (range <= 0) return;
  proximityTimer -= dt;
  if (proximityTimer > 0) return;
  const strength = proximityStrength(sim.dirt, sim.roomba.x, sim.roomba.z, range);
  if (strength <= 0) {
    proximityTimer = 0.5;
    return;
  }
  audio.play('radarPing', { pitch: 0.8 + strength * 0.6, volume: 0.35 + strength * 0.4 });
  proximityTimer = 1.1 - strength * 0.95;
};

/** Called once per rendered frame before any renderer reads the simulation. */
export const updateFrame = (delta: number): void => {
  const sim = getSimulation();
  const phase = useGameStore.getState().phase;
  const active = isActivePhase(phase);
  updateLoops(sim, active);
  if (!sim || !active || sim.status !== 'running') {
    accumulator = 0;
    return;
  }
  pickupSoundTimer -= delta;
  accumulator += Math.min(delta, SIMULATION_CONFIG.fixedStep * SIMULATION_CONFIG.maxStepsPerFrame);
  const control = input.getControl();
  while (accumulator >= SIMULATION_CONFIG.fixedStep && sim.status === 'running') {
    sim.step(SIMULATION_CONFIG.fixedStep, control);
    accumulator -= SIMULATION_CONFIG.fixedStep;
  }
  for (const event of sim.drainEvents()) handleEvent(sim, event);
  updateProximityRadar(sim, delta);

  hudTimer -= delta;
  if (hudTimer <= 0) {
    hudTimer = SIMULATION_CONFIG.hudUpdateInterval;
    publishHud(sim);
  }
};

const toggleEquipment = (sim: Simulation, equipment: 'brush' | 'vacuum' | 'lights' | 'infrared'): void => {
  if (equipment === 'infrared' && sim.stats.infraredLevel <= 0) {
    audio.play('uiError');
    useGameStore.getState().pushToast('Infrared Vision not installed', 'warn');
    return;
  }
  const on = sim.toggle(equipment);
  audio.play(on ? 'toggleOn' : 'toggleOff');
  publishHud(sim);
};

export const handleAction = (action: ButtonAction): void => {
  const game = useGameStore.getState();
  if (action === 'pause') {
    if (game.phase === 'PAUSED') game.resume();
    else game.pause();
    return;
  }
  const sim = getSimulation();
  if (!sim || !isActivePhase(game.phase)) return;
  switch (action) {
    case 'toggleCamera':
      game.toggleCamera();
      audio.play('cameraSwitch');
      break;
    case 'toggleMission':
      game.toggleMission();
      audio.play('uiClick');
      break;
    case 'toggleBrush':
      toggleEquipment(sim, 'brush');
      break;
    case 'toggleVacuum':
      toggleEquipment(sim, 'vacuum');
      break;
    case 'toggleLights':
      toggleEquipment(sim, 'lights');
      break;
    case 'toggleInfrared':
      toggleEquipment(sim, 'infrared');
      break;
  }
};

export const installController = (): (() => void) => {
  input.setBindings(useSettingsStore.getState().bindings);
  input.attach();
  const offAction = input.onAction(handleAction);
  const offBindings = useSettingsStore.subscribe((s) => input.setBindings(s.bindings));
  const applyVolumes = () => {
    const s = useSettingsStore.getState();
    audio.setVolumes({ master: s.masterVolume, sfx: s.sfxVolume, music: s.musicVolume });
  };
  applyVolumes();
  const offVolumes = useSettingsStore.subscribe(applyVolumes);
  const unlock = () => {
    audio.unlock();
    applyVolumes();
    audio.setLoop('music', true);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  const onVisibility = () => {
    if (document.hidden) useGameStore.getState().pause();
  };
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    offAction();
    offBindings();
    offVolumes();
    input.detach();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
    document.removeEventListener('visibilitychange', onVisibility);
  };
};
