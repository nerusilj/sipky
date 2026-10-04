import { DEFAULT_NEXT_LEG_ORDER } from './x01.ts';
import type { NextLegOrder } from './x01.ts';

// Sestava poslední hry (hráči a pravidla), aby se nová hra předvyplnila.
export interface LastSetup { playerIds: string[]; randomOrder: boolean; legsToWin: number; doubleOut: boolean; nextLegOrder: NextLegOrder }

const KEY = 'sipky.lastGameSetup';
export const DEFAULT_SETUP: LastSetup = { playerIds: [], randomOrder: true, legsToWin: 1, doubleOut: true, nextLegOrder: DEFAULT_NEXT_LEG_ORDER };

export function parseLastSetup(json: string | null): LastSetup {
  try {
    const value = JSON.parse(json ?? 'null') as Partial<LastSetup> | null;
    if (!value || typeof value !== 'object') return DEFAULT_SETUP;
    return {
      playerIds: Array.isArray(value.playerIds) ? [...new Set(value.playerIds.filter((id): id is string => typeof id === 'string'))] : [],
      randomOrder: typeof value.randomOrder === 'boolean' ? value.randomOrder : DEFAULT_SETUP.randomOrder,
      // 0 = hra dokola, 1–5 = zápas na tolik vítězných legů.
      legsToWin: Number.isInteger(value.legsToWin) && value.legsToWin! >= 0 && value.legsToWin! <= 5 ? value.legsToWin! : DEFAULT_SETUP.legsToWin,
      doubleOut: typeof value.doubleOut === 'boolean' ? value.doubleOut : DEFAULT_SETUP.doubleOut,
      nextLegOrder: value.nextLegOrder === 'rotate' || value.nextLegOrder === 'loserFirst' ? value.nextLegOrder : DEFAULT_SETUP.nextLegOrder,
    };
  } catch { return DEFAULT_SETUP; }
}

export function loadLastSetup(): LastSetup {
  try { return parseLastSetup(localStorage.getItem(KEY)); } catch { return DEFAULT_SETUP; }
}

export function saveLastSetup(setup: LastSetup): void {
  try { localStorage.setItem(KEY, JSON.stringify(setup)); } catch { /* Sestava se jen nezapamatuje. */ }
}
