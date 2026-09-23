import {
  completeStage,
  createNewProgress,
  createRng,
  LocalStorageSaveRepository,
  MemorySaveRepository,
  openShop,
  purchaseUpgrade,
  recordGameOver,
  shopBuy,
  shopRefresh,
  type Progress,
  type SaveRepository,
  type ShopState,
  type StageResult,
  type UpgradeId,
} from '@roomba/core';
import { create } from 'zustand';

const createRepository = (): SaveRepository => {
  try {
    localStorage.setItem('roomba-simulator.probe', '1');
    localStorage.removeItem('roomba-simulator.probe');
    return new LocalStorageSaveRepository(localStorage);
  } catch {
    return new MemorySaveRepository();
  }
};

/** Swap this for a backend implementation of SaveRepository to move saves server-side. */
const repository: SaveRepository = createRepository();

let rngCounter = 0;
const freshRng = () => createRng((Date.now() ^ (++rngCounter * 0x9e3779b1)) >>> 0);

export interface PurchaseFeedback {
  slot: number;
  id: UpgradeId;
  nonce: number;
}

interface ProgressStore {
  progress: Progress;
  loaded: boolean;
  hasSave: boolean;
  shop: ShopState | null;
  lastPurchase: PurchaseFeedback | null;
  load: () => Promise<void>;
  newGame: () => Promise<void>;
  persist: () => Promise<void>;
  applyDevOverrides: (overrides: { stage?: number; money?: number }) => void;
  finishStage: (result: StageResult) => Promise<void>;
  gameOver: (playTime: number) => Promise<void>;
  openShop: (stage: number) => void;
  refreshShop: () => boolean;
  buyOffer: (slot: number) => boolean;
  buyDirect: (id: UpgradeId) => boolean;
  resetProgress: () => Promise<void>;
}

let purchaseNonce = 0;

export const useProgressStore = create<ProgressStore>((set, get) => ({
  progress: createNewProgress(),
  loaded: false,
  hasSave: false,
  shop: null,
  lastPurchase: null,
  load: async () => {
    const data = await repository.load();
    set({ progress: data?.progress ?? createNewProgress(), hasSave: data !== null, loaded: true });
  },
  newGame: async () => {
    set({ progress: createNewProgress(), shop: null });
    await get().persist();
  },
  persist: async () => {
    try {
      await repository.save(get().progress);
      set({ hasSave: true });
    } catch (error) {
      console.error('Save failed', error);
    }
  },
  applyDevOverrides: ({ stage, money }) =>
    set((s) => ({
      progress: {
        ...s.progress,
        currentStage: stage ?? s.progress.currentStage,
        highestStageReached: Math.max(s.progress.highestStageReached, stage ?? 1),
        money: money ?? s.progress.money,
      },
    })),
  finishStage: async (result) => {
    set({ progress: completeStage(get().progress, result) });
    await get().persist();
  },
  gameOver: async (playTime) => {
    set({ progress: recordGameOver(get().progress, playTime) });
    await get().persist();
  },
  openShop: (stage) => set({ shop: openShop(get().progress, stage, freshRng()), lastPurchase: null }),
  refreshShop: () => {
    const { shop, progress } = get();
    if (!shop) return false;
    const result = shopRefresh(progress, shop, freshRng());
    if (!result.ok) return false;
    set({ progress: result.progress, shop: result.shop });
    void get().persist();
    return true;
  },
  buyOffer: (slot) => {
    const { shop, progress } = get();
    if (!shop) return false;
    const id = shop.offers[slot];
    const result = shopBuy(progress, shop, slot, freshRng());
    if (!result.ok || !id) return false;
    set({ progress: result.progress, shop: result.shop, lastPurchase: { slot, id, nonce: ++purchaseNonce } });
    void get().persist();
    return true;
  },
  buyDirect: (id) => {
    const result = purchaseUpgrade(get().progress, id);
    if (!result.ok) return false;
    set({ progress: result.progress });
    void get().persist();
    return true;
  },
  resetProgress: async () => {
    await repository.clear();
    set({ progress: createNewProgress(), hasSave: false, shop: null });
  },
}));
