// Double Out: běžné cesty, možnost opravy po singlu a přepočet pro skutečně zbývající šipky.
import { makeDart } from './x01.ts';
import type { Dart } from './x01.ts';

export const MAX_CHECKOUT = 170;
const FINISH_ORDER = [20, 16, 18, 12, 10, 8, 14, 6, 4, 2, 19, 17, 15, 13, 11, 9, 7, 5, 3, 1];
const FINISHES: Dart[] = [...FINISH_ORDER.map(n => makeDart(n, 2)), makeDart(25, 2)];
const SETUPS: Dart[] = [
  ...Array.from({ length: 20 }, (_, i) => makeDart(20 - i, 3)),
  makeDart(25, 1), makeDart(25, 2),
  ...Array.from({ length: 20 }, (_, i) => makeDart(20 - i, 1)),
  ...FINISH_ORDER.map(n => makeDart(n, 2)),
];
const finishRank = new Map(FINISHES.map((dart, i) => [dart.name, i]));
// Vlastní výběr běžných cest; referenční kontrola: Winmau Checkout Table.
// https://media.winmau.com/Marketing%20Assets/Winmau%20Checkout%20Table%20Poster/Winmau%20Checkout%20Poster.pdf
// Tři šipky dovolují běžnou přípravu na double místo vynucování kratší cesty přes bull.
// 128, 132 a 135 volí začátek, který nechává zavření i při singlu / vnějším bullu.
const STANDARD_ROUTES: Record<number, string> = {
  41: 'S9 D16', 42: 'S10 D16', 43: 'S3 D20', 44: 'S4 D20', 45: 'S13 D16',
  46: 'S6 D20', 47: 'S7 D20', 48: 'S16 D16', 49: 'S17 D16',
  51: 'S19 D16', 52: 'S20 D16', 53: 'S13 D20', 54: 'S14 D20', 55: 'S15 D20',
  56: 'S16 D20', 57: 'S17 D20', 58: 'S18 D20', 59: 'S19 D20', 60: 'S20 D20',
  61: 'T15 D8', 62: 'T10 D16', 63: 'T13 D12', 64: 'T16 D8', 65: '25 D20',
  66: 'T10 D18', 67: 'T17 D8', 68: 'T20 D4', 69: 'T19 D6', 70: 'T18 D8',
  71: 'T13 D16', 72: 'T16 D12', 73: 'T19 D8', 74: 'T14 D16', 75: 'T17 D12',
  76: 'T20 D8', 77: 'T19 D10', 78: 'T18 D12', 79: 'T19 D11', 80: 'T20 D10',
  81: 'T19 D12', 82: 'Bull D16', 83: 'T17 D16', 84: 'T20 D12', 85: 'T15 D20',
  86: 'T18 D16', 87: 'T17 D18', 88: 'T20 D14', 89: 'T19 D16', 90: 'T20 D15',
  91: 'T17 D20', 92: 'T20 D16', 93: 'T19 D18', 94: 'T18 D20', 95: 'T19 D19',
  96: 'T20 D18', 97: 'T19 D20', 98: 'T20 D19', 99: 'T19 S10 D16', 100: 'T20 D20',
  101: 'T20 S9 D16', 102: 'T16 S14 D20', 103: 'T19 S6 D20', 104: 'T16 S16 D20',
  105: 'T20 S13 D16', 106: 'T20 S6 D20', 107: 'T19 S10 D20', 108: 'T20 S16 D16',
  109: 'T20 S17 D16', 110: 'T20 S10 D20', 111: 'T19 S14 D20', 112: 'T20 S20 D16',
  113: 'T19 S16 D20', 114: 'T20 S14 D20', 115: 'T20 S15 D20', 116: 'T20 S16 D20',
  117: 'T20 S17 D20', 118: 'T20 S18 D20', 119: 'T19 S12 Bull', 120: 'T20 S20 D20',
  121: 'T20 S11 Bull', 122: 'T18 S18 Bull', 123: 'T19 S16 Bull', 124: 'T20 S14 Bull',
  125: '25 T20 D20', 126: 'T19 S19 Bull', 127: 'T20 S17 Bull', 128: 'T18 T14 D16',
  129: 'T19 T16 D12', 130: 'T20 T20 D5', 131: 'T20 T13 D16', 132: 'Bull Bull D16',
  133: 'T20 T19 D8', 134: 'T20 T14 D16', 135: 'Bull T15 D20', 136: 'T20 T20 D8',
  137: 'T20 T19 D10', 138: 'T20 T18 D12', 139: 'T19 T14 D20', 140: 'T20 T20 D10',
  141: 'T20 T19 D12', 142: 'T20 T14 D20', 143: 'T20 T17 D16', 144: 'T20 T20 D12',
  145: 'T20 T15 D20', 146: 'T20 T18 D16', 147: 'T20 T17 D18', 148: 'T20 T20 D14',
  149: 'T20 T19 D16', 150: 'T20 T18 D18', 151: 'T20 T17 D20', 152: 'T20 T20 D16',
  153: 'T20 T19 D18', 154: 'T20 T18 D20', 155: 'T20 T19 D19', 156: 'T20 T20 D18',
  157: 'T20 T19 D20', 158: 'T20 T20 D19', 160: 'T20 T20 D20', 161: 'T20 T17 Bull',
  164: 'T20 T18 Bull', 167: 'T20 T19 Bull', 170: 'T20 T20 Bull',
};

// Dosažitelné součty v nejvýše 1–3 šipkách, nezávisle na preferencích cest.
const reachable = [new Set<number>(), new Set(FINISHES.map(dart => dart.score))];
const setupScores = [...new Set(SETUPS.map(dart => dart.score))];
for (let count = 2; count <= 3; count++) {
  const totals = new Set(reachable[count - 1]);
  for (const score of setupScores) for (const finish of reachable[count - 1]) {
    if (score + finish <= MAX_CHECKOUT) totals.add(score + finish);
  }
  reachable.push(totals);
}
const cache = new Map<string, Dart[] | null>();

export function suggestCheckout(remaining: number, dartsLeft: number): Dart[] | undefined {
  if (!Number.isInteger(remaining) || remaining < 2 || remaining > MAX_CHECKOUT || !Number.isInteger(dartsLeft) || dartsLeft < 1) return undefined;
  const count = Math.min(dartsLeft, 3);
  if (!reachable[count].has(remaining)) return undefined;
  const key = `${remaining}/${count}`;
  if (!cache.has(key)) cache.set(key, search(remaining, count));
  return cache.get(key) ?? undefined;
}

// Cena nerozhoduje o platnosti a neodhaduje hráčovu úspěšnost. Rozliší jen
// jinak rovnocenné cesty mimo tabulku, s menší vahou oblíbeného doublu.
function setupCost(dart: Dart): number {
  if (dart.number === 25) return dart.multiplier === 2 ? 9 : 7;
  if (dart.multiplier === 1) return 1 + (20 - dart.number) * .1;
  if (dart.multiplier === 3) return 3 + (20 - dart.number) * .5;
  return 12 + finishRank.get(dart.name)! * .25;
}

function openingRisk(remaining: number, first: Dart, dartsLeft: number): number {
  // S plným kolem preferujeme začátek s možností dvoušipkové opravy.
  // Se dvěma šipkami má přednost běžná cesta; bez údajů o hráči neporovnáváme
  // pravděpodobnost zásahu triplu oproti cestě single–bull.
  if (dartsLeft < 3) return 0;
  // Typické minutí: triple/double do singlu, bull do 25, vnější bull do vnitřního.
  // Úplné minutí i jiné výseče zpracuje další skutečný hod a nový přepočet.
  const miss = first.number === 25 ? first.multiplier === 2 ? 25 : 50
    : first.multiplier > 1 ? first.number : undefined;
  return miss === undefined || reachable[dartsLeft - 1].has(remaining - miss) ? 0 : 1;
}

function search(remaining: number, dartsLeft: number): Dart[] | null {
  const direct = FINISHES.find(dart => dart.score === remaining);
  if (direct) return [direct];
  const standard = STANDARD_ROUTES[remaining];
  let best: Dart[] | null = null;
  let bestRank = [Infinity];
  const consider = (route: Dart[]) => {
    const finish = route.at(-1)!;
    const rank = [
      openingRisk(remaining, route[0], dartsLeft),
      route.map(dart => dart.name).join(' ') === standard ? 0 : 1,
      route.length,
      route.slice(0, -1).reduce((sum, dart) => sum + setupCost(dart), 0) + finishRank.get(finish.name)! * .25,
    ];
    const different = rank.findIndex((value, i) => value !== bestRank[i]);
    if (different >= 0 && rank[different] < (bestRank[different] ?? Infinity)) { best = route; bestRank = rank; }
  };
  for (let count = 2; count <= dartsLeft; count++) {
    const visit = (prefix: Dart[], left: number) => {
      if (prefix.length === count - 1) {
        const finish = FINISHES.find(dart => dart.score === left);
        if (finish) consider([...prefix, finish]);
        return;
      }
      for (const dart of SETUPS) if (dart.score < left - 1) visit([...prefix, dart], left - dart.score);
    };
    visit([], remaining);
  }
  return best;
}
