export const AVATARS = [
  { id: 'neutral', name: 'Neutrální', category: 'neutral' },
  { id: 'initials', name: 'Iniciály', category: 'neutral' },
  { id: 'classic', name: 'Klasik', category: 'portraits' },
  { id: 'beard', name: 'Vousy', category: 'portraits' },
  { id: 'glasses', name: 'Brýle', category: 'portraits' },
  { id: 'cap', name: 'Kšiltovka', category: 'portraits' },
  { id: 'long', name: 'Dlouhé vlasy', category: 'portraits' },
  { id: 'bob', name: 'Mikádo', category: 'portraits' },
  { id: 'curls', name: 'Kudrny', category: 'portraits' },
  { id: 'bun', name: 'Drdol', category: 'portraits' },
  { id: 'band', name: 'Čelenka', category: 'portraits' },
  { id: 'smooth', name: 'Bez vlasů', category: 'portraits' },
  { id: 'headphones', name: 'Sluchátka', category: 'portraits' },
  { id: 'moustache', name: 'Knír', category: 'portraits' },
  { id: 'alien', name: 'Alien', category: 'funny' },
  { id: 'robot', name: 'Robot', category: 'funny' },
  { id: 'panda', name: 'Panda', category: 'funny' },
  { id: 'cat', name: 'Kočka', category: 'funny' },
  { id: 'devil', name: 'Čert', category: 'funny' },
  { id: 'ghost', name: 'Duch', category: 'funny' },
  { id: 'astronaut', name: 'Astronaut', category: 'funny' },
  { id: 'ninja', name: 'Ninja', category: 'funny' },
  { id: 'fox', name: 'Liška', category: 'funny' },
  { id: 'owl', name: 'Sova', category: 'funny' },
  { id: 'viking', name: 'Viking', category: 'funny' },
] as const;
export type AvatarId = typeof AVATARS[number]['id'];
export type AvatarCategory = typeof AVATARS[number]['category'];
export const isAvatarId = (value: unknown): value is AvatarId => AVATARS.some(avatar => avatar.id === value);

// Vyřazené kresby nahradí neutrální avatar, profil hráče zůstává zachovaný.
export function readAvatarId(value: unknown): AvatarId | undefined {
  if (isAvatarId(value)) return value;
  if (typeof value === 'string' && ['harry', 'alf', 'homer', 'bart', 'marge'].includes(value)) return 'neutral';
  return undefined;
}

// Barevnost virtuálních soupeřů je stejná v nabídce i během hry.
const BOT_AVATAR_COLORS = new Map([
  ['bot:easy', '#75c59c'],
  ['bot:medium', '#80b9df'],
  ['bot:hard', '#bc9ae2'],
]);
export const botAvatarColor = (id?: string): string | undefined => id ? BOT_AVATAR_COLORS.get(id) : undefined;
