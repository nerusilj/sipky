// Hra X01 (501/301): čistá logika bez UI. Stav se vždy dopočítá z odehraných kol (replay),
// takže krok zpět je jen odebrání poslední šipky.
import type { Dart } from '../caller/visitTracker.ts';

export type { Dart };
// legsToWin: kolik vyhraných legů ukončí zápas; ENDLESS = hra dokola (legy se počítají, zápas nekončí).
// nextLegOrder: pořadí v dalším legu – 'loserFirst' = první hází ten s nejvyšším zbytkem, vítěz poslední;
// 'rotate' = stejné pořadí, začíná další hráč.
// maxRounds: nejvýš tolik kol na leg (0 = bez limitu); pak další místo rozhodne rozhoz na střed.
// minFinishers: leg končí, až zavře tolik hráčů (1 = klasika); leg vyhrává první, kdo zavřel.
export type NextLegOrder = 'loserFirst' | 'rotate';
export interface X01Settings {
  startScore: 301 | 501; doubleOut: boolean; legsToWin: number;
  nextLegOrder?: NextLegOrder; maxRounds?: number; minFinishers?: number;
}
export const ENDLESS = 0;
export const NO_ROUND_LIMIT = 0;
export const DEFAULT_NEXT_LEG_ORDER: NextLegOrder = 'loserFirst';
export const isEndless = (settings: X01Settings) => settings.legsToWin === ENDLESS;
export interface GamePlayer { id: string; name: string; color: string }

export interface VisitResult { scored: number; bust: boolean; checkout: boolean; closed: boolean; remaining: number }
export interface VisitRecord extends VisitResult { player: number; leg: number; darts: Dart[]; remainingBefore: number }

// Rozhoz na střed: každý ze soupeřů hodí jednu šipku, při shodě házejí znovu jen remizující.
export interface BullThrow { player: number; dart: Dart }
export interface BullOff { round: number; contenders: number[]; throws: BullThrow[]; previous: BullThrow[][] }

export interface X01State {
  settings: X01Settings;
  players: GamePlayer[];
  leg: number;             // číslo legu od 1
  round: number;           // číslo kola v legu od 1 (kolo = jedna návštěva každého hráče)
  order: number[];         // pořadí házení v tomto legu (indexy hráčů), order[0] leg začínal
  current: number;         // index hráče na řadě
  remaining: number[];
  legsWon: number[];
  visit: Dart[];           // rozehrané kolo hráče na řadě
  visitResult: VisitResult;
  history: VisitRecord[];  // všechna dokončená kola (bez hodů rozhozu)
  dartsThrown: number[];   // pro průměr: šipky a body za celý zápas
  pointsScored: number[];
  finished: number[];      // kdo už v tomto legu zavřel (pořadí = umístění)
  finishersNeeded: number; // kolik hráčů musí zavřít, než leg skončí
  bullOff?: BullOff;       // probíhající rozhoz na střed
  winner?: number;
  lastLegWinner?: number;
  lastLegPlaces?: number[];
  lastLegByBullOff?: boolean;
}

// Kolik hráčů musí zavřít: 1 až počet hráčů − 1 (poslední by házel sám).
export function finishersNeeded(settings: X01Settings, playerCount: number): number {
  return Math.max(1, Math.min(settings.minFinishers ?? 1, playerCount - 1));
}

// Záznam hry: kola šipek, nebo ruční rozhodnutí rozhozu (vítěz určený klepnutím).
export type GameEntry = Dart[] | { decide: number };
export interface X01Game { settings: X01Settings; players: GamePlayer[]; visits: GameEntry[]; current: Dart[] }

export const DARTS_PER_VISIT = 3;
const isDecision = (entry: GameEntry): entry is { decide: number } => !Array.isArray(entry);

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

// Pořadí šipky v rozhozu (menší = blíž středu): bull, pak 25, pak ostatní podle vzdálenosti, pokud ji terč poslal.
export function compareBullThrows(a: Dart, b: Dart): number {
  const tier = (dart: Dart) => dart.score === 50 ? 0 : dart.number === 25 ? 1 : 2;
  const byTier = tier(a) - tier(b);
  if (byTier || tier(a) < 2 || a.distance === undefined || b.distance === undefined) return byTier;
  return a.distance - b.distance;
}

export function createGame(settings: X01Settings, players: GamePlayer[]): X01Game {
  if (!players.length) throw new Error('Hra potřebuje alespoň jednoho hráče.');
  if (!Number.isInteger(settings.legsToWin) || settings.legsToWin < ENDLESS) throw new Error('Neplatný počet legů.');
  if (settings.maxRounds !== undefined && (!Number.isInteger(settings.maxRounds) || settings.maxRounds < NO_ROUND_LIMIT)) throw new Error('Neplatný limit kol.');
  return { settings, players, visits: [], current: [] };
}

// Pořadí v dalším legu. 'loserFirst': nejdřív kdo nezavřel, od nejvyššího zbytku (při shodě dosavadní pořadí),
// pak kdo zavřel, v obráceném pořadí umístění – vítěz legu hází poslední. 'rotate': stejné pořadí, začíná další.
export function nextLegOrder(order: readonly number[], remaining: readonly number[], mode: NextLegOrder, finished: readonly number[] = []): number[] {
  if (mode === 'rotate') return [...order.slice(1), order[0]];
  const open = order.filter(p => !finished.includes(p)).sort((a, b) => remaining[b] - remaining[a] || order.indexOf(a) - order.indexOf(b));
  return [...open, ...[...finished].reverse()];
}

// Dopočítá celý stav ze seznamu dokončených kol a rozehraného kola.
export function deriveState(game: X01Game): X01State {
  const { settings, players } = game;
  const n = players.length;
  const maxRounds = settings.maxRounds ?? NO_ROUND_LIMIT;
  const s: X01State = {
    settings, players, leg: 1, round: 1, order: players.map((_, i) => i), current: 0,
    remaining: players.map(() => settings.startScore), legsWon: players.map(() => 0),
    visit: [], visitResult: evaluateVisit(settings.startScore, [], settings.doubleOut), history: [],
    dartsThrown: players.map(() => 0), pointsScored: players.map(() => 0),
    finished: [], finishersNeeded: finishersNeeded(settings, n),
  };
  let legHadBullOff = false;
  const open = () => s.order.filter(p => !s.finished.includes(p));

  const endLeg = () => {
    const first = s.finished[0];
    s.legsWon[first]++;
    s.lastLegWinner = first;
    s.lastLegPlaces = [...s.finished];
    s.lastLegByBullOff = legHadBullOff;
    s.bullOff = undefined;
    if (!isEndless(settings) && s.legsWon[first] >= settings.legsToWin) { s.winner = first; return; }
    s.leg++; s.round = 1; legHadBullOff = false;
    s.order = nextLegOrder(s.order, s.remaining, settings.nextLegOrder ?? DEFAULT_NEXT_LEG_ORDER, s.finished);
    s.finished = [];
    s.current = s.order[0];
    s.remaining = players.map(() => settings.startScore);
  };
  const startBullOff = () => {
    legHadBullOff = true;
    s.bullOff = { round: 1, contenders: open(), throws: [], previous: [] };
    s.current = s.bullOff.contenders[0];
  };
  // Hráč zavřel (nebo vyhrál rozhoz): když už zavřel potřebný počet, leg končí. Vrací true, pokud leg skončil.
  const finish = (p: number): boolean => {
    s.finished.push(p);
    if (s.finished.length >= s.finishersNeeded) { endLeg(); return true; }
    return false;
  };

  for (const entry of game.visits) {
    if (s.winner !== undefined) break;
    const bullOff = s.bullOff;
    if (bullOff) {
      let decided: number | undefined;
      if (isDecision(entry)) {
        if (!bullOff.contenders.includes(entry.decide)) continue;
        decided = entry.decide;
      } else {
        bullOff.throws.push({ player: s.current, dart: entry[0] ?? makeDart(0, 0) });
        const next = bullOff.contenders.indexOf(s.current) + 1;
        if (next < bullOff.contenders.length) { s.current = bullOff.contenders[next]; continue; }
        const best = [...bullOff.throws].sort((a, b) => compareBullThrows(a.dart, b.dart))[0].dart;
        const tied = bullOff.throws.filter(t => compareBullThrows(t.dart, best) === 0).map(t => t.player);
        if (tied.length > 1) {
          // Shoda: znovu házejí jen remizující.
          bullOff.previous.push(bullOff.throws);
          s.bullOff = { round: bullOff.round + 1, contenders: tied, throws: [], previous: bullOff.previous };
          s.current = tied[0];
          continue;
        }
        decided = tied[0];
      }
      // Rozhoz určil další místo; chybí-li ještě zavřít další hráči, rozhoduje nový rozhoz mezi zbylými.
      s.bullOff = undefined;
      if (!finish(decided)) startBullOff();
      continue;
    }
    if (isDecision(entry)) continue;
    const p = s.current, before = s.remaining[p];
    const darts = usedDarts(before, entry, settings.doubleOut);
    const result = evaluateVisit(before, darts, settings.doubleOut);
    s.history.push({ ...result, player: p, leg: s.leg, darts, remainingBefore: before });
    // Průměr: zavírací kolo počítá skutečně hozené šipky, každé jiné kolo tři.
    s.dartsThrown[p] += result.checkout ? darts.length : DARTS_PER_VISIT;
    s.pointsScored[p] += result.scored;
    s.remaining[p] = result.remaining;
    if (result.checkout && finish(p)) continue;
    // Další hráč, který ještě nezavřel; přechod přes konec pořadí = nové kolo.
    const position = s.order.indexOf(p);
    const step = Array.from({ length: n }, (_, k) => k + 1).find(k => !s.finished.includes(s.order[(position + k) % n]))!;
    if (position + step >= n) {
      s.round++;
      if (maxRounds !== NO_ROUND_LIMIT && s.round > maxRounds) {
        // Limit kol vyčerpán: další místo rozhodne rozhoz na střed mezi těmi, kdo nezavřeli.
        s.round = maxRounds;
        startBullOff();
        continue;
      }
    }
    s.current = s.order[(position + step) % n];
  }
  if (s.winner === undefined) {
    if (s.bullOff) {
      s.visit = game.current.slice(0, 1);
      s.visitResult = { scored: 0, bust: false, checkout: false, closed: s.visit.length > 0, remaining: s.remaining[s.current] };
    } else {
      s.visit = usedDarts(s.remaining[s.current], game.current, settings.doubleOut);
      s.visitResult = evaluateVisit(s.remaining[s.current], s.visit, settings.doubleOut);
    }
  }
  return s;
}

// Přidá šipku do rozehraného kola; po přehozu, zavření nebo třetí šipce (v rozhozu po první) už nic nepřidá.
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

// Ukončí kolo (vytažení šipek / Další hráč); prázdné kolo = bez skóre (v rozhozu = mimo).
export function commitVisit(game: X01Game): X01Game {
  const state = deriveState(game);
  if (state.winner !== undefined) return game;
  return { ...game, visits: [...game.visits, state.visit], current: [] };
}

// Ruční rozhodnutí rozhozu na střed: vítězem legu je zvolený hráč (jen během rozhozu).
export function decideBullOff(game: X01Game, player: number): X01Game {
  const state = deriveState(game);
  if (!state.bullOff || !state.bullOff.contenders.includes(player)) return game;
  return { ...game, visits: [...game.visits, { decide: player }], current: [] };
}

// Krok zpět: odebere poslední šipku, případně znovu otevře předchozí kolo nebo zruší ruční rozhodnutí.
export function undo(game: X01Game): X01Game {
  if (game.current.length) return { ...game, current: game.current.slice(0, -1) };
  if (!game.visits.length) return game;
  const last = game.visits[game.visits.length - 1];
  return { ...game, visits: game.visits.slice(0, -1), current: isDecision(last) ? [] : last.slice(0, -1) };
}

// Průměr na 3 šipky (jako v aplikacích pro šipky).
export function threeDartAverage(state: X01State, player: number): number {
  return state.dartsThrown[player] ? state.pointsScored[player] / state.dartsThrown[player] * DARTS_PER_VISIT : 0;
}
