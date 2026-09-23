import { RARITY_CONFIG, UPGRADE_DEFINITIONS, UPGRADE_IDS, formatMoney, nextPrice, prerequisitesMet } from '@roomba/core';
import { useProgressStore } from '../../game/stores/progressStore';
import { Button } from '../components/Button';

export const UpgradesScreen = ({ onClose }: { onClose: () => void }) => {
  const levels = useProgressStore((s) => s.progress.levels);
  return (
    <div className="overlay">
      <div className="panel wide-panel">
        <h2>UPGRADES</h2>
        <p style={{ textAlign: 'center', color: 'var(--muted)', marginTop: -8 }}>
          Upgrades are bought in the Roomba Shop after each cleaned stage. Three random offers appear every visit.
        </p>
        <div className="upgrade-list">
          {UPGRADE_IDS.map((id) => {
            const def = UPGRADE_DEFINITIONS[id];
            const level = levels[id];
            const price = nextPrice(id, levels);
            const locked = !prerequisitesMet(def, levels);
            return (
              <div key={id} className="upgrade-item" style={{ ['--rarity' as string]: RARITY_CONFIG[def.rarity].color }}>
                <div className="name">
                  {def.icon} {def.name}
                </div>
                <div className="pips">
                  {Array.from({ length: def.maxLevel }, (_, i) => (
                    <span key={i} className={i < level ? 'on' : ''} />
                  ))}
                </div>
                <div className="meta">
                  Level {level}/{def.maxLevel} · {level > 0 ? def.effectAt(level) : 'Not installed'}
                </div>
                <div className="meta">
                  {price === null
                    ? 'MAXED'
                    : locked
                      ? `Requires ${def.prerequisites.map((p) => `${UPGRADE_DEFINITIONS[p.id].name} ${p.minLevel}`).join(', ')}`
                      : `Next: ${def.effectAt(level + 1)} · ${formatMoney(price)}`}
                </div>
              </div>
            );
          })}
        </div>
        <div className="row" style={{ marginTop: 20 }}>
          <Button variant="primary" onClick={onClose}>
            BACK
          </Button>
        </div>
      </div>
    </div>
  );
};
