import type { Dart } from '../caller/visitTracker.ts';

export interface BullThrow { player: number; dart: Dart }
export interface BullRanking { ordered: number[]; pending: number[][]; results: BullThrow[] }
const measured = (dart: Dart) => dart.distance !== undefined && Number.isFinite(dart.distance) && dart.distance >= 0;

// BULL a 25 se porovnávají po pásmech; mimo střed rozhodují desetiny milimetru.
export function compareBullThrows(a: Dart, b: Dart): number {
  const tier = (dart: Dart) => dart.bouncer || (!dart.score && !measured(dart)) ? 3
    : dart.number === 25 && dart.multiplier === 2 ? 0 : dart.number === 25 && dart.multiplier === 1 ? 1 : 2;
  const byTier = tier(a) - tier(b);
  if (byTier || tier(a) !== 2 || !measured(a) || !measured(b)) return byTier;
  return Math.round(a.distance! * 1700) - Math.round(b.distance! * 1700);
}

// Vyřešené skupiny zůstanou na svých místech. Znovu házejí pouze členové aktuální shody.
export function rankBullRound(ranking: BullRanking, throws: readonly BullThrow[]): { ranking: BullRanking; next?: number[] } {
  const sorted = [...throws].sort((a, b) => compareBullThrows(a.dart, b.dart));
  const groups: BullThrow[][] = [];
  for (const hit of sorted) {
    const last = groups.at(-1);
    if (last && compareBullThrows(last[0].dart, hit.dart) === 0) last.push(hit);
    else groups.push([hit]);
  }
  const pending = [...groups.map(group => group.map(hit => hit.player)), ...ranking.pending.map(group => [...group])];
  const ordered = [...ranking.ordered];
  const results = [...ranking.results.filter(old => !throws.some(hit => hit.player === old.player)), ...throws];
  while (pending[0]?.length === 1) ordered.push(pending.shift()![0]);
  const next = pending.shift();
  return { ranking: { ordered, pending, results }, next };
}

export function bullDistanceDart(mm: number): Dart {
  if (!Number.isFinite(mm) || mm < 0 || mm > 1000) throw new Error('Zadejte vzdálenost od 0 do 1000 mm.');
  const bull = mm <= 6.35, outer = !bull && mm <= 15.9;
  return { name: bull ? 'Bull' : outer ? '25' : 'Vzdálenost', number: bull || outer ? 25 : 0,
    multiplier: bull ? 2 : outer ? 1 : 0, score: bull ? 50 : outer ? 25 : 0,
    distance: mm / 170 };
}
export function bullThrowLabel(dart: Dart): string {
  if (dart.bouncer) return 'MIMO';
  if (dart.number === 25 && dart.multiplier === 2) return 'BULL';
  if (dart.number === 25 && dart.multiplier === 1) return '25';
  if (measured(dart)) return `${(dart.distance! * 170).toFixed(1).replace('.', ',')} mm`;
  return dart.score ? 'Doplnit mm' : 'MIMO';
}

export const bullThrowNeedsDistance = (dart: Dart): boolean => !dart.bouncer && dart.score > 0 && dart.number !== 25 && !measured(dart);

export const bullThrowRequiresTakeout = (dart: Dart): boolean =>
  !dart.bouncer && dart.number === 25 && (dart.multiplier === 1 || dart.multiplier === 2);
