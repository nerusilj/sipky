import { BotRunner } from './botRunner.ts';
import { botThrow, cricketBotTarget } from './bots.ts';
import { useSyncExternalStore } from 'react';
import { BoardGameInput } from './boardInput.ts';
import type { BoardPhase } from './boardInput.ts';
import { addCricketDart, commitCricketVisit, createCricket, deriveCricket, setCricketVisit, undoCricket } from './cricket.ts';
import type { CricketGame, CricketSettings, CricketState } from './cricket.ts';
import type { Dart, GamePlayer } from './x01.ts';
import { caller } from '../caller/caller.ts';
import { playerSpeech } from '../caller/playerSpeech.ts';
import { celebrate } from '../effects/confetti.ts';
import { getCallerVoice, isConfettiActive } from '../settings.ts';
import { recorder } from '../recording.ts';
import { LAST_DART_VISIBLE_MS, VisitCompletion } from './visitCompletion.ts';
import type { CompletionStage } from './visitCompletion.ts';

interface CricketSnapshot { game?: CricketGame; state?: CricketState; boardPhase?: BoardPhase; boardNotice?: string; completing?: CompletionStage; botPaused?: boolean }
const board = new BoardGameInput<CricketGame>({ commit: commitCricketVisit, setVisit: setCricketVisit, status: deriveCricket });
const completion = new VisitCompletion();
const listeners = new Set<() => void>();
const buffered: unknown[] = [];
let stage: CompletionStage | undefined;
let matchId = 0;
let snapshot: CricketSnapshot = {};

const botRunner = new BotRunner(() => {
  const state = snapshot.state;
  if (!state || state.winner !== undefined || !state.players[state.current].bot || snapshot.completing) return;
  return { id: `${matchId}:${state.leg}:${state.current}:${state.history.length}`, darts: state.visit.length, closed: state.visitResult.closed };
}, () => {
  const game = snapshot.game, state = snapshot.state;
  if (!game || !state || !state.players[state.current].bot) return;
  cancelSpeech();
  const next = addCricketDart(game, botThrow(cricketBotTarget(state), state.players[state.current].bot!));
  set(next);
  miss(next, next.current.at(-1)!); prepareSpeech(next);
}, () => { if (snapshot.game) finish(snapshot.game); });
let speech: { key: string; done: Promise<void>; cancel: () => void } | undefined;
const key = (game: CricketGame) => JSON.stringify([game.visits.length, game.current.map(({ name, number, multiplier, score, bouncer }) => [name, number, multiplier, score, bouncer])]);
function set(game?: CricketGame) {
  const before = snapshot.state;
  const after = game ? deriveCricket(game) : undefined;
  snapshot = game ? { game, state: after, boardPhase: board.phase, boardNotice: board.notice, completing: stage, botPaused: botRunner.paused } : {};
  listeners.forEach(listener => listener());
  botRunner.sync();
  if (before && after && before.players === after.players && after.visitResult.checkout
    && (!before.visitResult.checkout || before.leg !== after.leg || before.current !== after.current || before.history.length !== after.history.length)
    && isConfettiActive()) celebrate();
}
function cancelSpeech() { const old = speech; speech = undefined; if (old) { old.cancel(); caller.stop(); } }
function cancelCompletion() {
  botRunner.reset();
  caller.cancelPlayer(); cancelSpeech(); const active = completion.active; completion.cancel(); stage = undefined;
  buffered.splice(0).forEach(payload => board.handle(payload));
  if (active) caller.stop();
}
export function startCricket(settings: CricketSettings, players: GamePlayer[]) {
  cancelCompletion(); matchId++; board.begin(); set(createCricket(settings, players));
  players.filter(player => !player.bot).forEach(player => { void playerSpeech.prepare(player.name, getCallerVoice()); });
  announcePlayer(true); recorder.meta('cricket-start', { settings, players: players.map(player => player.name) });
}
export function endCricket() { cancelCompletion(); if (snapshot.game) recorder.meta('cricket-end', { winner: snapshot.state?.winner ?? null }); set(); }
export function hasCricket() { return !!snapshot.game; }
export function isCricketRunning() { return !!snapshot.state && snapshot.state.winner === undefined; }
export function rematchCricket() {
  if (!snapshot.game) return;
  const { settings, players } = snapshot.game;
  startCricket(settings, [...players.slice(1), players[0]]);
}
export function enterCricketDart(dart: Dart) {
  const game = snapshot.game; if (!game || completion.active || snapshot.state?.players[snapshot.state.current].bot) return;
  const next = addCricketDart(game, dart); if (next === game) return;
  cancelSpeech(); board.overrideDart(game.current.length, dart); set(next); miss(next, dart); prepareSpeech(next);
  if (board.phase === 'manual' && snapshot.state?.visitResult.checkout) finish(next);
}
export function replaceCricketDart(index: number, dart: Dart) {
  const game = snapshot.game; if (!game || completion.active || snapshot.state?.players[snapshot.state.current].bot || !Number.isInteger(index) || index < 0 || index >= game.current.length) return;
  const darts = [...game.current]; darts[index] = dart;
  cancelSpeech(); board.overrideDart(index, dart); const next = setCricketVisit(game, darts); set(next); miss(next, dart); prepareSpeech(next);
  if (board.phase === 'manual' && snapshot.state?.visitResult.checkout) finish(next);
  recorder.meta('cricket-correction', { index, dart: dart.name });
}
export function nextCricketPlayer() { if (snapshot.state?.players[snapshot.state.current].bot) { if (botRunner.paused) { botRunner.resume(); set(snapshot.game); } return; } if (snapshot.game && !completion.active) finish(snapshot.game); }
export function undoCricketDart() { cancelCompletion(); if (snapshot.game) { board.editManually(); botRunner.pause(); set(undoCricket(snapshot.game)); } }
function miss(game: CricketGame, dart: Dart) { if (dart.score === 0) void caller.enqueueTurnSound('miss', () => snapshot.game === game); }
async function announceVisit(game: CricketGame, valid: () => boolean) {
  if (!valid()) return;
  const record = deriveCricket(commitCricketVisit(game)).history[deriveCricket(game).history.length];
  // Výsledek Cricketu zůstává v přehledu, hlasem se oznamují pouze hráči.
  if (record && valid()) await caller.handle({ kind: 'visit', darts: record.darts, total: record.marks }, false);
}
function prepareSpeech(game: CricketGame) {
  const state = deriveCricket(game);
  if (!state.visit.length || !state.visitResult.closed) { cancelSpeech(); return; }
  const identity = key(game); if (speech?.key === identity) return;
  cancelSpeech(); let resolve!: () => void;
  const done = new Promise<void>(finish => { resolve = finish; });
  const pending = { key: identity, done, cancel: () => { clearTimeout(timer); resolve(); } };
  const timer = setTimeout(() => { void announceVisit(game, () => speech === pending).catch(() => undefined).finally(resolve); }, LAST_DART_VISIBLE_MS);
  speech = pending;
}
function finish(game: CricketGame) {
  const next = commitCricketVisit(game); if (next === game) return;
  const pending = speech?.key === key(game) ? speech : undefined;
  if (!pending) cancelSpeech();
  completion.run(async valid => { if (pending) await pending.done; else await announceVisit(game, valid); }, () => {
    speech = undefined; stage = undefined; botRunner.reset(); board.begin(); set(next);
    const record = snapshot.state?.history.at(-1);
    if (record) recorder.meta('cricket-visit', { player: record.player, leg: record.leg, round: record.round, marks: record.marks, points: record.scored, darts: record.darts.map(dart => dart.name) });
    buffered.splice(0).forEach(feedCricketFromBoard); announcePlayer();
  }, value => { stage = value; set(game); });
}
export function feedCricketFromBoard(payload: unknown) {
  if (snapshot.state?.players[snapshot.state.current].bot) { board.handle(payload); return; }
  if (completion.active) { if (payload && typeof payload === 'object' && 'type' in payload && payload.type === 'state') buffered.push(payload); return; }
  const previous = snapshot.game?.current.length ?? 0;
  const update = board.handle(payload, snapshot.game);
  if (!snapshot.game) return;
  if (update.committed) { finish(snapshot.game); return; }
  if (update.game !== snapshot.game || snapshot.boardPhase !== board.phase || snapshot.boardNotice !== board.notice) set(update.game);
  if (snapshot.game && snapshot.game.current.length > previous) miss(snapshot.game, snapshot.game.current.at(-1)!);
  if (snapshot.game && board.phase !== 'manual' && board.phase !== 'blocked') prepareSpeech(snapshot.game);
}
export function resetCricketBoardInput(enabled: boolean): void {
  const game = snapshot.game;
  buffered.length = 0;
  board.resetPhysicalInput(!!game?.current.length, enabled);
  if (game) set(game);
}
function announcePlayer(gameStart = false) {
  caller.cancelPlayer(); const state = snapshot.state;
  if (!state || state.winner !== undefined || state.visit.length || snapshot.completing) return;
  const { players, current, leg } = state, visits = state.history.length;
  const announcement = caller.enqueuePlayer(players[current].bot ? undefined : players[current].name, () => {
    const next = snapshot.state;
    return !!next && next.players === players && next.current === current && next.leg === leg && next.history.length === visits && next.winner === undefined && !next.visit.length && !snapshot.completing;
  }, gameStart);
  botRunner.waitFor(announcement);
}
export function getCricketSnapshot() { return snapshot; }
export function useCricket() { return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, getCricketSnapshot); }
