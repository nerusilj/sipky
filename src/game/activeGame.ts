import { endGame, feedGameFromBoard, hasGame, isGameRunning, resetX01BoardInput } from './gameStore.ts';
import { endCricket, feedCricketFromBoard, hasCricket, isCricketRunning, resetCricketBoardInput } from './cricketStore.ts';
import { endShooter, feedShooterFromBoard, hasShooter, isShooterRunning, resetShooterBoardInput } from './shooterStore.ts';
export type GameMode = 'x01' | 'cricket' | 'shooter';
export function hasAnyGame() { return hasGame() || hasCricket() || hasShooter(); }
export function isAnyGameRunning() { return isGameRunning() || isCricketRunning() || isShooterRunning(); }
export function endAnyGame() { if (hasGame()) endGame(); if (hasCricket()) endCricket(); if (hasShooter()) endShooter(); }
// Oba vstupy sledují fyzický stav terče i mimo hru, aby start nepřevzal staré šipky.
export function feedActiveGame(payload: unknown) { feedGameFromBoard(payload); feedCricketFromBoard(payload); feedShooterFromBoard(payload); }
export function resetGameBoardInputs(enabled: boolean) { resetX01BoardInput(enabled); resetCricketBoardInput(enabled); resetShooterBoardInput(enabled); }
