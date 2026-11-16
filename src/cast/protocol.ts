import type { CricketState } from '../game/cricket.ts';
import { cricketScore } from '../game/cricketPresentation.ts';
import { x01PlayerScore } from '../game/x01Presentation.ts';
import type { X01State } from '../game/x01.ts';
import type { Dart } from '../caller/visitTracker.ts';
import type { BoardPhase } from '../game/boardInput.ts';
import { BOARD_STATUS_TONES } from '../autodarts/boardStatus.ts';
import type { BoardStatusDisplay } from '../autodarts/boardStatus.ts';

export const CAST_NAMESPACE = 'urn:x-cast:cz.sipky.scoreboard.v1';
export const CAST_PROTOCOL = 1;

export type BullOffDisplay = Pick<X01State, 'players' | 'current' | 'visit' | 'bullOff'>;
export type BullOffResultsDisplay = Pick<X01State, 'players' | 'winner' | 'lastBullOffResult'>;

export function x01Display(state: X01State, resultOpen: boolean, phase?: BoardPhase, busy = false) {
  const last = state.history[state.history.length - 1];
  const bull = state.bullOff;
  const result = resultOpen ? state.lastBullOffResult : undefined;
  const resultHits = result?.rounds.flat() ?? [];
  return {
    mode: 'x01' as const,
    settings: state.settings, leg: result?.leg ?? state.leg, round: state.round,
    finishersNeeded: state.finishersNeeded,
    players: state.order.map(index => x01PlayerScore(state, index)),
    visit: {
      winner: state.winner, lastLegByBullOff: state.lastLegByBullOff, visitResult: state.visitResult,
      history: state.winner !== undefined && last ? [last] : [],
    },
    darts: state.visit,
    bull: bull ? {
      state: { players: state.players, current: state.current, visit: state.visit,
        bullOff: { ...bull, previous: bull.previous.slice(0, 1) } },
      phase, busy,
    } : undefined,
    result: result ? {
      players: state.players, winner: state.winner,
      lastBullOffResult: {
        ...result,
        // Ponech poslední hody i těm, kteří už v závěrečných rozstřelech neházeli.
        rounds: [result.places.flatMap(player => resultHits.filter(hit => hit.player === player).slice(-3))],
      },
    } : undefined,
  };
}

export function cricketDisplay(state: CricketState, current?: Dart[]) {
  const last = state.winner !== undefined ? state.history[state.history.length - 1] : undefined;
  return {
    mode: 'cricket' as const,
    settings: state.settings, leg: state.leg, round: state.round,
    score: cricketScore(state), winner: state.winner,
    darts: state.winner !== undefined ? last?.darts ?? [] : current ?? state.visit,
    marks: last?.marks ?? state.visitResult.marks,
    points: last?.scored ?? state.visitResult.scored,
  };
}

export type CastSnapshot = {
  venue: string;
  boardVisible: boolean;
  autodartsEnabled: boolean;
  boardStatus?: BoardStatusDisplay;
  game?: ReturnType<typeof x01Display> | ReturnType<typeof cricketDisplay>;
};

export type CastMessage =
  | { v: typeof CAST_PROTOCOL; type: 'state'; seq: number; snapshot: CastSnapshot }
  | { v: typeof CAST_PROTOCOL; type: 'offline'; seq: number };

export function readCastMessage(data: unknown): CastMessage | undefined {
  if (typeof data !== 'object' || data === null) return;
  const message = data as Partial<CastMessage>;
  if (message.v !== CAST_PROTOCOL || !Number.isSafeInteger(message.seq) || (message.seq ?? 0) < 1) return;
  if (message.type === 'offline') return message as CastMessage;
  if (message.type !== 'state') return;
  const snapshot = message.snapshot;
  if (!snapshot || typeof snapshot.venue !== 'string' || typeof snapshot.boardVisible !== 'boolean'
    || typeof snapshot.autodartsEnabled !== 'boolean') return;
  const boardStatus = snapshot.boardStatus;
  if (boardStatus !== undefined && (!boardStatus || typeof boardStatus.label !== 'string'
    || !BOARD_STATUS_TONES.includes(boardStatus.tone))) return;
  const game = snapshot.game;
  if (game && (!game.settings || !Array.isArray(game.darts) || !Number.isInteger(game.leg) || !Number.isInteger(game.round)
    || (game.mode === 'x01' ? !Array.isArray(game.players) || !game.visit
      : game.mode === 'cricket' ? !Array.isArray(game.score?.players) : true))) return;
  return message as CastMessage;
}
