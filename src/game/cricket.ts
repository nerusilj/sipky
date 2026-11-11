import type { Dart, GamePlayer } from './x01.ts';
import { DARTS_PER_VISIT } from './x01.ts';

export const CRICKET_TARGETS = [20, 19, 18, 17, 16, 15, 25] as const;
export interface CricketSettings { legsToWin: number }
export interface CricketGame { settings: CricketSettings; players: GamePlayer[]; visits: Dart[][]; current: Dart[] }
export interface CricketVisit { player: number; leg: number; round: number; darts: Dart[]; marks: number; scored: number; checkout: boolean; closed: boolean }
export interface CricketState {
  settings: CricketSettings; players: GamePlayer[]; leg: number; round: number; order: number[]; current: number;
  marks: number[][]; points: number[]; legsWon: number[]; history: CricketVisit[];
  visit: Dart[]; visitResult: { marks: number; scored: number; checkout: boolean; closed: boolean };
  winner?: number; lastLegWinner?: number;
}

export function createCricket(settings: CricketSettings, players: GamePlayer[]): CricketGame {
  if (!Number.isInteger(settings.legsToWin) || settings.legsToWin < 0 || settings.legsToWin > 5) throw new Error('Neplatný počet legů.');
  if (!players.length || players.length > 8 || new Set(players.map(player => player.id)).size !== players.length) throw new Error('Vyberte jednoho až osm různých hráčů.');
  return { settings: { ...settings }, players: [...players], visits: [], current: [] };
}

export function deriveCricket(game: CricketGame): CricketState {
  const { settings, players } = game;
  const freshMarks = () => players.map(() => CRICKET_TARGETS.map(() => 0));
  const state: CricketState = {
    settings, players, leg: 1, round: 1, order: players.map((_, i) => i), current: 0,
    marks: freshMarks(), points: players.map(() => 0), legsWon: players.map(() => 0), history: [], visit: [],
    visitResult: { marks: 0, scored: 0, checkout: false, closed: false },
  };
  const play = (input: readonly Dart[]): CricketVisit => {
    const player = state.current;
    const result: CricketVisit = { player, leg: state.leg, round: state.round, darts: [], marks: 0, scored: 0, checkout: false, closed: false };
    for (const dart of input.slice(0, DARTS_PER_VISIT)) {
      result.darts.push(dart);
      const target = CRICKET_TARGETS.findIndex(number => number === dart.number);
      const valid = !dart.bouncer && dart.score > 0 && Number.isInteger(dart.multiplier)
        && dart.multiplier >= 1 && dart.multiplier <= (dart.number === 25 ? 2 : 3);
      if (target >= 0 && valid && !state.marks.every(marks => marks[target] === 3)) {
        const before = state.marks[player][target];
        const closing = Math.min(3 - before, dart.multiplier);
        state.marks[player][target] += closing;
        const scoring = players.some((_, i) => i !== player && state.marks[i][target] < 3);
        result.marks += scoring ? dart.multiplier : closing;
        if (scoring) {
          const scored = (dart.multiplier - closing) * CRICKET_TARGETS[target];
          state.points[player] += scored; result.scored += scored;
        }
      }
      if (state.marks[player].every(marks => marks === 3) && state.points.every(points => points <= state.points[player])) {
        result.checkout = true; break;
      }
    }
    result.closed = result.checkout || result.darts.length >= DARTS_PER_VISIT;
    return result;
  };
  for (const input of game.visits) {
    if (state.winner !== undefined) break;
    const record = play(input);
    state.history.push(record);
    if (record.checkout) {
      state.legsWon[state.current]++;
      state.lastLegWinner = state.current;
      if (settings.legsToWin > 0 && state.legsWon[state.current] >= settings.legsToWin) { state.winner = state.current; break; }
      state.leg++; state.round = 1;
      state.order = [...state.order.slice(1), state.order[0]];
      state.current = state.order[0]; state.marks = freshMarks(); state.points = players.map(() => 0);
    } else {
      const index = state.order.indexOf(state.current) + 1;
      state.current = state.order[index % state.order.length];
      if (index === state.order.length) state.round++;
    }
  }
  if (state.winner === undefined) {
    const live = play(game.current); state.visit = live.darts; state.visitResult = live;
  }
  return state;
}

export function addCricketDart(game: CricketGame, dart: Dart): CricketGame {
  const state = deriveCricket(game);
  if (state.winner !== undefined || state.visitResult.closed) return game;
  return { ...game, current: [...game.current, dart] };
}
export function setCricketVisit(game: CricketGame, darts: readonly Dart[]): CricketGame {
  if (deriveCricket(game).winner !== undefined) return game;
  return { ...game, current: darts.slice(0, DARTS_PER_VISIT) };
}
export function commitCricketVisit(game: CricketGame): CricketGame {
  const state = deriveCricket(game);
  if (state.winner !== undefined) return game;
  return { ...game, visits: [...game.visits, state.visit], current: [] };
}
export function undoCricket(game: CricketGame): CricketGame {
  if (game.current.length) return { ...game, current: game.current.slice(0, -1) };
  if (!game.visits.length) return game;
  return { ...game, visits: game.visits.slice(0, -1), current: game.visits.at(-1)!.slice(0, -1) };
}
export function cricketTotals(state: CricketState, player: number, leg?: number) {
  const totals = state.history.filter(visit => visit.player === player && (leg === undefined || visit.leg === leg)).reduce((sum, visit) => ({
    marks: sum.marks + visit.marks, points: sum.points + visit.scored, darts: sum.darts + (visit.checkout ? visit.darts.length : 3),
  }), { marks: 0, points: 0, darts: 0 });
  if (state.winner === undefined && state.current === player && (leg === undefined || state.leg === leg)) {
    totals.marks += state.visitResult.marks; totals.points += state.visitResult.scored; totals.darts += state.visit.length;
  }
  return { ...totals, mpr: totals.darts ? totals.marks / totals.darts * 3 : 0 };
}
