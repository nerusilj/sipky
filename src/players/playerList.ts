import { isAvatarId, readAvatarId } from './avatars.ts';
import type { AvatarId } from './avatars.ts';
// Profily hráčů. Čisté funkce bez ukládání, starší soubory zůstávají kompatibilní.
export interface Player { id: string; name: string; color: string; createdAt: string; avatarId?: AvatarId; avatarColor?: string; preferredDouble?: number }

export const FINISHING_DOUBLES = [...Array.from({ length: 20 }, (_, i) => i + 1), 25];

function isFinishingDouble(value: unknown): value is number {
  return typeof value === 'number' && FINISHING_DOUBLES.includes(value);
}

export const MAX_NAME_LENGTH = 24;
export const PLAYER_PALETTE = [
  { color: '#ff7a1f', name: 'Oranžová' },
  { color: '#3fcfbf', name: 'Tyrkysová' },
  { color: '#5fb4ff', name: 'Modrá' },
  { color: '#a68cf0', name: 'Fialová' },
  { color: '#5fd497', name: 'Zelená' },
  { color: '#ff6a50', name: 'Korálová' },
  { color: '#ffd25a', name: 'Žlutá' },
  { color: '#ff8fb8', name: 'Růžová' },
  { color: '#8fd3ff', name: 'Světle modrá' },
  { color: '#c9a27a', name: 'Béžová' },
];
export const PLAYER_COLORS = PLAYER_PALETTE.map(({ color }) => color);

function isPlayerColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

export function normalizeName(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

const sameName = (a: string, b: string) => a.localeCompare(b, 'cs', { sensitivity: 'base' }) === 0;

// Chybová hláška pro neplatné jméno, jinak undefined.
export function nameError(players: readonly Player[], name: string, exceptId?: string): string | undefined {
  const value = normalizeName(name);
  if (!value) return 'Zadejte jméno hráče.';
  if (value.length > MAX_NAME_LENGTH) return `Jméno může mít nejvýš ${MAX_NAME_LENGTH} znaků.`;
  const existing = players.find(player => player.id !== exceptId && sameName(player.name, value));
  if (existing) return `Hráč „${existing.name}“ už existuje.`;
  return undefined;
}

// Barva, kterou zatím nikdo nemá; když jsou všechny použité, nejméně častá.
export function nextColor(players: readonly Player[]): string {
  const counts = PLAYER_COLORS.map(color => players.filter(player => player.color === color).length);
  return PLAYER_COLORS[counts.indexOf(Math.min(...counts))];
}

export function initials(name: string): string {
  const words = normalizeName(name).split(' ').filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[words.length - 1][0] : (words[0] ?? '?').slice(0, 2);
  return letters.toLocaleUpperCase('cs');
}

export function addPlayer(players: readonly Player[], name: string, id: string, now = new Date(), avatarId?: AvatarId, preferredDouble?: number, avatarColor?: string): Player[] {
  const error = nameError(players, name);
  if (error) throw new Error(error);
  if (avatarId !== undefined && !isAvatarId(avatarId)) throw new Error('Neplatný avatar.');
  if (preferredDouble !== undefined && !isFinishingDouble(preferredDouble)) throw new Error('Neplatný oblíbený double.');
  if (avatarColor !== undefined && !isPlayerColor(avatarColor)) throw new Error('Neplatná barva avatara.');
  return [...players, {
    ...(avatarId ? { avatarId } : {}),
    ...(avatarColor !== undefined ? { avatarColor } : {}),
    ...(preferredDouble !== undefined ? { preferredDouble } : {}),
    id, name: normalizeName(name), color: nextColor(players), createdAt: now.toISOString(),
  }];
}

export function renamePlayer(players: readonly Player[], id: string, name: string): Player[] {
  const error = nameError(players, name, id);
  if (error) throw new Error(error);
  return players.map(player => player.id === id ? { ...player, name: normalizeName(name) } : player);
}

export function updatePlayer(players: readonly Player[], id: string, name: string, avatarId?: AvatarId, preferredDouble?: number | null, avatarColor?: string | null): Player[] {
  if (avatarId !== undefined && !isAvatarId(avatarId)) throw new Error('Neplatný avatar.');
  if (preferredDouble != null && !isFinishingDouble(preferredDouble)) throw new Error('Neplatný oblíbený double.');
  if (avatarColor != null && !isPlayerColor(avatarColor)) throw new Error('Neplatná barva avatara.');
  return renamePlayer(players, id, name).map(player => {
    if (player.id !== id) return player;
    if (avatarId !== undefined) player.avatarId = avatarId;
    if (avatarColor === null) delete player.avatarColor;
    else if (avatarColor !== undefined) player.avatarColor = avatarColor;
    if (preferredDouble === null) delete player.preferredDouble;
    else if (preferredDouble !== undefined) player.preferredDouble = preferredDouble;
    return player;
  });
}

export function removePlayer(players: readonly Player[], id: string): Player[] {
  return players.filter(player => player.id !== id);
}

// Načtení ze souboru: neplatné položky a duplicitní id se přeskočí, nic dalšího se nemění.
export function parsePlayers(json: string): Player[] {
  let value: unknown;
  try { value = JSON.parse(json); } catch { return []; }
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  return value.flatMap(item => {
    const p = item as Partial<Player> | null;
    if (!p || typeof p.id !== 'string' || !p.id || seen.has(p.id) || typeof p.name !== 'string' || !normalizeName(p.name)) return [];
    seen.add(p.id);
    return [{
      ...(readAvatarId(p.avatarId) ? { avatarId: readAvatarId(p.avatarId) } : {}),
      ...(isPlayerColor(p.avatarColor) ? { avatarColor: p.avatarColor } : {}),
      ...(isFinishingDouble(p.preferredDouble) ? { preferredDouble: p.preferredDouble } : {}),
      id: p.id, name: normalizeName(p.name).slice(0, MAX_NAME_LENGTH),
      color: isPlayerColor(p.color) ? p.color : PLAYER_COLORS[0],
      createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date(0).toISOString(),
    }];
  });
}
