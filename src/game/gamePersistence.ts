import type { BoardPhase } from './boardInput.ts';
import { isStartScore } from './startScores.ts';
import { BULL_THROW_CHOICES } from './x01.ts';
import type { Dart, GameEntry, X01Game } from './x01.ts';

const KEY = 'sipky.currentGame';
const PHASES: BoardPhase[] = ['ready', 'throwing', 'takeout', 'blocked', 'manual'];
export interface SavedGame { version: 1; game: X01Game; boardPhase: BoardPhase; completion?: 'manual' | 'board'; corrections?: [number, Dart][] }

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, min: number, max: number): boolean => Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
function validDart(value: unknown): value is Dart {
  if (!object(value) || typeof value.name !== 'string' || value.name.length > 40) return false;
  const { number, multiplier, score, distance } = value;
  return integer(number, 0, 25) && (number as number <= 20 || number === 25)
    && integer(multiplier, 0, number === 25 ? 2 : 3) && score === (number as number) * (multiplier as number)
    && (distance === undefined || typeof distance === 'number' && Number.isFinite(distance) && distance >= 0);
}

// Poškozenou uloženou hru nenačítáme ani automaticky nepřepisujeme.
export function parseSavedGame(json: string): SavedGame | undefined {
  try {
    if (json.length > 4 * 1024 * 1024) return;
    const value: unknown = JSON.parse(json);
    if (!object(value) || value.version !== 1 || !PHASES.includes(value.boardPhase as BoardPhase) || !object(value.game)) return;
    if (value.completion !== undefined && value.completion !== 'manual' && value.completion !== 'board') return;
    const game = value.game;
    if (!object(game.settings) || !Array.isArray(game.players) || !Array.isArray(game.visits) || !Array.isArray(game.current)) return;
    const s = game.settings;
    if (!isStartScore(s.startScore) || typeof s.doubleOut !== 'boolean' || !integer(s.legsToWin, 0, 5)
      || (s.nextLegOrder !== undefined && !['rotate', 'loserFirst'].includes(s.nextLegOrder as string))
      || (s.maxRounds !== undefined && !integer(s.maxRounds, 0, 1000))
      || (s.minFinishers !== undefined && !integer(s.minFinishers, 1, 7))) return;
    if (!game.players.length || game.players.length > 8 || !game.players.every(p => object(p)
      && typeof p.id === 'string' && p.id.length > 0 && p.id.length <= 100
      && typeof p.name === 'string' && p.name.trim().length > 0 && p.name.length <= 80
      && typeof p.color === 'string' && /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(p.color))) return;
    if (new Set(game.players.map(p => p.id)).size !== game.players.length) return;
    const playerCount = game.players.length;
    const playerIndex = (value: unknown) => integer(value, 0, playerCount - 1);
    const validReview = (review: unknown) => object(review) && Array.isArray(review.places)
      && review.places.length === playerCount && review.places.every(playerIndex) && new Set(review.places).size === playerCount
      && Array.isArray(review.corrections) && review.corrections.length <= playerCount
      && review.corrections.every(fix => object(fix) && playerIndex(fix.player) && BULL_THROW_CHOICES.some(choice => choice === fix.choice));
    const validEntry = (entry: unknown): entry is GameEntry => Array.isArray(entry)
      ? entry.length <= 3 && entry.every(validDart)
      : object(entry) && ('bullOffReview' in entry ? validReview(entry.bullOffReview)
        : entry.bullOff === true || entry.cancelBullOff === true || playerIndex(entry.decide));
    if (game.visits.length > 10000 || !game.visits.every(validEntry) || game.current.length > 3 || !game.current.every(validDart)) return;
    const currentLength = game.current.length;
    if (value.corrections !== undefined && (!Array.isArray(value.corrections) || value.corrections.length > 3
      || !value.corrections.every(entry => Array.isArray(entry) && entry.length === 2
        && integer(entry[0], 0, currentLength - 1) && validDart(entry[1])))) return;
    return value as unknown as SavedGame;
  } catch { return; }
}

// Migrace ze starších verzí: mažeme jen rozehranou hru, nikoli hráče ani nastavení.
export function discardSavedGame(): void {
  try { localStorage.removeItem(KEY); } catch { /* Starý zápis nikdy nenačítáme. */ }
}
