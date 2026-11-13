import { BotRunner } from './botRunner.ts';
import { botThrow, x01BotTarget } from './bots.ts';
import { useSyncExternalStore } from 'react';
import { BoardGameInput } from './boardInput.ts';
import type { BoardPhase } from './boardInput.ts';
import { bullThrowNeedsDistance, bullThrowRequiresTakeout } from './bullOffRanking.ts';
import { celebrate } from '../effects/confetti.ts';
import { reactToVisit } from '../reactions.ts';
import { isConfettiActive } from '../settings.ts';
import { recorder } from '../recording.ts';
import { addDart, bullThrowCorrection, cancelBullOff, commitVisit, confirmBullOffReview, correctBullRoundThrow, correctVisit, createGame, decideBullOff, deriveState, makeDart, startFinishBullOff, undo } from './x01.ts';
import type { BullOffReview, BullThrowChoice, Dart, GamePlayer, X01Game, X01Settings, X01State } from './x01.ts';
import { discardSavedGame } from './gamePersistence.ts';
import { caller } from '../caller/caller.ts';
import { LAST_DART_VISIBLE_MS, VisitCompletion } from './visitCompletion.ts';
import type { CompletionStage } from './visitCompletion.ts';
import { playerSpeech } from '../caller/playerSpeech.ts';
import { getCallerVoice } from '../settings.ts';

export interface GameSnapshot { game?: X01Game; state?: X01State; boardPhase?: BoardPhase; boardNotice?: string; completing?: CompletionStage; botPaused?: boolean; bullOffResultOpen?: boolean }

// Sdílená aplikace: hra existuje pouze v paměti aktuálního spuštění.
discardSavedGame();
const listeners = new Set<() => void>();
const boardInput = new BoardGameInput();
const completion = new VisitCompletion();
let completionStage: CompletionStage | undefined;
let bullAdvanceTimer: ReturnType<typeof setTimeout> | undefined;
const buffered: unknown[] = [];
// Hlášení po dohozu běží před vytažením, ale nepřepne hráče ani nezablokuje opravy z terče.
interface BoardSpeech { key: string; done: Promise<void>; cancel: () => void }
let boardSpeech: BoardSpeech | undefined;
let matchId = 0;
let bullOffResultOpen = false;
let snapshot: GameSnapshot = {};

const botRunner = new BotRunner(() => {
  const state = snapshot.state;
  if (!state || bullOffResultOpen || state.winner !== undefined || !state.players[state.current].bot || snapshot.completing) return;
  return { id: `${matchId}:${state.leg}:${state.current}:${state.history.length}${'bullOff' in state ? ':' + state.bullOff?.round + ':' + state.bullOff?.throws.length : ''}`, darts: state.visit.length, closed: state.visitResult.closed };
}, () => {
  const game = snapshot.game, state = snapshot.state;
  if (!game || !state || !state.players[state.current].bot) return;
  cancelBoardSpeech();
  const next = addDart(game, botThrow(x01BotTarget(state), state.players[state.current].bot!));
  set(next);
  announceMiss(next, next.current.at(-1)!); prepareBoardSpeech(next);
}, () => { if (snapshot.game) completeVisit(snapshot.game); });

function set(game: X01Game | undefined): void {
  const before = snapshot.state;
  snapshot = game ? { game, state: deriveState(game), boardPhase: boardInput.phase, boardNotice: boardInput.notice, completing: completionStage, botPaused: botRunner.paused, bullOffResultOpen } : {};
  listeners.forEach(listener => listener());
  botRunner.sync();
  // Oslava patří zavírací šipce, nikoli pozdějšímu potvrzení vytažením.
  const after = snapshot.state;
  if (before && after && before.players === after.players && after.visitResult.checkout
    && (!before.visitResult.checkout || before.leg !== after.leg || before.current !== after.current || before.history.length !== after.history.length)
    && isConfettiActive()) celebrate();
}

export function isGameRunning(): boolean {
  return snapshot.state !== undefined && snapshot.state.winner === undefined;
}

export function hasGame(): boolean { return snapshot.game !== undefined; }

export function startGame(settings: X01Settings, players: GamePlayer[]): void {
  cancelCompletion();
  matchId++;
  boardInput.begin();
  set(createGame(settings, players));
  players.filter(player => !player.bot).forEach(player => { void playerSpeech.prepare(player.name, getCallerVoice()); });
  announceCurrentPlayer(true);
  recorder.meta('game-start', { ...settings, players: players.map(player => player.name) });
}

// Odveta: stejní hráči a pravidla, začíná další hráč v pořadí.
export function rematch(): void {
  if (!snapshot.game) return;
  const { settings, players } = snapshot.game;
  startGame(settings, [...players.slice(1), players[0]]);
}

export function endGame(): void {
  cancelCompletion();
  if (snapshot.game) recorder.meta('game-end', { winner: snapshot.state?.winner === undefined ? null : snapshot.game.players[snapshot.state.winner].name });
  set(undefined);
}

export function throwDart(dart: Dart): void {
  if (bullOffResultOpen || completion.active) return;
  if (snapshot.game && !snapshot.state?.players[snapshot.state.current].bot) set(addDart(snapshot.game, dart));
}

// Ruční běžné kolo čeká na Další; zavření se po hlášení potvrdí automaticky.
// Šipky z terče se potvrzují až kolem z terče (vytažení), aby nepřetekly do dalšího kola.
export function enterDart(dart: Dart): void {
  if (bullOffResultOpen || completion.active || !snapshot.game || snapshot.state?.players[snapshot.state.current].bot) return;
  const next = addDart(snapshot.game, dart);
  if (next === snapshot.game) return;
  cancelBoardSpeech();
  boardInput.overrideDart(snapshot.game.current.length, dart);
  set(next);
  announceMiss(next, dart);
  prepareBoardSpeech(next);
  if (boardInput.phase === 'manual' && deriveState(next).visitResult.checkout) completeVisit(next);
}

export function replaceCurrentDart(index: number, dart: Dart): void {
  const game = snapshot.game;
  if (!game || bullOffResultOpen || completion.active || snapshot.state?.players[snapshot.state.current].bot || !Number.isInteger(index) || index < 0 || index >= game.current.length) return;
  const darts = [...game.current];
  darts[index] = dart;
  cancelBoardSpeech();
  boardInput.overrideDart(index, dart);
  const next = correctVisit(game, darts, false);
  set(next);
  announceMiss(next, dart);
  prepareBoardSpeech(next);
  if (boardInput.phase === 'manual' && deriveState(next).visitResult.checkout) completeVisit(next);
  recorder.meta('game-dart-correction', { index, dart: dart.name });
}

export function nextPlayer(): void {
  if (bullOffResultOpen) return;
  if (snapshot.state?.players[snapshot.state.current].bot) { if (botRunner.paused) { botRunner.resume(); set(snapshot.game); } return; }
  const dart = snapshot.state?.bullOff && snapshot.state.visit[0];
  if (dart && boardInput.hasPhysicalBullThrow && bullThrowRequiresTakeout(dart)) return;
  if (snapshot.game && !completion.active) completeVisit(snapshot.game);
}

export function undoDart(): 'manual' | 'board' | undefined {
  cancelCompletion();
  const game = snapshot.game;
  if (!game) return;
  const last = game.visits.at(-1);
  const cancellingBullOff = !game.current.length && last && !Array.isArray(last) && 'bullOff' in last;
  const reopeningBullOff = !game.current.length && last && !Array.isArray(last) && 'bullOffReview' in last;
  const next = undo(game);
  if (reopeningBullOff) bullOffResultOpen = true;
  const useBoard = cancellingBullOff || reopeningBullOff || !!deriveState(next).bullOff;
  if (useBoard) boardInput.begin();
  else boardInput.editManually();
  botRunner.pause(); set(next);
  return useBoard ? 'board' : 'manual';
}

export function correctGameVisit(darts: Dart[], last: boolean): void {
  if (!snapshot.game) return;
  const game = correctVisit(snapshot.game, darts, last);
  if (game === snapshot.game) return;
  cancelCompletion();
  if (last) boardInput.begin();
  else boardInput.editManually();
  set(game);
  recorder.meta('game-correction', { last, darts: darts.map(dart => dart.name) });
}

// Průběžné snapshoty umožňují opravit i třetí šipku, přehoz nebo zavření.
// Běžné kolo končí vyprázdněním terče, v rozhozu se čeká jen na vytažení BULLu a 25.
export function feedGameFromBoard(payload: unknown): void {
  if (bullOffResultOpen || snapshot.state?.players[snapshot.state.current].bot) { boardInput.handle(payload); return; }
  if (completion.active) {
    // V rozhozu další hráč hází až na výzvu. Případný další hod zatím jen zůstane v terči.
    if (snapshot.state?.bullOff) { boardInput.handle(payload); return; }
    if (payload && typeof payload === 'object' && 'type' in payload && payload.type === 'state') buffered.push(payload);
    return;
  }
  const previousDarts = snapshot.state?.visit.length ?? 0;
  const update = boardInput.handle(payload, snapshot.game);
  if (!snapshot.game) return;
  if (update.committed) { completeVisit(snapshot.game); return; }
  if (update.game !== snapshot.game || snapshot.boardPhase !== boardInput.phase || snapshot.boardNotice !== boardInput.notice) set(update.game);
  if (snapshot.state?.bullOff) {
    scheduleBullOffAdvance();
    return;
  }
  if (snapshot.game && snapshot.state && snapshot.state.visit.length > previousDarts) {
    announceMiss(snapshot.game, snapshot.state.visit.at(-1)!);
  }
  if (snapshot.game && boardInput.phase !== 'manual' && boardInput.phase !== 'blocked') prepareBoardSpeech(snapshot.game);
}

export function resetX01BoardInput(enabled: boolean): void {
  const game = snapshot.game;
  buffered.length = 0;
  clearTimeout(bullAdvanceTimer); bullAdvanceTimer = undefined;
  boardInput.resetPhysicalInput(!!game?.current.length, enabled);
  if (game) set(game);
}

function scheduleBullOffAdvance(): void {
  // Necháme terči krátký čas na opravu zásahu ještě před automatickým předáním tahu.
  if (bullAdvanceTimer !== undefined || !canAdvanceBullThrow()) return;
  bullAdvanceTimer = setTimeout(() => {
    bullAdvanceTimer = undefined;
    if (snapshot.game && canAdvanceBullThrow()) completeVisit(snapshot.game);
  }, LAST_DART_VISIBLE_MS);
}

function canAdvanceBullThrow(): boolean {
  const state = snapshot.state;
  const dart = state?.bullOff && state.visit[0];
  return !!dart && boardInput.hasPhysicalBullThrow && !bullThrowRequiresTakeout(dart)
    && !(state.bullOff?.ranking && bullThrowNeedsDistance(dart));
}

// Šipky rozpoznané až po přehozu nesmějí znovu spustit hlášení stejného kola.
const visitKey = (game: X01Game) => JSON.stringify([game.visits.length, deriveState(game).visit.map(({ name, number, multiplier, score, bouncer }) => [name, number, multiplier, score, bouncer])]);

function announceMiss(game: X01Game, dart: Dart): void {
  const state = deriveState(game);
  // V rozhozu je rozhodující vzdálenost, nikoli bodová hodnota zásahu.
  if (dart.score === 0 && !state.bullOff && !state.visitResult.bust) {
    void caller.enqueueTurnSound('miss', () => snapshot.game === game);
  }
}

async function announceVisit(game: X01Game, valid: () => boolean): Promise<void> {
  if (!valid()) return;
  const before = deriveState(game).history.length;
  const record = deriveState(commitVisit(game)).history[before];
  if (!record) return;
  if (record.bust) await caller.enqueueTurnSound('bust', valid);
  if (!valid()) return;
  const event = { kind: 'visit' as const, darts: record.darts, total: record.scored };
  if (record.bust) {
    // Přehoz má pouze tlumený zvuk, bez řeči, zábavného efektu a hlášení nuly.
    await caller.handle(event, false);
  } else await reactToVisit(event);
}

function prepareBoardSpeech(game: X01Game): void {
  const state = deriveState(game);
  if (!state.visit.length || !state.visitResult.closed) { cancelBoardSpeech(); return; }
  const key = visitKey(game);
  if (boardSpeech?.key === key) return;
  cancelBoardSpeech();
  let finish!: () => void;
  const done = new Promise<void>(resolve => { finish = resolve; });
  const pending: BoardSpeech = { key, done, cancel: () => { clearTimeout(timer); finish(); } };
  const timer = setTimeout(() => {
    void announceVisit(game, () => boardSpeech === pending).catch(() => undefined).finally(finish);
  }, LAST_DART_VISIBLE_MS);
  boardSpeech = pending;
}

function cancelBoardSpeech(): void {
  const pending = boardSpeech;
  boardSpeech = undefined;
  if (pending) { pending.cancel(); caller.stop(); }
}

// Uzavře kolo a na vyhodnocené kolo reaguje hlasatel a efekty (přehoz = 0 bodů).
function completeVisit(game: X01Game): void {
  clearTimeout(bullAdvanceTimer); bullAdvanceTimer = undefined;
  const before = deriveState(game).history.length;
  const next = commitVisit(game);
  if (next === game) return;
  const record = deriveState(next).history[before];
  const pending = boardSpeech?.key === visitKey(game) ? boardSpeech : undefined;
  if (!pending) cancelBoardSpeech();
  completion.run(async valid => {
    if (pending) await pending.done;
    else await announceVisit(game, valid);
  }, () => {
    boardSpeech = undefined;
    completionStage = undefined;
    botRunner.reset();
    const nextState = deriveState(next);
    const result = nextState.lastBullOffResult;
    bullOffResultOpen = !!result && result.leg !== deriveState(game).lastBullOffResult?.leg;
    const bullState = deriveState(game);
    if (bullState.bullOff && nextState.bullOff) boardInput.beginBullOffTurn();
    else boardInput.begin();
    set(next);
    if (bullState.bullOff && bullState.visit[0]) recorder.meta('game-bulloff-throw', { leg: bullState.leg, round: bullState.bullOff.round, player: game.players[bullState.current].name, dart: bullState.visit[0].name, distanceMm: bullState.visit[0].distance === undefined ? null : bullState.visit[0].distance * 170 });
    if (bullOffResultOpen && result) recorder.meta('game-bulloff-result', { leg: result.leg, places: result.places.map(p => game.players[p].name) });
    if (record) recorder.meta('game-visit', { player: next.players[record.player].name, darts: record.darts.map(dart => dart.name),
      leg: record.leg, round: record.round, scored: record.scored, bust: record.bust, checkout: record.checkout, remaining: record.remaining });
    buffered.splice(0).forEach(feedGameFromBoard);
    announceCurrentPlayer();
  }, stage => { completionStage = stage; set(game); });
}

function cancelCompletion(): void {
  clearTimeout(bullAdvanceTimer); bullAdvanceTimer = undefined;
  bullOffResultOpen = false;
  botRunner.reset();
  caller.cancelPlayer();
  cancelBoardSpeech();
  const active = completion.active;
  completion.cancel();
  completionStage = undefined;
  // Při zrušení zachovat fyzický stav terče, ale nezapsat čekající hody.
  buffered.splice(0).forEach(payload => boardInput.handle(payload));
  if (active) caller.stop();
}

export function finishLegByBullOff(): boolean {
  const game = snapshot.game;
  if (!game || completion.active || bullOffResultOpen) return false;
  const next = startFinishBullOff(game);
  if (next === game) return false;
  cancelCompletion(); boardInput.begin(); set(next); announceCurrentPlayer();
  recorder.meta('game-bulloff-start', { leg: snapshot.state?.leg });
  return true;
}

export function continueAfterBullOff(review?: BullOffReview): void {
  const { game, state } = snapshot;
  if (!bullOffResultOpen || !game || !state?.lastBullOffResult) return;
  const next = review ? confirmBullOffReview(game, review) : game;
  if (review && next === game) return;
  if (review) recorder.meta('game-bulloff-review', { leg: state.lastBullOffResult.leg,
    places: review.places.map(p => game.players[p].name), corrections: review.corrections.map(({ player, choice }) => ({ player: game.players[player].name, choice })) });
  bullOffResultOpen = false; boardInput.begin(); set(next); announceCurrentPlayer();
}

export function cancelGameBullOff(): void {
  const { game, state } = snapshot;
  if (!game || !state?.bullOff) return;
  const next = cancelBullOff(game);
  cancelCompletion();
  boardInput.begin();
  set(next);
  recorder.meta('game-bulloff-cancel', { leg: state.leg });
  announceCurrentPlayer();
}

export function markBullOffMiss(): void {
  const { game, state } = snapshot;
  if (!game || !state?.bullOff || state.visit.length || state.players[state.current].bot || completion.active || boardInput.phase !== 'ready') return;
  completeVisit(addDart(game, makeDart(0, 0)));
}

export function correctBullOffThrow(player: number, round: number, choice: BullThrowChoice): boolean {
  const { game, state } = snapshot;
  if (!game || state?.bullOff?.round !== round || completion.active) return false;
  if (state.current === player && state.visit.length && !state.players[player].bot) {
    replaceCurrentDart(0, bullThrowCorrection(choice));
    scheduleBullOffAdvance();
    return true;
  }
  const next = correctBullRoundThrow(game, player, choice);
  if (next === game) return false;
  set(next);
  recorder.meta('game-bulloff-correction', { leg: state.leg, round, player: game.players[player].name, dart: choice });
  return true;
}

// Ruční rozhodnutí rozhozu na střed (klepnutím na vítěze).
export function decideBullOffWinner(player: number): void {
  if (!snapshot.game) return;
  cancelCompletion();
  boardInput.begin();
  set(decideBullOff(snapshot.game, player));
  announceCurrentPlayer();
  recorder.meta('game-bulloff-decision', { player: snapshot.game.players[player].name });
}

export function useGame(): GameSnapshot {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => snapshot);
}

export function getGameSnapshot(): GameSnapshot { return snapshot; }

function announceCurrentPlayer(gameStart = false): void {
  caller.cancelPlayer();
  const state = snapshot.state;
  if (!state || bullOffResultOpen || state.winner !== undefined || state.visit.length || snapshot.completing) return;
  const players = state.players, leg = state.leg, player = state.current, visits = state.history.length;
  const bullRound = state.bullOff?.round, bullThrows = state.bullOff?.throws.length;
  const announcement = caller.enqueuePlayer(players[player].bot ? undefined : players[player].name, () => {
    const current = snapshot.state;
    return !!current && current.players === players && current.leg === leg && current.current === player
      && current.history.length === visits && current.bullOff?.round === bullRound && current.bullOff?.throws.length === bullThrows
      && current.winner === undefined && !current.visit.length && !snapshot.completing;
  }, gameStart);
  botRunner.waitFor(announcement);
}
