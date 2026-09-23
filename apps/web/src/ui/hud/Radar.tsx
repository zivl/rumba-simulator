import { nearestDirt, proximityStrength, scanDirt, type RadarContact, type Simulation } from '@roomba/core';
import { useEffect, useRef, useState } from 'react';

const REFRESH_MS = 140;

/** Heading-up projection: forward is up on screen, the roomba's right is right. */
const toLocal = (sim: Simulation, x: number, z: number): { right: number; forward: number } => {
  const { heading } = sim.roomba;
  const dx = x - sim.roomba.x;
  const dz = z - sim.roomba.z;
  const fx = Math.sin(heading);
  const fz = Math.cos(heading);
  return { forward: dx * fx + dz * fz, right: -dx * fz + dz * fx };
};

const drawMinimap = (ctx: CanvasRenderingContext2D, size: number, sim: Simulation, contacts: RadarContact[], range: number, t: number) => {
  const c = size / 2;
  const scale = (c - 6) / range;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, c - 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = 'rgba(6, 26, 40, 0.9)';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(64,196,255,0.25)';
  for (const f of [0.33, 0.66, 1]) {
    ctx.beginPath();
    ctx.arc(c, c, (c - 4) * f, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Sweep.
  const sweep = (t * 2.2) % (Math.PI * 2);
  const grad = ctx.createConicGradient?.(sweep - Math.PI / 2, c, c);
  if (grad) {
    grad.addColorStop(0, 'rgba(64,196,255,0.35)');
    grad.addColorStop(0.12, 'rgba(64,196,255,0)');
    grad.addColorStop(1, 'rgba(64,196,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  for (const contact of contacts) {
    const { right, forward } = toLocal(sim, contact.x, contact.z);
    ctx.fillStyle = contact.visible ? '#ffe066' : '#ff4fd8';
    ctx.globalAlpha = 0.5 + 0.5 * (1 - contact.dist / range);
    ctx.fillRect(c + right * scale - 1.5, c - forward * scale - 1.5, 3, 3);
  }
  ctx.globalAlpha = 1;
  const drawMarker = (x: number, z: number, color: string, radius: number) => {
    const { right, forward } = toLocal(sim, x, z);
    const px = c + right * scale;
    const py = c - forward * scale;
    if (Math.hypot(px - c, py - c) > c - 4) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
  };
  drawMarker(sim.house.station.dockX, sim.house.station.dockZ, '#39ff88', 4);
  if (sim.boss && sim.boss.phase !== 'gone') drawMarker(sim.boss.x, sim.boss.z, '#ff5a1f', 6);
  ctx.restore();
  ctx.fillStyle = '#40c4ff';
  ctx.beginPath();
  ctx.moveTo(c, c - 7);
  ctx.lineTo(c - 5, c + 5);
  ctx.lineTo(c + 5, c + 5);
  ctx.closePath();
  ctx.fill();
};

/** North-up map of the whole house (Advanced Radar). */
const drawHouseMap = (ctx: CanvasRenderingContext2D, width: number, height: number, sim: Simulation) => {
  const { bounds, walls, station } = sim.house;
  const w = bounds.maxX - bounds.minX;
  const d = bounds.maxZ - bounds.minZ;
  const scale = Math.min((width - 10) / w, (height - 10) / d);
  const ox = width / 2;
  const oz = height / 2;
  // Mirror x so the map matches the view from above with +z pointing up.
  const px = (x: number) => ox - (x - (bounds.minX + bounds.maxX) / 2) * scale;
  const pz = (z: number) => oz - (z - (bounds.minZ + bounds.maxZ) / 2) * scale;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(6, 26, 40, 0.92)';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = 'rgba(150, 200, 255, 0.55)';
  for (const wall of walls) {
    ctx.fillRect(px(wall.x + wall.width / 2), pz(wall.z + wall.depth / 2), wall.width * scale, wall.depth * scale);
  }
  ctx.fillStyle = 'rgba(255, 224, 102, 0.8)';
  for (const p of sim.dirt.particles) {
    if (!p.cleaned) ctx.fillRect(px(p.x) - 1, pz(p.z) - 1, 2, 2);
  }
  ctx.fillStyle = '#39ff88';
  ctx.beginPath();
  ctx.arc(px(station.dockX), pz(station.dockZ), 4, 0, Math.PI * 2);
  ctx.fill();
  if (sim.boss && sim.boss.phase !== 'gone') {
    ctx.fillStyle = '#ff5a1f';
    ctx.beginPath();
    ctx.arc(px(sim.boss.x), pz(sim.boss.z), 5, 0, Math.PI * 2);
    ctx.fill();
  }
  const r = sim.roomba;
  ctx.save();
  ctx.translate(px(r.x), pz(r.z));
  ctx.rotate(-r.heading);
  ctx.fillStyle = '#40c4ff';
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(-5, 5);
  ctx.lineTo(5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
};

export const RadarWidget = ({ sim, compact }: { sim: Simulation; compact: boolean }) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [proximity, setProximity] = useState(0);
  const advanced = sim.stats.advancedRadar;
  const size = compact ? 104 : 150;
  const mapWidth = compact ? 150 : 220;
  const mapHeight = Math.round(mapWidth * ((sim.house.bounds.maxZ - sim.house.bounds.minZ) / (sim.house.bounds.maxX - sim.house.bounds.minX)));

  useEffect(() => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const el = canvas.current;
    if (!el) return;
    const cw = advanced ? mapWidth : size;
    const ch = advanced ? Math.min(mapHeight, mapWidth * 1.2) : size;
    el.width = cw * dpr;
    el.height = ch * dpr;
    el.style.width = `${cw}px`;
    el.style.height = `${ch}px`;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const id = window.setInterval(() => {
      const t = performance.now() / 1000;
      if (advanced) {
        drawHouseMap(ctx, cw, ch, sim);
      } else {
        const range = sim.stats.dirtRadarRange;
        const contacts = scanDirt(sim.dirt, sim.world, sim.roomba.x, sim.roomba.z, {
          range,
          throughWalls: sim.stats.wallRadarRange > 0,
          maxContacts: 160,
        });
        drawMinimap(ctx, size, sim, contacts, range, t);
      }
      if (sim.stats.proximityRadarRange > 0) setProximity(proximityStrength(sim.dirt, sim.roomba.x, sim.roomba.z, sim.stats.proximityRadarRange));
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [sim, advanced, size, mapWidth, mapHeight]);

  const lit = Math.ceil(proximity * 5);
  return (
    <div className="radar">
      <canvas ref={canvas} />
      <div style={{ marginTop: 4 }}>{advanced ? 'ADVANCED RADAR' : 'DIRT RADAR'}</div>
      {sim.stats.proximityRadarRange > 0 && (
        <div className="proximity" aria-label="Proximity">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={i < lit ? 'lit' : ''} />
          ))}
        </div>
      )}
    </div>
  );
};

interface ArrowView {
  angle: number;
  dist: number;
}

/** Directional radar: arrows around the screen centre pointing at the nearest dirt. */
export const DirectionalArrows = ({ sim }: { sim: Simulation }) => {
  const [arrows, setArrows] = useState<ArrowView[]>([]);
  useEffect(() => {
    const id = window.setInterval(() => {
      const targets = nearestDirt(sim.dirt, sim.roomba.x, sim.roomba.z, sim.stats.directionalTargets);
      setArrows(
        targets
          .filter((t) => t.dist > 0.6)
          .map((t) => {
            const { right, forward } = toLocal(sim, t.x, t.z);
            return { angle: Math.atan2(right, forward), dist: t.dist };
          }),
      );
    }, 120);
    return () => window.clearInterval(id);
  }, [sim]);
  const ring = 'min(30vh, 30vw)';
  return (
    <div className="arrows" style={{ ['--ring' as string]: ring }}>
      {arrows.map((a, i) => (
        <div key={i} className="arrow" style={{ transform: `rotate(${a.angle}rad)`, opacity: i === 0 ? 1 : 0.6 }}>
          <div>
            ▲<small style={{ transform: `rotate(${-a.angle}rad)` }}>{a.dist.toFixed(1)}m</small>
          </div>
        </div>
      ))}
    </div>
  );
};
