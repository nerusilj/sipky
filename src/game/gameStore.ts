import { useSyncExternalStore } from 'react';
import type { BoardEvent } from '../caller/visitTracker.ts';
import { celebrate } from '../effects/confetti.ts';
import { reactToVisit } from '../reactions.ts';
import { isConfettiActive } from '../settings.ts';
import { recorder } from '../recording.ts';
import { addDart, commitVisit, createGame, deriveState, setVisit, undo } from './x01.ts';
import type { Dart, GamePlayer, X01Game, X01Settings, X01State } from './x01.ts';

export interface GameSnapshot { game?: X01Game; state?: X01State }

// Rozehraná hra (jen v paměti); šipky přicházejí z terče nebo z ručního zadání.
let snapshot: GameSnapshot = {};
const listeners = new Set<() => void>();

function set(game: X01Game | undefined): void {
  snapshot = game ? { game, state: deriveState(game) } : {};
  listeners.forEach(listener => listener());
}

export function isGameRunning(): boolean {
  return snapshot.state !== undefined && snapshot.state.winner === undefined;
}

export function startGame(settings: X01Settings, players: GamePlayer[]): void {
  set(createGame(settings, players));
  recorder.meta('game-start', { ...settings, players: players.map(player => player.name) });
}

// Odveta: stejní hráči a pravidla, začíná další hráč v pořadí.
export function rematch(): void {
  if (!snapshot.game) return;
  const { settings, players } = snapshot.game;
  startGame(settings, [...players.slice(1), players[0]]);
}

export function endGame(): void {
  if (snapshot.game) recorder.meta('game-end', { winner: snapshot.state?.winner === undefined ? null : snapshot.game.players[snapshot.state.winner].name });
  set(undefined);
}

export function throwDart(dart: Dart): void {
  if (snapshot.game) set(addDart(snapshot.game, dart));
}

// Ruční zadání: uzavřené kolo (3 šipky, přehoz, zavření) se hned potvrdí; Zpět ho znovu otevře.
// Šipky z terče se potvrzují až kolem z terče (vytažení), aby nepřetekly do dalšího kola.
export function enterDart(dart: Dart): void {
  throwDart(dart);
  if (snapshot.game && snapshot.state?.visitResult.closed && snapshot.state.visit.length) commit(snapshot.game);
}

export function nextPlayer(): void {
  if (snapshot.game) commit(snapshot.game);
}

export function undoDart(): void {
  if (snapshot.game) set(undo(snapshot.game));
}

// Šipky z terče: každá šipka hned, kolo z terče (i s opravami) ho uzavře.
export function feedGameFromBoard(event: BoardEvent): void {
  if (!snapshot.game) return;
  if (event.kind === 'dart') throwDart(event.dart);
  else commit(setVisit(snapshot.game, event.darts));
}

// Uzavře kolo a na vyhodnocené kolo reaguje hlasatel a efekty (přehoz = 0 bodů).
function commit(game: X01Game): void {
  const before = deriveState(game).history.length;
  set(commitVisit(game));
  const record = snapshot.state?.history[before];
  if (!record) return;
  recorder.meta('game-visit', { player: snapshot.game!.players[record.player].name, darts: record.darts.map(dart => dart.name),
    scored: record.scored, bust: record.bust, checkout: record.checkout, remaining: record.remaining });
  reactToVisit({ kind: 'visit', darts: record.darts, total: record.scored });
  if (record.checkout && isConfettiActive()) celebrate(snapshot.state?.winner !== undefined ? 'match' : 'leg');
}

export function useGame(): GameSnapshot {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => snapshot);
}
