// Hlasy hlasatele; nahrávky leží v public/sounds/cs/<id>/score/<n>.wav.
export const VOICES = {
  eliska: { name: 'Eliška', kind: 'ženský hlas', model: 'Supertonic 3 F1', credit: 'Eliška (F1), Supertonic 3, Supertone, OpenRAIL-M' },
  martin: { name: 'Martin', kind: 'mužský hlas', model: 'Supertonic 3 M1', credit: 'Martin (M1), Supertonic 3, Supertone, OpenRAIL-M' },
} as const;

export type VoiceId = keyof typeof VOICES;
export const DEFAULT_VOICE: VoiceId = 'eliska';

export function isVoiceId(value: unknown): value is VoiceId {
  return typeof value === 'string' && Object.hasOwn(VOICES, value);
}
