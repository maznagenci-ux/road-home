import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DisplayCurrency = 'USD' | 'IQD';

interface FxState {
  usdToIqd: number;
  displayCurrency: DisplayCurrency;
  setUsdToIqd: (rate: number) => void;
  setDisplayCurrency: (c: DisplayCurrency) => void;
  toUsd: (iqd: number) => number;
  toIqd: (usd: number) => number;
}

export const useFxStore = create<FxState>()(
  persist(
    (set, get) => ({
      usdToIqd: 150_000,
      displayCurrency: 'IQD',
      setUsdToIqd: (usdToIqd) => set({ usdToIqd: Math.max(1, usdToIqd) }),
      setDisplayCurrency: (displayCurrency) => set({ displayCurrency }),
      toUsd: (iqd) => iqd / get().usdToIqd,
      toIqd: (usd) => usd * get().usdToIqd,
    }),
    { name: 'road-home-fx' },
  ),
);
