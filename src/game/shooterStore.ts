import { useSyncExternalStore } from 'react';
import { BoardGameInput, readBoardFrame } from './boardInput.ts';
import type { BoardPhase } from './boardInput.ts';
import { addShooterDart, commitShooterVisit, createShooter, deriveShooter, setShooterVisit, shooterMiss, undoShooter } from './shooter.ts';
import type { ShooterDart, ShooterGame, ShooterSettings, ShooterState } from './shooter.ts';
import { makeDart } from './x01.ts';
import type { Dart, GamePlayer } from './x01.ts';
import { botThrow } from './bots.ts';
import { BotRunner } from './botRunner.ts';
import { caller } from '../caller/caller.ts';
import { playerSpeech } from '../caller/playerSpeech.ts';
import { celebrate } from '../effects/confetti.ts';
import { getCallerVoice, isAutodartsEnabled, isConfettiActive } from '../settings.ts';
import { recorder } from '../recording.ts';

export type ShooterClockPhase = 'off' | 'ready' | 'countdown' | 'running' | 'paused' | 'timeout' | 'manual' | 'offline' | 'takeout' | 'finished' | 'blocked' | 'bot';
export interface ShooterClock { phase: ShooterClockPhase; remainingMs: number }
interface ShooterSnapshot {
  game?: ShooterGame; state?: ShooterState; boardPhase?: BoardPhase; boardNotice?: string;
  clock: ShooterClock; physicalEmpty: boolean; botPaused?: boolean;
}
let prefix: ShooterDart[] = [];
const board = new BoardGameInput<ShooterGame>({
  commit: commitShooterVisit,
  setVisit: (game, darts) => setShooterVisit(game, [...prefix, ...darts]),
  status: deriveShooter,
});
const listeners = new Set<() => void>();
let snapshot: ShooterSnapshot = { clock: { phase: 'off', remainingMs: 0 }, physicalEmpty: false };
let physicalEmpty = false, connected = false, frozen = false;
let hold: 'ready' | 'paused' | 'manual' = 'ready';
let deadline: number | undefined, countdown: number | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;
let match = 0;

const bot = new BotRunner(() => {
  const state = snapshot.state;
  if (!state || state.finished || !state.players[state.current].bot) return;
  return { id: `${match}:${state.history.length}`, darts: state.visit.length, closed: state.visitResult.closed };
}, () => {
  const { game, state } = snapshot;
  if (game && state?.target) set(addShooterDart(game, botThrow(makeDart(state.target, 1), state.players[state.current].bot!)));
}, () => { if (snapshot.game) finish(snapshot.game); });

function cancelTimer() { clearTimeout(timer); timer = undefined; deadline = undefined; countdown = undefined; }
function clock(now = performance.now()): ShooterClock {
  const state = snapshot.state;
  const remainingMs = Math.max(0, (deadline ?? countdown ?? now) - now);
  if (!state || !state.settings.seconds) return { phase: 'off', remainingMs: 0 };
  if (state.finished) return { phase: 'finished', remainingMs: 0 };
  if (state.players[state.current].bot) return { phase: 'bot', remainingMs: 0 };
  if (frozen) return { phase: 'timeout', remainingMs: 0 };
  if (hold === 'manual' || board.phase === 'manual') return { phase: 'manual', remainingMs: 0 };
  if (!connected || !isAutodartsEnabled()) return { phase: 'offline', remainingMs: 0 };
  if (board.notice || board.phase === 'blocked') return { phase: 'blocked', remainingMs: 0 };
  if (state.visitResult.closed || board.phase === 'takeout') return { phase: 'takeout', remainingMs: 0 };
  if (hold === 'paused') return { phase: 'paused', remainingMs: 0 };
  return { phase: countdown !== undefined ? 'countdown' : deadline !== undefined ? 'running' : 'ready', remainingMs };
}
function notify(now?: number) {
  snapshot = { ...snapshot, clock: clock(now), physicalEmpty, boardPhase: board.phase, boardNotice: board.notice, botPaused: bot.paused };
  listeners.forEach(listener => listener());
}
function set(game?: ShooterGame) {
  const before = snapshot.state;
  const state = game ? deriveShooter(game) : undefined;
  snapshot = { ...snapshot, game, state };
  notify(); bot.sync();
  if (state?.finished && !before?.finished && isConfettiActive()) celebrate();
}
function scheduleTick() {
  clearTimeout(timer);
  if (deadline === undefined && countdown === undefined) return;
  timer = setTimeout(() => { timer = undefined; tickShooterClock(); scheduleTick(); }, 100);
}
// Monotónní čas, společný pro příjem šipek a odpočet. Parametr umožňuje přesně ověřit hranici limitu.
export function tickShooterClock(now = performance.now()) {
  if (countdown !== undefined && now >= countdown) { deadline = countdown + snapshot.state!.settings.seconds * 1000; countdown = undefined; }
  if (deadline !== undefined && now >= deadline && snapshot.game && !snapshot.state?.visitResult.closed) {
    cancelTimer(); frozen = true;
    set(addShooterDart(snapshot.game, shooterMiss('timeout')));
    recorder.meta('shooter-timeout', { visit: snapshot.game?.visits.length, attempt: snapshot.game?.current.length });
  } else notify(now);
}
function stopClock() { cancelTimer(); }
function restartShotClock() {
  if (!snapshot.state?.settings.seconds || hold !== 'ready' || frozen || !connected || board.notice || board.phase === 'manual' || snapshot.state.visitResult.closed) { cancelTimer(); return; }
  deadline = performance.now() + snapshot.state.settings.seconds * 1000;
  countdown = undefined; scheduleTick();
}
function announcePlayer(start = false) {
  caller.cancelPlayer();
  const state = snapshot.state;
  if (!state || state.finished) return;
  const identity = state.history.length, players = state.players;
  const valid = () => snapshot.state?.players === players && snapshot.state.history.length === identity && !snapshot.state.finished && !snapshot.state.visit.length;
  void caller.enqueuePlayer(state.players[state.current].bot ? undefined : state.players[state.current].name, valid, start);
}
export function startShooter(settings: ShooterSettings, players: GamePlayer[], seed?: number) {
  const game = createShooter(settings, players, seed);
  endShooter(); match++; prefix = []; frozen = false; hold = 'ready'; board.begin();
  set(game);
  players.filter(p => !p.bot).forEach(p => { void playerSpeech.prepare(p.name, getCallerVoice()); });
  announcePlayer(true);
  recorder.meta('shooter-start', { settings, seed: game.seed, players: players.map(p => p.name) });
}
export function endShooter() {
  stopClock(); bot.reset();
  if (snapshot.game) { caller.stop(); recorder.meta('shooter-end', { winners: snapshot.state?.winners }); }
  prefix = []; frozen = false; hold = 'ready'; set();
}
export const hasShooter = () => !!snapshot.game;
export const isShooterRunning = () => !!snapshot.state && !snapshot.state.finished;
export function rematchShooter() {
  if (snapshot.game) { const { settings, players } = snapshot.game; startShooter(settings, [...players.slice(1), players[0]]); }
}
function finish(game: ShooterGame) {
  cancelTimer(); bot.reset(); caller.cancelPlayer();
  const next = commitShooterVisit(game);
  if (next === game) return;
  prefix = []; frozen = false; hold = 'ready'; board.begin(); set(next);
  const visit = snapshot.state?.history.at(-1);
  if (visit) recorder.meta('shooter-visit', { ...visit, darts: visit.darts.map(d => ({ name: d.name, timeout: d.timeout, skipped: d.skipped })) });
  announcePlayer();
}
export function nextShooterPlayer() {
  if (snapshot.state?.players[snapshot.state.current].bot) { if (bot.paused) { bot.resume(); notify(); } return; }
  if (snapshot.game && (board.phase === 'manual' || physicalEmpty)) finish(snapshot.game);
}
export function enterShooterDart(dart: Dart) {
  const { game, state } = snapshot;
  if (!game || state?.finished || state?.players[state.current].bot || frozen) return;
  const next = addShooterDart(game, dart);
  if (next === game) return;
  cancelTimer(); hold = 'manual'; board.overrideDart(game.current.length - prefix.length, dart);
  set(next);
  if (dart.score === 0) void caller.enqueueTurnSound('miss', () => snapshot.game === next);
}
export function replaceShooterDart(index: number, dart: Dart) {
  const { game, state } = snapshot;
  if (!game || state?.finished || state?.players[state.current].bot || index < 0 || index >= game.current.length || !Number.isInteger(index)) return;
  const darts = [...game.current]; darts[index] = dart;
  cancelTimer(); hold = 'paused';
  if (index < prefix.length || game.current[index].timeout) { board.editManually(); hold = 'manual'; frozen = false; }
  else board.overrideDart(index - prefix.length, dart);
  set(setShooterVisit(game, darts));
  recorder.meta('shooter-correction', { index, dart: dart.name });
}
export function undoShooterDart() {
  if (!snapshot.game) return;
  cancelTimer(); caller.cancelPlayer(); bot.pause(); board.editManually(); prefix = []; frozen = false; hold = 'manual';
  set(undoShooter(snapshot.game));
}
export function pauseShooter() { cancelTimer(); hold = 'paused'; notify(); }
export function resumeShooterClock() {
  const { game, state } = snapshot;
  if (!game || !state || state.finished || !connected || !isAutodartsEnabled() || board.notice || state.players[state.current].bot) return;
  // Po timeoutu nebo ruční opravě nesmí staré/pozdní šipky přetéct do nového cíle.
  if (frozen || board.phase === 'manual' || board.phase === 'blocked') {
    if (!physicalEmpty) return;
    prefix = [...game.current]; board.begin(); frozen = false;
  }
  if (state.visitResult.closed) { if (physicalEmpty) finish(game); return; }
  hold = 'ready'; cancelTimer();
  countdown = performance.now() + 3000; notify(); scheduleTick();
}
export function setShooterBoardConnected(value: boolean) {
  if (connected === value) return;
  connected = value;
  if (!value) { cancelTimer(); hold = 'paused'; physicalEmpty = false; }
  if (snapshot.game) notify();
}
export function resetShooterBoardInput(enabled: boolean) {
  cancelTimer(); hold = 'paused'; physicalEmpty = false; prefix = [];
  board.resetPhysicalInput(!!snapshot.game?.current.length, enabled);
  if (snapshot.game) notify();
}
export function feedShooterFromBoard(payload: unknown) {
  const frame = readBoardFrame(payload);
  if (frame) physicalEmpty = !frame.darts.length && !frame.takingOut;
  if (!snapshot.game || snapshot.state?.players[snapshot.state.current].bot) { board.handle(payload); return; }
  if (deadline !== undefined || countdown !== undefined) tickShooterClock();
  if (frozen) { board.handle(payload); notify(); return; }
  const previous = snapshot.game;
  const before = snapshot.state!;
  // Časovaná hra bere nové fyzické hody až po odpočtu; opravy už přijatých šipek jsou povolené.
  const gated = !!before.settings.seconds && (clock().phase !== 'running') && (frame?.darts.length ?? 0) > previous.current.length - prefix.length;
  if (gated) { cancelTimer(); hold = 'paused'; prefix = [...previous.current]; board.handle(payload); board.begin(); notify(); return; }
  const update = board.handle(payload, previous);
  if (board.notice || board.phase === 'takeout' || board.phase === 'blocked') cancelTimer();
  if (update.committed) { finish(previous); return; }
  if (update.game !== previous) {
    set(update.game);
    if ((snapshot.game?.current.length ?? 0) > previous.current.length || before.visitResult.closed && !snapshot.state?.visitResult.closed) restartShotClock();
  }
  if (snapshot.state?.visitResult.closed) cancelTimer();
  notify();
}
export const getShooterSnapshot = () => snapshot;
export function subscribeShooter(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export const useShooter = () => useSyncExternalStore(subscribeShooter, getShooterSnapshot);
// Kořen aplikace nepotřebuje překreslení při každém tiknutí časomíry.
export const useShooterGame = () => useSyncExternalStore(subscribeShooter, () => snapshot.game);
