import { DEFAULT_NEXT_LEG_ORDER, NO_ROUND_LIMIT } from './x01.ts';
import type { NextLegOrder } from './x01.ts';
import { isStartScore } from './startScores.ts';
import type { StartScore } from './startScores.ts';

// Sestava poslední hry (hráči a pravidla), aby se nová hra předvyplnila.
export interface LastSetup {
  startScore: StartScore;
  playerIds: string[]; randomOrder: boolean; legsToWin: number; doubleOut: boolean; nextLegOrder: NextLegOrder;
  maxRounds: number; minFinishers: number;
}

const KEY = 'sipky.lastGameSetup';
export const ROUND_LIMITS = [NO_ROUND_LIMIT, 10, 15, 20, 30];
export const DEFAULT_SETUP: LastSetup = {
  startScore: 501,
  playerIds: [], randomOrder: true, legsToWin: 1, doubleOut: true, nextLegOrder: DEFAULT_NEXT_LEG_ORDER, maxRounds: NO_ROUND_LIMIT, minFinishers: 1,
};

export function parseLastSetup(json: string | null): LastSetup {
  try {
    const value = JSON.parse(json ?? 'null') as Partial<LastSetup> | null;
    if (!value || typeof value !== 'object') return DEFAULT_SETUP;
    return {
      startScore: isStartScore(value.startScore) ? value.startScore : DEFAULT_SETUP.startScore,
      playerIds: Array.isArray(value.playerIds) ? [...new Set(value.playerIds.filter((id): id is string => typeof id === 'string'))] : [],
      randomOrder: typeof value.randomOrder === 'boolean' ? value.randomOrder : DEFAULT_SETUP.randomOrder,
      // 0 = hra dokola, 1–5 = zápas na tolik vítězných legů.
      legsToWin: Number.isInteger(value.legsToWin) && value.legsToWin! >= 0 && value.legsToWin! <= 5 ? value.legsToWin! : DEFAULT_SETUP.legsToWin,
      doubleOut: typeof value.doubleOut === 'boolean' ? value.doubleOut : DEFAULT_SETUP.doubleOut,
      nextLegOrder: value.nextLegOrder === 'rotate' || value.nextLegOrder === 'loserFirst' ? value.nextLegOrder : DEFAULT_SETUP.nextLegOrder,
      maxRounds: ROUND_LIMITS.includes(value.maxRounds as number) ? value.maxRounds! : DEFAULT_SETUP.maxRounds,
      minFinishers: Number.isInteger(value.minFinishers) && value.minFinishers! >= 1 && value.minFinishers! <= 7 ? value.minFinishers! : DEFAULT_SETUP.minFinishers,
    };
  } catch { return DEFAULT_SETUP; }
}

export function loadLastSetup(): LastSetup {
  try { return parseLastSetup(localStorage.getItem(KEY)); } catch { return DEFAULT_SETUP; }
}

export function saveLastSetup(setup: LastSetup): void {
  try { localStorage.setItem(KEY, JSON.stringify(setup)); } catch { /* Sestava se jen nezapamatuje. */ }
}
