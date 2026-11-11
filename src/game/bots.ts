import { makeDart } from './x01.ts';
import type { Dart, GamePlayer, X01State } from './x01.ts';
import type { CricketState } from './cricket.ts';
import { CRICKET_TARGETS } from './cricket.ts';
import { suggestCheckout } from './checkout.ts';
import { BOARD_NUMBERS } from './dartboardGeometry.ts';

export const BOT_LEVELS = [
  { id: 'easy', label: 'Lehká', name: 'Bot začátečník', spread: 42, description: 'Větší rozptyl, častější zásahy vedle cíle.' },
  { id: 'medium', label: 'Střední', name: 'Bot soupeř', spread: 24, description: 'Vyrovnaný soupeř, občas mine důležitý hod.' },
  { id: 'hard', label: 'Těžká', name: 'Bot expert', spread: 11.5, description: 'Přesnější hody a častější zásahy triplů a doublů.' },
] as const;
export type BotLevel = typeof BOT_LEVELS[number]['id'];
export const BOT_PLAYERS: readonly GamePlayer[] = BOT_LEVELS.map(level => ({ id: `bot:${level.id}`, name: level.name, color: '#86b9d6', avatarId: 'robot', bot: level.id }));
export const isBotLevel = (value: unknown): value is BotLevel => BOT_LEVELS.some(level => level.id === value);
export function availableGamePlayers(players: readonly GamePlayer[]): GamePlayer[] {
  return [...players, ...BOT_PLAYERS.filter(bot => !players.some(player => player.id === bot.id))];
}
// Stejné rozměry a orientace jako u živého terče; souřadnice Board Manageru mají Y nahoru.
export function dartAtPoint(x: number, y: number): Dart {
  const radius = Math.hypot(x, y);
  let dart: Dart;
  if (radius > 170) dart = makeDart(0, 0);
  else if (radius <= 6.35) dart = makeDart(25, 2);
  else if (radius <= 15.9) dart = makeDart(25, 1);
  else {
    const angle = (Math.atan2(x, y) * 180 / Math.PI + 360 + 9) % 360;
    const number = BOARD_NUMBERS[Math.floor(angle / 18)];
    dart = makeDart(number, radius >= 162 ? 2 : radius >= 99 && radius <= 107 ? 3 : 1);
  }
  return { ...dart, coords: { x: x / 170, y: y / 170 }, distance: radius / 170 };
}
export function botThrow(target: Dart, level: BotLevel, random: () => number = Math.random): Dart {
  const spread = BOT_LEVELS.find(item => item.id === level)?.spread;
  if (spread === undefined) throw new Error('Neplatná obtížnost bota.');
  const index = BOARD_NUMBERS.indexOf(target.number as typeof BOARD_NUMBERS[number]);
  const angle = index * 18 * Math.PI / 180;
  const radius = target.number === 25 ? target.multiplier === 2 ? 0 : 11.1 : target.multiplier === 3 ? 103 : target.multiplier === 2 ? 166 : 134;
  const x = target.number === 25 ? radius : radius * Math.sin(angle);
  const y = target.number === 25 ? 0 : radius * Math.cos(angle);
  const deviation = spread * Math.sqrt(-2 * Math.log(Math.max(1e-12, 1 - random())));
  const direction = random() * Math.PI * 2;
  return dartAtPoint(x + deviation * Math.cos(direction), y + deviation * Math.sin(direction));
}
export function x01BotTarget(state: X01State): Dart {
  if (state.bullOff) return makeDart(25, 2);
  const left = state.visitResult.remaining;
  if (state.settings.doubleOut) {
    const checkout = suggestCheckout(left, 3 - state.visit.length);
    if (checkout?.length) return checkout[0];
    if (left <= 40) return left % 2 ? makeDart(1, 1) : makeDart(left / 2, 2);
    if (left < 60) return makeDart(left - 40, 1);
  } else {
    if (left <= 20) return makeDart(left, 1);
    if (left === 25 || left === 50) return makeDart(25, left === 50 ? 2 : 1);
    if (left <= 60 && left % 3 === 0) return makeDart(left / 3, 3);
    if (left <= 40 && left % 2 === 0) return makeDart(left / 2, 2);
    if (left < 60) return makeDart(Math.min(20, left - 20), 1);
  }
  return makeDart(20, 3);
}
export function cricketBotTarget(state: CricketState): Dart {
  const own = state.marks[state.current];
  const scoring = CRICKET_TARGETS.findIndex((_, index) => own[index] === 3 && state.marks.some((marks, player) => player !== state.current && marks[index] < 3));
  const behind = state.points[state.current] < Math.max(...state.points);
  const index = behind && scoring >= 0 ? scoring : own.findIndex(marks => marks < 3);
  const target = CRICKET_TARGETS[index >= 0 ? index : Math.max(0, scoring)];
  return makeDart(target, target === 25 ? 2 : 3);
}
