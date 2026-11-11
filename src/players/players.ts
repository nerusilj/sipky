import { useSyncExternalStore } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { addPlayer, parsePlayers, removePlayer, renamePlayer, updatePlayer } from './playerList.ts';
import type { AvatarId } from './avatars.ts';
import type { Player } from './playerList.ts';
import { preparePlayerNames } from '../caller/playerSpeech.ts';

export interface PlayersSnapshot { loaded: boolean; readOnly: boolean; players: readonly Player[]; error?: string }

const BROWSER_KEY = 'sipky.players';

// Desktop: Dokumenty/Sipky/hraci.json přes Rust. Prohlížeč (vývoj): jen localStorage.
const storage = isTauri()
  ? { load: () => invoke<string>('load_players'), save: (json: string) => invoke<void>('save_players', { json }) }
  : {
    load: async () => { try { return localStorage.getItem(BROWSER_KEY) ?? '[]'; } catch { return '[]'; } },
    save: async (json: string) => { localStorage.setItem(BROWSER_KEY, json); },
  };

let snapshot: PlayersSnapshot = { loaded: false, readOnly: true, players: [] };
const listeners = new Set<() => void>();
let saving: Promise<void> = Promise.resolve();

function update(patch: Partial<PlayersSnapshot>): void {
  snapshot = { ...snapshot, ...patch };
  listeners.forEach(listener => listener());
  if (patch.players) preparePlayerNames(patch.players);
}

// Když se soubor nenačte, úpravy jsou zablokované, aby se původní seznam nepřepsal prázdným.
void storage.load().then(
  json => update({ loaded: true, readOnly: false, players: parsePlayers(json) }),
  (error: unknown) => update({ loaded: true, readOnly: true, error: `Hráče nelze načíst (${String(error)}). Úpravy jsou zablokované, aby se soubor nepřepsal.` }),
);

// Změna se projeví hned; zápisy jdou postupně za sebou. Neuložení se ukáže jako chyba.
function commit(players: Player[]): void {
  if (snapshot.readOnly) throw new Error(snapshot.loaded ? 'Seznam hráčů se nenačetl, úpravy jsou zablokované.' : 'Hráči se ještě načítají.');
  update({ players, error: undefined });
  const json = JSON.stringify(players, null, 2);
  saving = saving.then(() => storage.save(json)).catch((error: unknown) => update({ error: `Změnu se nepodařilo uložit: ${String(error)}` }));
}

// Vyhodí chybu s českou hláškou, když jméno nejde použít.
export function createPlayer(name: string, avatarId: AvatarId = 'neutral'): Player {
  const players = addPlayer(snapshot.players, name, crypto.randomUUID(), new Date(), avatarId);
  commit(players);
  return players[players.length - 1];
}
export function changePlayerName(id: string, name: string): void {
  commit(renamePlayer(snapshot.players, id, name));
}
export function changePlayerProfile(id: string, name: string, avatarId?: AvatarId): void {
  commit(updatePlayer(snapshot.players, id, name, avatarId));
}
export function deletePlayer(id: string): void {
  commit(removePlayer(snapshot.players, id));
}

export function usePlayers(): PlayersSnapshot {
  return useSyncExternalStore(listener => { listeners.add(listener); return () => { listeners.delete(listener); }; }, () => snapshot);
}
