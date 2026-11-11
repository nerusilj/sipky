import { invoke, isTauri } from '@tauri-apps/api/core';
import { useSyncExternalStore } from 'react';
import { getCallerVoice, subscribeCallerVoice } from '../settings.ts';
import { PlayerSpeechCache, normalizeSpokenName } from './playerSpeechCache.ts';

export const playerSpeech = new PlayerSpeechCache(async (name, voice) => {
  if (!isTauri()) return undefined;
  const audio = await invoke<ArrayBuffer>('player_speech', { name, voice });
  return URL.createObjectURL(new Blob([audio], { type: 'audio/wav' }));
}, url => URL.revokeObjectURL(url));

let knownNames: string[] = [];
export function preparePlayerNames(players: readonly { name: string }[]): void {
  knownNames = [...new Set(players.map(player => normalizeSpokenName(player.name)))];
  if (isTauri()) knownNames.forEach(name => { void playerSpeech.prepare(name, getCallerVoice()); });
}
subscribeCallerVoice(voice => { if (isTauri()) knownNames.forEach(name => { void playerSpeech.prepare(name, voice); }); });
export function usePlayerSpeech() { return useSyncExternalStore(playerSpeech.subscribe, playerSpeech.get); }
