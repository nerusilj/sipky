import { compareBullThrows, rankBullRound, bullThrowNeedsDistance } from './bullOffRanking.ts';
import type { BullRanking, BullThrow } from './bullOffRanking.ts';
export { compareBullThrows } from './bullOffRanking.ts';
export type { BullThrow } from './bullOffRanking.ts';
import type { BotLevel } from './bots.ts';
import type { AvatarId } from '../players/avatars.ts';
// Hra X01: čistá logika bez UI. Stav se vždy dopočítá z odehraných kol (replay),
// takže krok zpět je jen odebrání poslední šipky.
import type { Dart } from '../caller/visitTracker.ts';
import { isStartScore } from './startScores.ts';
import type { StartScore } from './startScores.ts';

export type { Dart };
// legsToWin: kolik vyhraných legů ukončí zápas; ENDLESS = hra dokola (legy se počítají, zápas nekončí).
// nextLegOrder: pořadí v dalším legu – 'loserFirst' = první hází ten s nejvyšším zbytkem, vítěz poslední;
// 'rotate' = stejné pořadí, začíná další hráč.
// maxRounds: nejvýš tolik kol na leg (0 = bez limitu); pak další místo rozhodne rozhoz na střed.
// minFinishers: leg končí, až zavře tolik hráčů (1 = klasika); leg vyhrává první, kdo zavřel.
export type NextLegOrder = 'loserFirst' | 'rotate';
export interface X01Settings {
  startScore: StartScore; doubleOut: boolean; legsToWin: number;
  nextLegOrder?: NextLegOrder; maxRounds?: number; minFinishers?: number;
}
export const ENDLESS = 0;
export const NO_ROUND_LIMIT = 0;
export const DEFAULT_NEXT_LEG_ORDER: NextLegOrder = 'loserFirst';
export const isEndless = (settings: X01Settings) => settings.legsToWin === ENDLESS;
export interface GamePlayer { id: string; name: string; color: string; avatarId?: AvatarId; bot?: BotLevel }

export interface VisitResult { scored: number; bust: boolean; checkout: boolean; closed: boolean; remaining: number }
export interface VisitRecord extends VisitResult { player: number; leg: number; round: number; darts: Dart[]; remainingBefore: number }

// Rozhoz na střed: každý ze soupeřů hodí jednu šipku, při shodě házejí znovu jen remizující.
export interface BullOff { round: number; contenders: number[]; throws: BullThrow[]; previous: BullThrow[][]; ranking?: BullRanking }
export interface BullOffResult { leg: number; places: number[]; closedPlayers: number[]; rounds: BullThrow[][] }
export const BULL_THROW_CHOICES = ['BULL', '25', 'MIMO'] as const;
export type BullThrowChoice = typeof BULL_THROW_CHOICES[number];
export interface BullOffReview { places: number[]; corrections: { player: number; choice: BullThrowChoice }[] }

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
  lastBullOffResult?: BullOffResult;
}

// Medaile je vidět už po zavírací šipce; potvrzení kola dál čeká na vytažení.
export function playerFinishPlace(state: X01State, player: number): number | undefined {
  const confirmed = state.finished.indexOf(player);
  if (confirmed >= 0) return confirmed + 1;
  if (state.winner === undefined && !state.bullOff && state.current === player && state.visitResult.checkout) return state.finished.length + 1;
  return undefined;
}

// Zobrazí vítězi i právě rozehraný leg, který se do výsledku zápasu zapíše až po dohrání.
export function playerDisplayedLegsWon(state: X01State, player: number): number {
  const wins = state.legsWon[player];
  return state.winner === undefined && playerFinishPlace(state, player) === 1 ? wins + 1 : wins;
}

// Kolik hráčů musí zavřít: 1 až počet hráčů − 1 (poslední by házel sám).
export function finishersNeeded(settings: X01Settings, playerCount: number): number {
  return Math.max(1, Math.min(settings.minFinishers ?? 1, playerCount - 1));
}

// Záznam hry: kola šipek, nebo ruční rozhodnutí rozhozu (vítěz určený klepnutím).
export type GameEntry = Dart[] | { decide: number } | { bullOff: true } | { cancelBullOff: true } | { bullOffReview: BullOffReview };
export interface X01Game { settings: X01Settings; players: GamePlayer[]; visits: GameEntry[]; current: Dart[] }

export const DARTS_PER_VISIT = 3;
const isDecision = (entry: GameEntry): entry is { decide: number } => !Array.isArray(entry) && 'decide' in entry;

export function makeDart(number: number, multiplier: number): Dart {
  if (multiplier === 0 || number === 0) return { name: 'M', number: 0, multiplier: 0, score: 0 };
  if (number === 25) return multiplier === 2 ? { name: 'Bull', number: 25, multiplier: 2, score: 50 } : { name: '25', number: 25, multiplier: 1, score: 25 };
  return { name: `${'SDT'[multiplier - 1]}${number}`, number, multiplier, score: number * multiplier };
}

export function bullThrowCorrection(choice: BullThrowChoice): Dart {
  if (choice === 'MIMO') return makeDart(0, 0);
  return makeDart(25, choice === 'BULL' ? 2 : 1);
}

function reviewedBullOff(result: BullOffResult, review: BullOffReview): BullOffResult | undefined {
  const { places, corrections } = review;
  if (places.length !== result.places.length || new Set(places).size !== places.length
    || !places.every(p => result.places.includes(p)) || !result.closedPlayers.every((p, i) => places[i] === p)) return;
  const fixes = new Map(corrections.map(({ player, choice }) => [player, choice]));
  if (fixes.size !== corrections.length || corrections.some(({ player, choice }) =>
    !places.includes(player) || result.closedPlayers.includes(player) || !BULL_THROW_CHOICES.includes(choice))) return;
  const rounds = [...result.rounds].reverse().map(round => round.map(hit => {
    const choice = fixes.get(hit.player);
    if (!choice) return hit;
    fixes.delete(hit.player);
    return { ...hit, dart: bullThrowCorrection(choice) };
  })).reverse();
  if (fixes.size) return;
  return { ...result, places: [...places], rounds };
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
  if (!isStartScore(settings.startScore)) throw new Error('Neplatné počáteční skóre.');
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
  let beforeBullOff: (Pick<X01State, 'current' | 'round' | 'finished'> & { automatic: boolean }) | undefined;
  let automaticBullOffCancelled = false;
  const open = () => s.order.filter(p => !s.finished.includes(p));

  const endLeg = () => {
    const first = s.finished[0];
    s.legsWon[first]++;
    s.lastLegWinner = first;
    s.lastLegPlaces = [...s.finished];
    s.lastLegByBullOff = !!beforeBullOff;
    beforeBullOff = undefined;
    s.bullOff = undefined;
    if (!isEndless(settings) && s.legsWon[first] >= settings.legsToWin) { s.winner = first; return; }
    s.leg++; s.round = 1; automaticBullOffCancelled = false;
    s.order = nextLegOrder(s.order, s.remaining, settings.nextLegOrder ?? DEFAULT_NEXT_LEG_ORDER, s.finished);
    s.finished = [];
    s.current = s.order[0];
    s.remaining = players.map(() => settings.startScore);
  };
  const startBullOff = (automatic: boolean) => {
    beforeBullOff ??= { current: s.current, round: s.round, finished: [...s.finished], automatic };
    if (automatic) s.round = maxRounds;
    s.bullOff = { round: 1, contenders: open(), throws: [], previous: [],
      ranking: automatic ? undefined : { ordered: [], pending: [], results: [] } };
    s.current = s.bullOff.contenders[0];
  };
  // Hráč zavřel (nebo vyhrál rozhoz): když už zavřel potřebný počet, leg končí. Vrací true, pokud leg skončil.
  const finish = (p: number): boolean => {
    s.finished.push(p);
    if (s.finished.length >= s.finishersNeeded) { endLeg(); return true; }
    return false;
  };

  for (const [index, entry] of game.visits.entries()) {
    if (s.winner !== undefined) break;
    if (!Array.isArray(entry) && 'bullOffReview' in entry) continue;
    if (!Array.isArray(entry) && 'cancelBullOff' in entry) {
      if (s.bullOff && beforeBullOff) {
        s.current = beforeBullOff.current;
        s.round = beforeBullOff.round;
        s.finished = beforeBullOff.finished;
        automaticBullOffCancelled ||= beforeBullOff.automatic;
        s.bullOff = undefined;
        beforeBullOff = undefined;
      }
      continue;
    }
    if (!Array.isArray(entry) && 'bullOff' in entry) {
      if (!s.bullOff && open().length >= 2) startBullOff(false);
      continue;
    }
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
        if (bullOff.ranking) {
          const ranked = rankBullRound(bullOff.ranking, bullOff.throws);
          const rounds = [...bullOff.previous, bullOff.throws];
          if (ranked.next) {
            s.bullOff = { round: bullOff.round + 1, contenders: ranked.next, throws: [], previous: rounds, ranking: ranked.ranking };
            s.current = ranked.next[0];
          } else {
            const closedPlayers = [...s.finished];
            const result = { leg: s.leg, places: [...closedPlayers, ...ranked.ranking.ordered], closedPlayers, rounds };
            const review = game.visits[index + 1];
            const corrected = review && 'bullOffReview' in review ? reviewedBullOff(result, review.bullOffReview) : undefined;
            s.lastBullOffResult = corrected ?? result;
            s.finished = [...s.lastBullOffResult.places];
            endLeg();
          }
          continue;
        }
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
      if (!finish(decided)) startBullOff(true);
      continue;
    }
    if (!Array.isArray(entry)) continue;
    const p = s.current, before = s.remaining[p];
    const darts = usedDarts(before, entry, settings.doubleOut);
    const result = evaluateVisit(before, darts, settings.doubleOut);
    s.history.push({ ...result, player: p, leg: s.leg, round: s.round, darts, remainingBefore: before });
    // Průměr: zavírací kolo počítá skutečně hozené šipky, každé jiné kolo tři.
    s.dartsThrown[p] += result.checkout ? darts.length : DARTS_PER_VISIT;
    s.pointsScored[p] += result.scored;
    s.remaining[p] = result.remaining;
    if (result.checkout && finish(p)) continue;
    // Další hráč, který ještě nezavřel; přechod přes konec pořadí = nové kolo.
    const position = s.order.indexOf(p);
    const count = s.order.length;
    const step = Array.from({ length: count }, (_, k) => k + 1).find(k => !s.finished.includes(s.order[(position + k) % count]))!;
    s.current = s.order[(position + step) % count];
    if (position + step >= count) {
      s.round++;
      if (!automaticBullOffCancelled && maxRounds !== NO_ROUND_LIMIT && s.round > maxRounds) {
        // Limit kol vyčerpán: další místo rozhodne rozhoz na střed mezi těmi, kdo nezavřeli.
        startBullOff(true);
      }
    }
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

// Opravit lze rozehrané nebo poslední dokončené kolo, i vítěznou šipku.
// Zbytek zápasu se znovu dopočítá, žádné skóre se neopravuje ručně.
export function correctVisit(game: X01Game, darts: readonly Dart[], last: boolean): X01Game {
  if (!last) return setVisit(game, darts);
  const entry = game.visits.at(-1);
  if (!Array.isArray(entry) || game.current.length) return game;
  return { ...game, visits: [...game.visits.slice(0, -1), darts.slice(0, DARTS_PER_VISIT)] };
}

// Ukončí kolo (vytažení šipek / Další hráč); prázdné kolo = bez skóre (v rozhozu = mimo).
export function commitVisit(game: X01Game): X01Game {
  const state = deriveState(game);
  if (state.winner !== undefined || (state.bullOff?.ranking && state.visit[0] && bullThrowNeedsDistance(state.visit[0]))) return game;
  return { ...game, visits: [...game.visits, state.visit], current: [] };
}

// Ruční ukončení aktuálního legu rozhozem; rozehrané kolo se musí nejprve dokončit.
export function startFinishBullOff(game: X01Game): X01Game {
  const state = deriveState(game);
  if (state.winner !== undefined || state.bullOff || game.current.length || state.order.filter(p => !state.finished.includes(p)).length < 2) return game;
  return { ...game, visits: [...game.visits, { bullOff: true }], current: [] };
}

export function cancelBullOff(game: X01Game): X01Game {
  if (!deriveState(game).bullOff) return game;
  return { ...game, visits: [...game.visits, { cancelBullOff: true }], current: [] };
}

// Dokud probíhá stejné kolo rozhozu, změna jednoho hodu nemění, kdo házel následující šipky.
export function correctBullRoundThrow(game: X01Game, player: number, choice: BullThrowChoice): X01Game {
  const bull = deriveState(game).bullOff;
  if (!bull) return game;
  const position = bull.throws.findIndex(hit => hit.player === player);
  if (position < 0) return game;
  const index = game.visits.length - bull.throws.length + position;
  if (!Array.isArray(game.visits[index])) return game;
  const visits = [...game.visits];
  visits[index] = [bullThrowCorrection(choice)];
  return { ...game, visits };
}

export function confirmBullOffReview(game: X01Game, review: BullOffReview): X01Game {
  if (game.current.length || !Array.isArray(game.visits.at(-1))) return game;
  const result = deriveState(game).lastBullOffResult;
  if (!result || !reviewedBullOff(result, review)) return game;
  // Úprava patří přímo za poslední hod rozhozu, před první hod následujícího legu.
  const previous = deriveState({ ...game, visits: game.visits.slice(0, -1) }).lastBullOffResult;
  if (previous?.leg === result.leg) return game;
  return { ...game, visits: [...game.visits, { bullOffReview: review }] };
}

// Ruční rozhodnutí rozhozu na střed: vítězem legu je zvolený hráč (jen během rozhozu).
export function decideBullOff(game: X01Game, player: number): X01Game {
  const state = deriveState(game);
  if (!state.bullOff || state.bullOff.ranking || !state.bullOff.contenders.includes(player)) return game;
  return { ...game, visits: [...game.visits, { decide: player }], current: [] };
}

// Krok zpět: odebere poslední šipku, případně znovu otevře předchozí kolo nebo zruší ruční rozhodnutí.
export function undo(game: X01Game): X01Game {
  if (game.current.length) return { ...game, current: game.current.slice(0, -1) };
  if (!game.visits.length) return game;
  const last = game.visits[game.visits.length - 1];
  return { ...game, visits: game.visits.slice(0, -1), current: Array.isArray(last) ? last.slice(0, -1) : [] };
}

// Součty za zápas včetně rozehraného kola, společné pro kartu i dialog statistik.
export function playerTotals(state: X01State, player: number, leg?: number): { darts: number; points: number } {
  // Zahrne rozehrané kolo. Přehoz ruší jeho body a počítá celou návštěvu;
  // zavření i rozehraný běžný hod počítají skutečný počet dosavadních šipek.
  const completed = leg === undefined ? { darts: state.dartsThrown[player], points: state.pointsScored[player] }
    : state.history.filter(visit => visit.player === player && visit.leg === leg).reduce((sum, visit) => ({
      darts: sum.darts + (visit.checkout ? visit.darts.length : DARTS_PER_VISIT), points: sum.points + visit.scored,
    }), { darts: 0, points: 0 });
  const live = player === state.current && state.winner === undefined && !state.bullOff && state.visit.length > 0 && (leg === undefined || leg === state.leg);
  const darts = completed.darts + (live ? state.visitResult.bust ? DARTS_PER_VISIT : state.visit.length : 0);
  const points = completed.points + (live ? state.visitResult.scored : 0);
  return { darts, points };
}

// Průměr na 3 šipky (jako v aplikacích pro šipky).
export function threeDartAverage(state: X01State, player: number): number {
  const { darts, points } = playerTotals(state, player);
  return darts ? points / darts * DARTS_PER_VISIT : 0;
}

export function legThreeDartAverage(state: X01State, player: number): number {
  const { darts, points } = playerTotals(state, player, state.leg);
  return darts ? points / darts * DARTS_PER_VISIT : 0;
}

// Počet skutečně hozených šipek v legu včetně rozehraného kola. Rozhoz sem nepatří.
export function legDartNumber(state: X01State, player: number): number {
  const completed = state.history.filter(visit => visit.player === player && visit.leg === state.leg)
    .reduce((total, visit) => total + visit.darts.length, 0);
  const active = player === state.current && state.winner === undefined && !state.bullOff;
  return completed + (active ? state.visit.length : 0);
}
