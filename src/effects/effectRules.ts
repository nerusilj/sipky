import type { PhraseId } from '../caller/phrases.ts';
import type { BoardEvent, Dart } from '../caller/visitTracker.ts';

// Zábavné efekty: kdy se spustí, jaká hláška zazní a zda nahradí hlášení součtu kola.
export interface EffectRule {
  name: string;
  trigger: string;
  title: string;
  subtitle: string;
  phrase: PhraseId | null;
  replacesScore: boolean;
  // Pole terče, která se v efektu rozsvítí (místo podtitulku).
  highlight?: { number: number; multiplier: number }[];
  beerNumbers?: readonly number[];
  durationMs?: number;
  match(event: BoardEvent): boolean;
}

const single = (darts: Dart[], number: number) => darts.some(dart => dart.number === number && dart.multiplier === 1);
const RADKOVINA_NUMBERS = [7, 19, 3] as const;

export const EFFECTS = {
  ambrozovina: {
    name: 'Ambrožovka',
    trigger: 'Kolo 1, 20 a 5 (single, libovolné pořadí)',
    title: 'AMBROŽOVKA!',
    subtitle: '1 · 20 · 5',
    phrase: 'ambrozovina',
    replacesScore: true,
    highlight: [{ number: 5, multiplier: 1 }, { number: 20, multiplier: 1 }, { number: 1, multiplier: 1 }],
    match: event => event.kind === 'visit' && event.darts.length === 3 && [1, 20, 5].every(n => single(event.darts, n)),
  },
  radkovina: {
    name: 'Radkovina',
    trigger: 'Kolo 19, 3 a 7 (single, libovolné pořadí)',
    title: 'RADKOVINA!',
    subtitle: RADKOVINA_NUMBERS.join(' · '),
    phrase: null,
    replacesScore: false,
    beerNumbers: RADKOVINA_NUMBERS,
    durationMs: 5000,
    match: event => event.kind === 'visit' && event.darts.length === 3 && RADKOVINA_NUMBERS.every(n => single(event.darts, n)),
  },
} satisfies Record<string, EffectRule>;

export type EffectId = keyof typeof EFFECTS;
export const EFFECT_IDS = Object.keys(EFFECTS) as EffectId[];

export function isEffectId(value: unknown): value is EffectId {
  return typeof value === 'string' && Object.hasOwn(EFFECTS, value);
}

// Efekty, které daná událost spustí (jen zapnuté).
export function matchEffects(event: BoardEvent, enabled: (id: EffectId) => boolean): EffectId[] {
  return EFFECT_IDS.filter(id => enabled(id) && EFFECTS[id].match(event));
}
