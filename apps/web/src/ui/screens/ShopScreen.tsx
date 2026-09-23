import { RARITY_CONFIG, SHOP_CONFIG, formatMoney, previewUpgrade, type UpgradeId } from '@roomba/core';
import { useEffect, useRef, useState } from 'react';
import { continueFromShop } from '../../game/flow';
import { audio } from '../../game/session';
import { useProgressStore } from '../../game/stores/progressStore';
import { Button } from '../components/Button';

interface ShopCardProps {
  id: UpgradeId | null;
  slot: number;
  money: number;
  justBought: boolean;
  onBuy: (slot: number) => void;
}

const ShopCard = ({ id, slot, money, justBought, onBuy }: ShopCardProps) => {
  const levels = useProgressStore((s) => s.progress.levels);
  const preview = id ? previewUpgrade(id, levels) : null;
  if (!preview) {
    return (
      <div className="card sold-out" style={{ ['--rarity' as string]: '#555' }}>
        <div className="icon">📦</div>
        <h3>Sold out</h3>
        <div className="desc">Nothing left to offer in this slot. Impressive.</div>
      </div>
    );
  }
  const rarity = RARITY_CONFIG[preview.rarity];
  const affordable = money >= preview.price;
  return (
    <div className="card" style={{ ['--rarity' as string]: rarity.color, animationDelay: `${slot * 0.08}s` }}>
      <div className="rarity">{rarity.label}</div>
      <div className="icon">{preview.icon}</div>
      <h3>{preview.name}</h3>
      <div className="levels">
        {preview.currentLevel === 0 ? 'NEW' : `Level ${preview.currentLevel}`} → Level {preview.nextLevel}
        <span style={{ color: 'var(--muted)', fontSize: 12 }}> / {preview.maxLevel}</span>
      </div>
      <div className="effect">
        {preview.currentLevel > 0 && (
          <>
            <s>{preview.currentEffect}</s> →{' '}
          </>
        )}
        {preview.nextEffect}
      </div>
      <div className="desc">{preview.description}</div>
      <div className={`price ${affordable ? '' : 'cant'}`}>{formatMoney(preview.price)}</div>
      <div className="buy" style={{ width: '100%' }}>
        <Button variant={affordable ? 'good' : 'default'} disabled={!affordable} silent onClick={() => onBuy(slot)}>
          {affordable ? 'BUY' : 'CAN’T AFFORD'}
        </Button>
        {!affordable && <div className="cant-afford-note">Need {formatMoney(preview.price - money)} more</div>}
      </div>
      {justBought && <div className="purchase-burst">UPGRADED!</div>}
    </div>
  );
};

export const ShopScreen = () => {
  const shop = useProgressStore((s) => s.shop);
  const money = useProgressStore((s) => s.progress.money);
  const lastPurchase = useProgressStore((s) => s.lastPurchase);
  const buyOffer = useProgressStore((s) => s.buyOffer);
  const refreshShop = useProgressStore((s) => s.refreshShop);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [bump, setBump] = useState(0);
  const prevMoney = useRef(money);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (money !== prevMoney.current) setBump((b) => b + 1);
    prevMoney.current = money;
  }, [money]);

  if (!shop) return null;
  const canRefresh = money >= SHOP_CONFIG.refreshCost;

  const buy = (slot: number) => {
    if (buyOffer(slot)) audio.play('uiBuy');
    else audio.play('uiError');
  };

  return (
    <div className="overlay">
      <div className="shop">
        <div className="shop-header">
          <h2>ROOMBA SHOP</h2>
          <div key={bump} className={`shop-money ${bump ? 'bump' : ''}`}>
            💰 {formatMoney(money)}
          </div>
        </div>
        <div className="cards">
          {shop.offers.map((id, slot) => {
            const justBought = lastPurchase?.slot === slot;
            return (
              <ShopCard
                key={`${slot}-${id ?? 'none'}-${refreshNonce}-${justBought ? lastPurchase?.nonce : 0}`}
                id={id}
                slot={slot}
                money={money}
                justBought={justBought}
                onBuy={buy}
              />
            );
          })}
        </div>
        <div className="shop-footer">
          <Button
            disabled={!canRefresh}
            silent
            onClick={() => {
              if (refreshShop()) {
                audio.play('uiRefresh');
                setRefreshNonce((n) => n + 1);
              } else audio.play('uiError');
            }}
            title={canRefresh ? 'Show three different upgrades' : 'Not enough money to refresh'}
          >
            🔄 REFRESH — {formatMoney(SHOP_CONFIG.refreshCost)}
            {!canRefresh && ' (NOT ENOUGH ₪)'}
          </Button>
          <Button
            variant="primary"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              void continueFromShop();
            }}
          >
            CONTINUE ▶
          </Button>
        </div>
      </div>
    </div>
  );
};
