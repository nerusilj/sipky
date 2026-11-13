import { endGame, feedGameFromBoard, hasGame, isGameRunning, resetX01BoardInput } from './gameStore.ts';
import { endCricket, feedCricketFromBoard, hasCricket, isCricketRunning, resetCricketBoardInput } from './cricketStore.ts';
export type GameMode = 'x01' | 'cricket';
export function hasAnyGame() { return hasGame() || hasCricket(); }
export function isAnyGameRunning() { return isGameRunning() || isCricketRunning(); }
export function endAnyGame() { if (hasGame()) endGame(); if (hasCricket()) endCricket(); }
// Oba vstupy sledují fyzický stav terče i mimo hru, aby start nepřevzal staré šipky.
export function feedActiveGame(payload: unknown) { feedGameFromBoard(payload); feedCricketFromBoard(payload); }
export function resetGameBoardInputs(enabled: boolean) { resetX01BoardInput(enabled); resetCricketBoardInput(enabled); }
