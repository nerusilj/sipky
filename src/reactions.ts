import { caller } from './caller/caller.ts';
import type { BoardEvent } from './caller/visitTracker.ts';
import { EFFECTS, matchEffects } from './effects/effectRules.ts';
import { triggerEffect } from './effects/effects.ts';
import { recorder } from './recording.ts';
import { isCallerEnabled, isEffectActive } from './settings.ts';

// Reakce na dokončené kolo: nejdřív efekty (jejich hláška zazní první a může nahradit součet), pak hlasatel.
// Bez hry se volá pro kola z terče; během hry pro kola vyhodnocená hrou (přehoz = 0).
export function reactToVisit(event: Extract<BoardEvent, { kind: 'visit' }>): void {
  const fired = matchEffects(event, isEffectActive);
  fired.forEach(id => { triggerEffect(id); recorder.meta('effect', { effect: id }); });
  const speakScore = isCallerEnabled() && !fired.some(id => EFFECTS[id].replacesScore);
  caller.handle(event, speakScore, fired.map(id => EFFECTS[id].name).join(', ') || undefined);
}
