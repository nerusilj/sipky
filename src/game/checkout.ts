// Doporučený checkout (Double Out): nejméně šipek, oblíbené zavírací doubly a běžné přípravy (T20, T19…).
import { makeDart } from './x01.ts';
import type { Dart } from './x01.ts';

const FINISH_ORDER = [20, 16, 18, 12, 10, 8, 14, 6, 4, 2, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1];
const FINISHES: Dart[] = [...FINISH_ORDER.map(n => makeDart(n, 2)), makeDart(25, 2)];
const SETUPS: Dart[] = [
  ...Array.from({ length: 20 }, (_, i) => makeDart(20 - i, 3)),
  makeDart(25, 1), makeDart(25, 2),
  ...Array.from({ length: 20 }, (_, i) => makeDart(20 - i, 1)),
  ...FINISH_ORDER.map(n => makeDart(n, 2)),
];
const finishRank = new Map(FINISHES.map((dart, i) => [dart.name, i]));
// Cena přípravné šipky: single jsou bezpečné, z triplů jen ty běžně hrané (T20…T15), pak 25 a bull.
const TREBLE_COST: Record<number, number> = { 20: 2, 19: 3, 18: 4, 17: 5, 16: 5, 15: 6 };
function setupCost(dart: Dart): number {
  if (dart.number === 25) return dart.multiplier === 2 ? 9 : 7;
  if (dart.multiplier === 1) return 1 + (20 - dart.number) * 0.5;
  if (dart.multiplier === 3) return TREBLE_COST[dart.number] ?? 8 + (15 - dart.number);
  return 12 + finishRank.get(dart.name)!;
}
const cache = new Map<string, Dart[] | null>();

export const MAX_CHECKOUT = 170;

export function suggestCheckout(remaining: number, dartsLeft: number): Dart[] | undefined {
  if (!Number.isInteger(remaining) || remaining < 2 || remaining > MAX_CHECKOUT || dartsLeft < 1) return undefined;
  const key = `${remaining}/${dartsLeft}`;
  if (!cache.has(key)) cache.set(key, search(remaining, Math.min(dartsLeft, 3)));
  return cache.get(key) ?? undefined;
}

function search(remaining: number, dartsLeft: number): Dart[] | null {
  for (let count = 1; count <= dartsLeft; count++) {
    let best: Dart[] | null = null, bestCost = Infinity;
    const visit = (prefix: Dart[], left: number) => {
      if (prefix.length === count - 1) {
        const finish = FINISHES.find(dart => dart.score === left);
        if (!finish) return;
        // Zavírací double váží víc než pořadí přípravných šipek.
        const cost = finishRank.get(finish.name)! * 3 + prefix.reduce((sum, dart) => sum + setupCost(dart), 0);
        if (cost < bestCost) { bestCost = cost; best = [...prefix, finish]; }
        return;
      }
      for (const dart of SETUPS) if (dart.score < left - 1) visit([...prefix, dart], left - dart.score);
    };
    visit([], remaining);
    if (best) return best;
  }
  return null;
}
