import type { CricketState } from '../game/cricket.ts';
import { cricketScore } from '../game/cricketPresentation.ts';
import { x01PlayerScore } from '../game/x01Presentation.ts';
import type { X01State } from '../game/x01.ts';
import type { Dart } from '../caller/visitTracker.ts';
import type { BoardPhase } from '../game/boardInput.ts';
import { BOARD_STATUS_TONES } from '../autodarts/boardStatus.ts';
import type { BoardStatusDisplay } from '../autodarts/boardStatus.ts';
import { EFFECT_IDS } from '../effects/effectRules.ts';
import type { ActiveEffect } from '../effects/effects.ts';
import type { ShooterState } from '../game/shooter.ts';
import { validShooterSettings } from '../game/shooter.ts';
import { shooterScore } from '../game/shooterPresentation.ts';
import type { ShooterClock } from '../game/shooterStore.ts';

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

export function shooterDisplay(state: ShooterState, clock: ShooterClock) {
  return { mode: 'shooter' as const, settings: state.settings, leg: 1, round: state.round, darts: state.visit, score: shooterScore(state), clock };
}

function validShooterDisplay(game: ReturnType<typeof shooterDisplay>): boolean {
  const { score, clock } = game;
  if (!validShooterSettings(game.settings) || !score || !validShooterSettings(score.settings) || !Array.isArray(score.players)
    || score.players.length < 1 || score.players.length > 8 || !score.players.every(p => p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.color === 'string')
    || !Number.isInteger(score.current) || score.current < 0 || score.current >= score.players.length || !Number.isSafeInteger(score.round) || score.round < 1
    || typeof score.finished !== 'boolean' || !Array.isArray(score.winners) || !score.winners.every(i => Number.isInteger(i) && i >= 0 && i < score.players.length)
    || !Array.isArray(score.targets) || score.targets.length !== 3 || !score.targets.every(n => Number.isInteger(n) && n >= 1 && n <= 20)
    || score.target !== undefined && (!Number.isInteger(score.target) || score.target < 1 || score.target > 20)
    || !Array.isArray(score.visit) || score.visit.length > 3 || !score.visit.every(d => d && typeof d.name === 'string' && Number.isInteger(d.number) && Number.isInteger(d.multiplier) && Number.isFinite(d.score))
    || !Array.isArray(score.hits) || score.hits.length !== score.visit.length || !score.hits.every(h => typeof h === 'boolean')
    || !score.visitResult || !Number.isInteger(score.visitResult.points) || score.visitResult.points < 0 || score.visitResult.points > 3
    || typeof score.visitResult.closed !== 'boolean' || typeof score.visitResult.checkout !== 'boolean') return false;
  for (const values of [score.points, score.attempts, score.dartsThrown]) {
    if (!Array.isArray(values) || values.length !== score.players.length || !values.every(n => Number.isSafeInteger(n) && n >= 0)) return false;
  }
  return !!clock && ['off', 'ready', 'countdown', 'running', 'paused', 'timeout', 'manual', 'offline', 'takeout', 'finished', 'blocked', 'bot'].includes(clock.phase)
    && Number.isFinite(clock.remainingMs) && clock.remainingMs >= 0 && clock.remainingMs <= 15000;
}

export type CastSnapshot = {
  venue: string;
  boardVisible: boolean;
  autodartsEnabled: boolean;
  boardStatus?: BoardStatusDisplay;
  effect?: ActiveEffect;
  lastEffect?: ActiveEffect;
  celebration?: number;
  game?: ReturnType<typeof x01Display> | ReturnType<typeof cricketDisplay> | ReturnType<typeof shooterDisplay>;
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
  for (const effect of [snapshot.effect, snapshot.lastEffect]) {
    if (effect !== undefined && (!effect || !EFFECT_IDS.includes(effect.id)
      || !Number.isSafeInteger(effect.key) || effect.key < 1)) return;
  }
  if (snapshot.celebration !== undefined
    && (!Number.isSafeInteger(snapshot.celebration) || snapshot.celebration < 0)) return;
  const game = snapshot.game;
  if (game && (!game.settings || !Array.isArray(game.darts) || !Number.isInteger(game.leg) || !Number.isInteger(game.round)
    || (game.mode === 'x01' ? !Array.isArray(game.players) || !game.visit
      : game.mode === 'cricket' ? !Array.isArray(game.score?.players)
      : game.mode === 'shooter' ? !validShooterDisplay(game) : true))) return;
  return message as CastMessage;
}
