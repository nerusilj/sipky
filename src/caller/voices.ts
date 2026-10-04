// Hlasy hlasatele; nahrávky leží v public/sounds/cs/<id>/score/<n>.wav.
export const VOICES = {
  jirka: { name: 'Jirka', kind: 'mužský hlas', model: 'cs_CZ-jirka-medium', credit: 'Piper, hlas cs_CZ-jirka-medium (data CC0)' },
  kasandra: { name: 'Kasandra', kind: 'ženský hlas', model: 'cs_CZ-kasandra-medium', credit: 'Piper, hlas cs_CZ-kasandra-medium, autor Ondřej Šimek (CC BY 4.0)' },
} as const;

export type VoiceId = keyof typeof VOICES;
export const DEFAULT_VOICE: VoiceId = 'jirka';

export function isVoiceId(value: unknown): value is VoiceId {
  return typeof value === 'string' && Object.hasOwn(VOICES, value);
}
