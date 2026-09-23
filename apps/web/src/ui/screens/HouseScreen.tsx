import { HOUSES, LAYOUT_LEGEND, formatMoney, stageReward } from '@roomba/core';
import { audio } from '../../game/session';
import { useProgressStore } from '../../game/stores/progressStore';
import { Button } from '../components/Button';

const HOUSE_EMOJI = ['🏢', '🏬', '🏘️', '🏡', '🏠', '🏛️', '🏰', '👑'];

const roomCount = (layout: readonly string[]): number => new Set(layout.join('').split('').filter((c) => c in LAYOUT_LEGEND)).size;

export const HouseScreen = ({ onClose }: { onClose: () => void }) => {
  const progress = useProgressStore((s) => s.progress);
  const buyDirect = useProgressStore((s) => s.buyDirect);
  const current = progress.levels.house;
  const next = HOUSES[current];

  return (
    <div className="overlay">
      <div className="panel wide-panel">
        <h2>HOUSES</h2>
        <p style={{ textAlign: 'center', color: 'var(--muted)', marginTop: -8 }}>
          Bigger houses mean more rooms, more dirt and +{formatMoney(100)} per stage. Purchases are permanent.
        </p>
        <div className="house-list">
          {HOUSES.map((h, i) => {
            const status = h.level === current ? 'current' : h.level < current ? 'owned' : h.level === current + 1 ? 'next' : 'locked';
            const size = `${(h.layout[0]?.length ?? 0) * h.cellSize}×${h.layout.length * h.cellSize} m`;
            return (
              <div key={h.level} className={`house-item ${status === 'current' ? 'current' : status === 'locked' ? 'locked' : ''}`}>
                <div className="emoji">{HOUSE_EMOJI[i] ?? '🏠'}</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18 }}>{h.name}</div>
                  <div className="meta">
                    {size} · {roomCount(h.layout)} rooms · {formatMoney(stageReward(h.level, false))} per stage
                  </div>
                  <div className="meta">{h.description}</div>
                </div>
                <div className="tag">
                  {status === 'current' ? 'YOU LIVE HERE' : status === 'owned' ? 'OWNED' : status === 'next' ? formatMoney(h.price) : '🔒'}
                </div>
              </div>
            );
          })}
        </div>
        <div className="row" style={{ marginTop: 20 }}>
          {next && (
            <Button
              variant="good"
              disabled={progress.money < next.price}
              onClick={() => {
                if (buyDirect('house')) audio.play('uiBuy');
              }}
            >
              BUY {next.name.toUpperCase()} — {formatMoney(next.price)}
            </Button>
          )}
          <Button variant="primary" onClick={onClose}>
            BACK
          </Button>
        </div>
      </div>
    </div>
  );
};
