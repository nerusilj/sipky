import { isVoiceId } from './voices.ts';
import type { VoiceId } from './voices.ts';

// Zábavné hlášky efektů; nahrávky v public/sounds/cs/<hlas>/fun/<id>.wav (scripts/generate-voice.mjs).
export const PHRASES = {
  ambrozovina: 'Ambrožovina!',
} as const;

export type PhraseId = keyof typeof PHRASES;

export function phraseSoundUrl(id: PhraseId, voice: VoiceId): string {
  if (!Object.hasOwn(PHRASES, id)) throw new RangeError(`Neznámá hláška: ${String(id)}`);
  if (!isVoiceId(voice)) throw new RangeError(`Neznámý hlas: ${String(voice)}`);
  return `/sounds/cs/${voice}/fun/${id}.wav`;
}
