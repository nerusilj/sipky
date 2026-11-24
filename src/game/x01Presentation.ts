import { suggestCheckout, suggestCheckoutSetup } from './checkout.ts';
import { DARTS_PER_VISIT, ENDLESS, legDartNumber, legThreeDartAverage, playerDisplayedLegsWon, playerFinishPlace } from './x01.ts';
import type { X01State } from './x01.ts';

export type X01VisitState = Pick<X01State, 'winner' | 'lastLegByBullOff' | 'history' | 'visitResult' | 'bullOff'>;

export function legsText(n: number): string {
  if (n === ENDLESS) return 'Hra dokola';
  return n === 1 ? 'Na 1 vítězný leg' : n < 5 ? `Na ${n} vítězné legy` : `Na ${n} vítězných legů`;
}

// Česky: 1 leg, 2–4 legy, 0 a 5+ legů.
export function legCount(n: number): string {
  return `${n} ${n === 1 ? 'leg' : n >= 2 && n <= 4 ? 'legy' : 'legů'}`;
}

export function x01PlayerScore(state: X01State, index: number) {
  const player = state.players[index];
  const active = index === state.current && state.winner === undefined && !state.bullOff;
  const busted = active && state.visitResult.bust;
  const place = playerFinishPlace(state, index);
  const legsWon = playerDisplayedLegsWon(state, index);
  const remaining = active ? state.visitResult.remaining : state.remaining[index];
  const dartsLeft = active ? DARTS_PER_VISIT - state.visit.length : DARTS_PER_VISIT;
  const canSuggest = active && state.settings.doubleOut && !state.visitResult.closed;
  const checkout = canSuggest ? suggestCheckout(remaining, dartsLeft, player.preferredDouble) : undefined;
  // Žlutá smí navázat jen na zelený dohoz v tomto kole. Pokud existuje
  // dohoz po dílčím hodu, existoval i na začátku kola s těmito hody před ním.
  const checkoutSetup = canSuggest && state.settings.checkoutSetupEnabled !== false && !checkout && state.visit.length > 0
    && suggestCheckout(state.remaining[index], DARTS_PER_VISIT, player.preferredDouble)
    ? suggestCheckoutSetup(remaining, dartsLeft, player.preferredDouble) : undefined;
  let lastVisit;
  if (!active) {
    for (let i = state.history.length - 1; i >= 0; i--) {
      const visit = state.history[i];
      if (visit.leg < state.leg) break;
      if (visit.player === index) { lastVisit = visit; break; }
    }
  }
  // Aktivní hráč začíná vždy prázdným pruhem, předchozí kolo zůstává jen u čekajících hráčů.
  const shownDarts = active ? state.visit : lastVisit?.darts ?? [];
  const visitTotal = active ? state.visitResult.scored : lastVisit?.scored ?? 0;
  const visitBusted = active ? state.visitResult.bust : lastVisit?.bust ?? false;
  const dartNumber = legDartNumber(state, index);
  const legAverage = legThreeDartAverage(state, index).toFixed(1).replace('.', ',');
  return { index, player, active, busted, place, legsWon, remaining, shownDarts, visitTotal,
    visitBusted, dartNumber, legAverage, checkout, checkoutSetup, winner: state.winner === index };
}
