import type { PhraseId } from '../caller/phrases.ts';
import type { BoardEvent, Dart } from '../caller/visitTracker.ts';

// Zábavné efekty: kdy se spustí, jaká hláška zazní a zda nahradí hlášení součtu kola.
export interface EffectRule {
  name: string;
  trigger: string;
  title: string;
  subtitle: string;
  phrase: PhraseId;
  replacesScore: boolean;
  match(event: BoardEvent): boolean;
}

const single = (darts: Dart[], number: number) => darts.some(dart => dart.number === number && dart.multiplier === 1);

export const EFFECTS = {
  ambrozovina: {
    name: 'Ambrožovina',
    trigger: 'Kolo 1, 20 a 5 (single, libovolné pořadí)',
    title: 'AMBROŽOVINA!',
    subtitle: '1 · 20 · 5',
    phrase: 'ambrozovina',
    replacesScore: true,
    match: event => event.kind === 'visit' && event.darts.length === 3 && [1, 20, 5].every(n => single(event.darts, n)),
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
