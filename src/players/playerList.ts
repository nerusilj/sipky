import { isAvatarId, readAvatarId } from './avatars.ts';
import type { AvatarId } from './avatars.ts';
// Profily hráčů. Čisté funkce bez ukládání, starší soubory zůstávají kompatibilní.
export interface Player { id: string; name: string; color: string; createdAt: string; avatarId?: AvatarId }

export const MAX_NAME_LENGTH = 24;
export const PLAYER_COLORS = ['#ff7a1f', '#3fcfbf', '#5fb4ff', '#a68cf0', '#5fd497', '#ff6a50', '#ffd25a', '#ff8fb8', '#8fd3ff', '#c9a27a'];

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

export function addPlayer(players: readonly Player[], name: string, id: string, now = new Date(), avatarId?: AvatarId): Player[] {
  const error = nameError(players, name);
  if (error) throw new Error(error);
  if (avatarId !== undefined && !isAvatarId(avatarId)) throw new Error('Neplatný avatar.');
  return [...players, { ...(avatarId ? { avatarId } : {}), id, name: normalizeName(name), color: nextColor(players), createdAt: now.toISOString() }];
}

export function renamePlayer(players: readonly Player[], id: string, name: string): Player[] {
  const error = nameError(players, name, id);
  if (error) throw new Error(error);
  return players.map(player => player.id === id ? { ...player, name: normalizeName(name) } : player);
}

export function updatePlayer(players: readonly Player[], id: string, name: string, avatarId?: AvatarId): Player[] {
  if (avatarId !== undefined && !isAvatarId(avatarId)) throw new Error('Neplatný avatar.');
  return renamePlayer(players, id, name).map(player => player.id === id && avatarId !== undefined ? { ...player, avatarId } : player);
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
      id: p.id, name: normalizeName(p.name).slice(0, MAX_NAME_LENGTH),
      color: typeof p.color === 'string' && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : PLAYER_COLORS[0],
      createdAt: typeof p.createdAt === 'string' ? p.createdAt : new Date(0).toISOString(),
    }];
  });
}
