import { makeDart } from './x01.ts';
import type { Dart, GamePlayer } from './x01.ts';

export interface ShooterSettings { finish: 'rounds' | 'race'; rounds: 5 | 10 | 15; seconds: 0 | 10 | 15 }
export const DEFAULT_SHOOTER_SETTINGS: ShooterSettings = { finish: 'rounds', rounds: 10, seconds: 0 };
export interface ShooterDart extends Dart { timeout?: true; skipped?: true }
export interface ShooterGame { settings: ShooterSettings; players: GamePlayer[]; seed: number; visits: ShooterDart[][]; current: ShooterDart[] }
export interface ShooterVisit { player: number; round: number; darts: ShooterDart[]; targets: number[]; hits: boolean[]; points: number }
export interface ShooterState {
  settings: ShooterSettings; players: GamePlayer[]; round: number; current: number;
  points: number[]; attempts: number[]; dartsThrown: number[]; history: ShooterVisit[];
  visit: ShooterDart[]; targets: number[]; hits: boolean[]; target?: number;
  visitResult: { points: number; closed: boolean; checkout: boolean };
  finished: boolean; winners: number[]; winner?: number;
}

export function validShooterSettings(value: unknown): value is ShooterSettings {
  const s = value as Partial<ShooterSettings> | null;
  return !!s && (s.finish === 'rounds' || s.finish === 'race')
    && [5, 10, 15].includes(s.rounds!) && [0, 10, 15].includes(s.seconds!);
}

export function createShooter(settings: ShooterSettings, players: GamePlayer[], seed = Math.floor(Math.random() * 0x100000000)): ShooterGame {
  if (!validShooterSettings(settings)) throw new Error('Neplatná pravidla Shooteru.');
  if (!players.length || players.length > 8 || new Set(players.map(p => p.id)).size !== players.length) throw new Error('Vyberte jednoho až osm různých hráčů.');
  if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Neplatný los hry.');
  return { settings: { ...settings }, players: [...players], seed, visits: [], current: [] };
}

// Los je součást záznamu. Replay, oprava šipky ani Zpět nikdy nepřelosují ukázané cíle.
export function shooterTargets(seed: number, visit: number): number[] {
  let value = seed >>> 0, previous = 0;
  const result: number[] = [];
  for (let i = 0; i < (visit + 1) * 3; i++) {
    value = (value + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(value ^ value >>> 15, value | 1);
    mixed ^= mixed + Math.imul(mixed ^ mixed >>> 7, mixed | 61);
    const random = ((mixed ^ mixed >>> 14) >>> 0) / 0x100000000;
    const choice = 1 + Math.floor(random * (previous ? 19 : 20));
    const target = previous && choice >= previous ? choice + 1 : choice;
    previous = target;
    if (i >= visit * 3) result.push(target);
  }
  return result;
}

export const shooterMiss = (reason?: 'timeout' | 'skipped'): ShooterDart => ({ ...makeDart(0, 0), ...(reason ? { [reason]: true as const } : {}) });
export const shooterDartLabel = (dart: ShooterDart) => dart.timeout ? 'ČAS' : dart.skipped ? '—' : dart.name === 'M' ? 'MIMO' : dart.name;
export function shooterHit(dart: ShooterDart, target: number): boolean {
  return !dart.timeout && !dart.skipped && !dart.bouncer && dart.number === target
    && [1, 2, 3].includes(dart.multiplier) && dart.score === target * dart.multiplier;
}

export function deriveShooter(game: ShooterGame): ShooterState {
  const { players, settings } = game;
  const state: ShooterState = {
    settings, players, round: 1, current: 0, points: players.map(() => 0), attempts: players.map(() => 0),
    dartsThrown: players.map(() => 0), history: [], visit: [], targets: [], hits: [],
    visitResult: { points: 0, closed: false, checkout: false }, finished: false, winners: [],
  };
  const play = (darts: readonly ShooterDart[], index: number): ShooterVisit => {
    const targets = shooterTargets(game.seed, index);
    const record: ShooterVisit = { player: state.current, round: state.round, darts: [], targets, hits: [], points: 0 };
    for (const dart of darts.slice(0, 3)) {
      const hit = shooterHit(dart, targets[record.darts.length]);
      record.darts.push(dart); record.hits.push(hit); record.points += Number(hit);
      state.points[state.current] += Number(hit); state.attempts[state.current]++;
      if (!dart.timeout && !dart.skipped) state.dartsThrown[state.current]++;
      if (settings.finish === 'race' && state.points[state.current] >= 15) break;
    }
    return record;
  };
  for (const darts of game.visits) {
    const record = play(darts, state.history.length);
    state.history.push(record);
    const raceWon = settings.finish === 'race' && state.points[state.current] >= 15;
    if (raceWon || settings.finish === 'rounds' && state.history.length >= settings.rounds * players.length) {
      state.finished = true;
      const high = Math.max(...state.points);
      state.winners = raceWon ? [state.current] : state.points.flatMap((points, i) => points === high ? [i] : []);
      state.winner = state.winners[0];
      state.visit = record.darts; state.targets = record.targets; state.hits = record.hits;
      state.visitResult = { points: record.points, closed: true, checkout: raceWon };
      return state;
    }
    state.current = state.history.length % players.length;
    state.round = Math.floor(state.history.length / players.length) + 1;
  }
  const live = play(game.current, state.history.length);
  const checkout = settings.finish === 'race' && state.points[state.current] >= 15;
  state.visit = live.darts; state.targets = live.targets; state.hits = live.hits;
  state.visitResult = { points: live.points, closed: checkout || live.darts.length === 3, checkout };
  state.target = state.visitResult.closed ? undefined : live.targets[live.darts.length];
  return state;
}

export function setShooterVisit(game: ShooterGame, darts: readonly ShooterDart[]): ShooterGame {
  if (deriveShooter(game).finished) return game;
  return { ...game, current: darts.slice(0, 3) };
}
export function addShooterDart(game: ShooterGame, dart: ShooterDart): ShooterGame {
  const state = deriveShooter(game);
  return state.finished || state.visitResult.closed ? game : setShooterVisit(game, [...game.current, dart]);
}
export function commitShooterVisit(game: ShooterGame): ShooterGame {
  const state = deriveShooter(game);
  if (state.finished) return game;
  const darts = [...state.visit];
  if (!state.visitResult.checkout) while (darts.length < 3) darts.push(shooterMiss('skipped'));
  return { ...game, visits: [...game.visits, darts], current: [] };
}
export function undoShooter(game: ShooterGame): ShooterGame {
  if (game.current.length) return { ...game, current: game.current.slice(0, -1) };
  return game.visits.length ? { ...game, visits: game.visits.slice(0, -1), current: game.visits.at(-1)!.slice(0, -1) } : game;
}
