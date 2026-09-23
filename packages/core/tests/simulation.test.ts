import { describe, expect, it } from 'vitest';
import { buildStage, createStartingLevels, deriveStats, Simulation, type SimEvent } from '../src';

const DT = 1 / 60;

const newSim = (stage = 1) => new Simulation({ stage: buildStage(stage, 1), stats: deriveStats(createStartingLevels()) });

describe('simulation', () => {
  it('drives forward, drains battery and collides instead of passing through walls', () => {
    const sim = newSim();
    const events: SimEvent[] = [];
    for (let i = 0; i < 60 * 8; i++) {
      sim.step(DT, { throttle: 1, turn: 0 });
      events.push(...sim.drainEvents());
    }
    const { bounds } = sim.house;
    expect(sim.roomba.x).toBeGreaterThan(bounds.minX);
    expect(sim.roomba.x).toBeLessThan(bounds.maxX);
    expect(sim.roomba.z).toBeGreaterThan(bounds.minZ);
    expect(sim.roomba.z).toBeLessThan(bounds.maxZ);
    expect(sim.batteryFraction).toBeLessThan(1);
    expect(events.some((e) => e.type === 'collision')).toBe(true);
  });

  it('fails the stage when the battery runs out', () => {
    const sim = newSim();
    sim.roomba.x += 1;
    sim.roomba.battery = 0.05;
    for (let i = 0; i < 60 && sim.status === 'running'; i++) sim.step(DT, { throttle: 0, turn: 0 });
    expect(sim.status).toBe('failed');
  });

  it('charges gradually on the dock', () => {
    const sim = newSim();
    sim.roomba.battery = 20;
    const events: SimEvent[] = [];
    for (let i = 0; i < 60; i++) {
      sim.step(DT, { throttle: 0, turn: 0 });
      events.push(...sim.drainEvents());
    }
    expect(events.some((e) => e.type === 'chargeStart')).toBe(true);
    expect(sim.roomba.battery).toBeGreaterThan(20);
    expect(sim.roomba.battery).toBeLessThan(sim.stats.maxBattery);
  });

  it('completes the stage once enough dirt is cleaned', () => {
    const sim = newSim();
    const events: SimEvent[] = [];
    // Visit every particle (a perfect robot); battery is topped up to isolate cleaning.
    for (const p of sim.dirt.particles) {
      if (sim.status !== 'running') break;
      for (let i = 0; i < 90 && !p.cleaned && sim.status === 'running'; i++) {
        sim.roomba.x = p.x;
        sim.roomba.z = p.z;
        sim.roomba.battery = sim.stats.maxBattery;
        sim.step(DT, { throttle: 0, turn: 0 });
        events.push(...sim.drainEvents());
      }
    }
    expect(sim.status).toBe('complete');
    expect(sim.cleanFraction).toBeGreaterThanOrEqual(sim.stage.requiredClean);
    expect(events.some((e) => e.type === 'pickup')).toBe(true);
  });

  it('mud is much faster with the brush on', () => {
    const measure = (brushOn: boolean): number => {
      const sim = newSim();
      const mud = sim.dirt.add('mud', sim.roomba.x, sim.roomba.z, () => 0.5);
      sim.roomba.brushOn = brushOn;
      let steps = 0;
      while (!mud.cleaned && steps < 2000) {
        sim.roomba.x = mud.x;
        sim.roomba.z = mud.z;
        sim.step(DT, { throttle: 0, turn: 0 });
        steps++;
      }
      return steps;
    };
    expect(measure(true)).toBeLessThan(measure(false) / 1.5);
  });
});
