import { endGame, feedGameFromBoard, hasGame, isGameRunning } from './gameStore.ts';
import { endCricket, feedCricketFromBoard, hasCricket, isCricketRunning } from './cricketStore.ts';
export type GameMode = 'x01' | 'cricket';
export function hasAnyGame() { return hasGame() || hasCricket(); }
export function isAnyGameRunning() { return isGameRunning() || isCricketRunning(); }
export function endAnyGame() { if (hasGame()) endGame(); if (hasCricket()) endCricket(); }
// Oba vstupy sledují fyzický stav terče i mimo hru, aby start nepřevzal staré šipky.
export function feedActiveGame(payload: unknown) { feedGameFromBoard(payload); feedCricketFromBoard(payload); }
