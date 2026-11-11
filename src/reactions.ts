import { caller } from './caller/caller.ts';
import type { BoardEvent } from './caller/visitTracker.ts';
import { EFFECTS, matchEffects } from './effects/effectRules.ts';
import { triggerEffect } from './effects/effects.ts';
import { recorder } from './recording.ts';
import { isCallerEnabled, isEffectActive } from './settings.ts';

// Reakce na dokončené kolo: nejdřív efekty (jejich hláška zazní první a může nahradit součet), pak hlasatel.
// Volá se pouze pro kola vyhodnocená hrou; volné házení mimo hru je bez hlášení a efektů.
export function reactToVisit(event: Extract<BoardEvent, { kind: 'visit' }>): Promise<void> {
  const fired = matchEffects(event, isEffectActive);
  const sounds = fired.map(id => { recorder.meta('effect', { effect: id }); return triggerEffect(id); });
  const speakScore = isCallerEnabled() && !fired.some(id => EFFECTS[id].replacesScore);
  sounds.push(caller.handle(event, speakScore, fired.map(id => EFFECTS[id].name).join(', ') || undefined));
  return Promise.all(sounds).then(() => undefined);
}
