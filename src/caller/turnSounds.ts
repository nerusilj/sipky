// Zvuky hry jsou společné pro oba hlasy a řídí je hlavní vypínač zvuku.
export const TURN_SOUNDS = {
  bust: { url: '/sounds/game/bust.wav', label: 'BUST' },
  miss: { url: '/sounds/game/miss.wav', label: 'Mimo' },
  applause: { url: '/sounds/game/applause.wav', label: 'Potlesk' },
} as const;
export type TurnSound = keyof typeof TURN_SOUNDS;
