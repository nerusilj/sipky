// Hra X01 (501/301): čistá logika bez UI. Stav se vždy dopočítá z odehraných kol (replay),
// takže krok zpět je jen odebrání poslední šipky.
import type { Dart } from '../caller/visitTracker.ts';

export type { Dart };
// legsToWin: kolik vyhraných legů ukončí zápas; ENDLESS = hra dokola (legy se počítají, zápas nekončí).
export interface X01Settings { startScore: 301 | 501; doubleOut: boolean; legsToWin: number }
export const ENDLESS = 0;
export const isEndless = (settings: X01Settings) => settings.legsToWin === ENDLESS;
export interface GamePlayer { id: string; name: string; color: string }

export interface VisitResult { scored: number; bust: boolean; checkout: boolean; closed: boolean; remaining: number }
export interface VisitRecord extends VisitResult { player: number; leg: number; darts: Dart[]; remainingBefore: number }

export interface X01State {
  settings: X01Settings;
  players: GamePlayer[];
  leg: number;             // číslo legu od 1
  legStarter: number;      // index hráče, který leg začínal
  current: number;         // index hráče na řadě
  remaining: number[];
  legsWon: number[];
  visit: Dart[];           // rozehrané kolo hráče na řadě
  visitResult: VisitResult;
  history: VisitRecord[];  // všechna dokončená kola
  dartsThrown: number[];   // pro průměr: šipky a body za celý zápas
  pointsScored: number[];
  winner?: number;
  lastLegWinner?: number;
}

export interface X01Game { settings: X01Settings; players: GamePlayer[]; visits: Dart[][]; current: Dart[] }

export const DARTS_PER_VISIT = 3;

export function makeDart(number: number, multiplier: number): Dart {
  if (multiplier === 0 || number === 0) return { name: 'M', number: 0, multiplier: 0, score: 0 };
  if (number === 25) return multiplier === 2 ? { name: 'Bull', number: 25, multiplier: 2, score: 50 } : { name: '25', number: 25, multiplier: 1, score: 25 };
  return { name: `${'SDT'[multiplier - 1]}${number}`, number, multiplier, score: number * multiplier };
}

export function dartLabel(dart: Dart): string {
  if (dart.multiplier === 0) return 'Mimo';
  if (dart.number === 25) return dart.multiplier === 2 ? 'Bull' : '25';
  return `${'SDT'[dart.multiplier - 1]}${dart.number}`;
}

const isDouble = (dart: Dart) => dart.multiplier === 2;

// Vyhodnotí kolo pro zbývající skóre: přehoz (pod nulou, zbytek 1 u Double Out, nula bez doublu) nebo zavření.
export function evaluateVisit(remaining: number, darts: readonly Dart[], doubleOut: boolean): VisitResult {
  let left = remaining;
  for (let i = 0; i < Math.min(darts.length, DARTS_PER_VISIT); i++) {
    const next = left - darts[i].score;
    if (next < 0 || (doubleOut && next === 1) || (next === 0 && doubleOut && !isDouble(darts[i]))) {
      return { scored: 0, bust: true, checkout: false, closed: true, remaining };
    }
    if (next === 0) return { scored: remaining, bust: false, checkout: true, closed: true, remaining: 0 };
    left = next;
  }
  return { scored: remaining - left, bust: false, checkout: false, closed: darts.length >= DARTS_PER_VISIT, remaining: left };
}

// Šipky po ukončení kola (přehoz, zavření, třetí šipka) se ignorují.
function usedDarts(remaining: number, darts: readonly Dart[], doubleOut: boolean): Dart[] {
  const used: Dart[] = [];
  for (const dart of darts) {
    used.push(dart);
    if (evaluateVisit(remaining, used, doubleOut).closed) break;
  }
  return used;
}

export function createGame(settings: X01Settings, players: GamePlayer[]): X01Game {
  if (!players.length) throw new Error('Hra potřebuje alespoň jednoho hráče.');
  if (!Number.isInteger(settings.legsToWin) || settings.legsToWin < ENDLESS) throw new Error('Neplatný počet legů.');
  return { settings, players, visits: [], current: [] };
}

// Dopočítá celý stav ze seznamu dokončených kol a rozehraného kola.
export function deriveState(game: X01Game): X01State {
  const { settings, players } = game;
  const n = players.length;
  const s: X01State = {
    settings, players, leg: 1, legStarter: 0, current: 0,
    remaining: players.map(() => settings.startScore), legsWon: players.map(() => 0),
    visit: [], visitResult: evaluateVisit(settings.startScore, [], settings.doubleOut), history: [],
    dartsThrown: players.map(() => 0), pointsScored: players.map(() => 0),
  };
  for (const visit of game.visits) {
    if (s.winner !== undefined) break;
    const p = s.current, before = s.remaining[p];
    const darts = usedDarts(before, visit, settings.doubleOut);
    const result = evaluateVisit(before, darts, settings.doubleOut);
    s.history.push({ ...result, player: p, leg: s.leg, darts, remainingBefore: before });
    // Průměr: zavírací kolo počítá skutečně hozené šipky, každé jiné kolo tři.
    s.dartsThrown[p] += result.checkout ? darts.length : DARTS_PER_VISIT;
    s.pointsScored[p] += result.scored;
    s.remaining[p] = result.remaining;
    if (result.checkout) {
      s.legsWon[p]++;
      s.lastLegWinner = p;
      if (!isEndless(settings) && s.legsWon[p] >= settings.legsToWin) { s.winner = p; break; }
      s.leg++;
      s.legStarter = (s.legStarter + 1) % n;
      s.current = s.legStarter;
      s.remaining = players.map(() => settings.startScore);
    } else {
      s.current = (p + 1) % n;
    }
  }
  if (s.winner === undefined) {
    s.visit = usedDarts(s.remaining[s.current], game.current, settings.doubleOut);
    s.visitResult = evaluateVisit(s.remaining[s.current], s.visit, settings.doubleOut);
  }
  return s;
}

// Přidá šipku do rozehraného kola; po přehozu, zavření nebo třetí šipce už nic nepřidá.
export function addDart(game: X01Game, dart: Dart): X01Game {
  const state = deriveState(game);
  if (state.winner !== undefined || state.visitResult.closed) return game;
  return { ...game, current: [...game.current, dart] };
}

// Nahradí rozehrané kolo šipkami z terče (zahrnuje i opravené šipky).
export function setVisit(game: X01Game, darts: readonly Dart[]): X01Game {
  if (deriveState(game).winner !== undefined) return game;
  return { ...game, current: darts.slice(0, DARTS_PER_VISIT) };
}

// Ukončí kolo (vytažení šipek / Další hráč); prázdné kolo = bez skóre.
export function commitVisit(game: X01Game): X01Game {
  const state = deriveState(game);
  if (state.winner !== undefined) return game;
  return { ...game, visits: [...game.visits, state.visit], current: [] };
}

// Krok zpět: odebere poslední šipku, případně znovu otevře předchozí kolo.
export function undo(game: X01Game): X01Game {
  if (game.current.length) return { ...game, current: game.current.slice(0, -1) };
  if (!game.visits.length) return game;
  const last = game.visits[game.visits.length - 1];
  return { ...game, visits: game.visits.slice(0, -1), current: last.slice(0, -1) };
}

// Průměr na 3 šipky (jako v aplikacích pro šipky).
export function threeDartAverage(state: X01State, player: number): number {
  return state.dartsThrown[player] ? state.pointsScored[player] / state.dartsThrown[player] * DARTS_PER_VISIT : 0;
}
