import { useSyncExternalStore } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCricketSnapshot, subscribeCricket } from '../game/cricketStore.ts';
import { getGameSnapshot, subscribeGame } from '../game/gameStore.ts';
import { getCastDisplaySettings, subscribeSettings } from '../settings.ts';
import { cricketDisplay, x01Display } from './protocol.ts';
import type { CastSnapshot } from './protocol.ts';

interface Television { id: string; name: string }
interface ConnectedTelevision extends Television { certificate: string }
interface CastUi {
  remembered?: ConnectedTelevision;
  connected?: Television;
  devices?: Television[];
  busy?: 'searching' | 'connecting' | 'disconnecting';
  error?: string;
}

const STORAGE_KEY = 'sipky.castTelevision';
const listeners = new Set<() => void>();
const APP_ID = (import.meta.env.VITE_CAST_APP_ID ?? '').trim().toUpperCase();
let ui: CastUi = { remembered: loadTelevision() };
let attempt: string | undefined;
let receivingEvents: Promise<unknown> | undefined;
let stopPublishing: (() => void)[] = [];
let scheduled = false;
let inFlight = false;
let pending = false;
let previous: { attempt: string; json: string } | undefined;

function loadTelevision(): ConnectedTelevision | undefined {
  try {
    const television = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (typeof television?.id === 'string' && typeof television.name === 'string'
      && /^[0-9a-f]{64}$/.test(television.certificate)) return television;
  } catch { /* V anonymním okně může být úložiště zablokované. */ }
}

function update(changes: Partial<CastUi>) {
  ui = { ...ui, ...changes };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function useLocalCast() {
  return useSyncExternalStore(subscribe, () => ui);
}

function snapshot(): CastSnapshot {
  const display = getCastDisplaySettings();
  const x01 = getGameSnapshot();
  const cricket = getCricketSnapshot();
  return {
    ...display,
    game: x01.state ? x01Display(x01.state, !!x01.bullOffResultOpen, x01.boardPhase, !!x01.completing)
      : cricket.state ? cricketDisplay(cricket.state, cricket.game?.current) : undefined,
  };
}

function schedule() {
  pending = true;
  if (scheduled || inFlight) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    void publish();
  });
}

async function publish() {
  pending = false;
  const current = attempt;
  if (!current) return;
  const json = JSON.stringify(snapshot());
  if (previous?.attempt === current && previous.json === json) return;
  inFlight = true;
  try {
    if (await invoke<boolean>('cast_publish', { snapshot: json, attempt: current })) previous = { attempt: current, json };
  } catch (error) {
    console.warn('Chromecast: stav hry se nepodařilo předat do televize.', error);
  } finally {
    inFlight = false;
    if (pending) schedule();
  }
}

function endAttempt() {
  attempt = undefined;
  previous = undefined;
  for (const stop of stopPublishing) stop();
  stopPublishing = [];
}

function listenForDisconnect() {
  receivingEvents ??= listen<{ attempt: string; error: string | null }>('sipky-cast-ended', ({ payload }) => {
    if (payload.attempt !== attempt) return;
    endAttempt();
    update({ connected: undefined, busy: undefined, error: payload.error ?? undefined });
  }).catch(error => {
    receivingEvents = undefined;
    throw error;
  });
  return receivingEvents;
}

export async function findTelevisions(reuse = false) {
  if (ui.busy || ui.connected) return;
  const remembered = reuse ? ui.remembered : undefined;
  update({ busy: 'searching', devices: undefined, error: undefined });
  try {
    const devices = await invoke<Television[]>('cast_discover', { preferred: remembered?.id });
    const found = devices.find(television => television.id === remembered?.id);
    update({ busy: undefined, devices,
      error: remembered && !found ? 'Zapamatovaná televize není v síti dostupná.' : undefined });
    if (found) await connectTelevision(found, remembered?.certificate);
  } catch (error) {
    update({ busy: undefined, error: typeof error === 'string' ? error : 'Vyhledávání televizí se nepodařilo.' });
  }
}

export function hideTelevisions() {
  update({ devices: undefined, error: undefined });
}

export async function connectTelevision(television: Television, certificate?: string) {
  if (ui.busy || ui.connected) return;
  if (!/^[0-9A-F]{8}$/.test(APP_ID)) {
    update({ error: 'Přenos na TV čeká na zveřejnění televizní obrazovky Šipek.' });
    return;
  }
  update({ busy: 'connecting', error: undefined });
  try {
    await listenForDisconnect();
    const current = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    const json = JSON.stringify(snapshot());
    attempt = current;
    stopPublishing = [subscribeGame(schedule), subscribeCricket(schedule), subscribeSettings(schedule)];
    const connected = await invoke<ConnectedTelevision>('cast_connect', {
      id: television.id, appId: APP_ID, attempt: current, snapshot: json, certificate,
    });
    if (attempt !== current) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(connected)); } catch { /* Spojení funguje i bez uložení. */ }
    update({ remembered: connected, connected, busy: undefined, devices: undefined });
    schedule();
  } catch (error) {
    endAttempt();
    update({ busy: undefined, error: typeof error === 'string' ? error : 'Televizi se nepodařilo připojit.' });
  }
}

export async function disconnectTelevision() {
  if (ui.busy || !ui.connected) return;
  const current = attempt;
  update({ busy: 'disconnecting', error: undefined });
  try {
    await invoke('cast_disconnect');
    if (attempt !== current) return;
    endAttempt();
    update({ connected: undefined, busy: undefined });
  } catch (error) {
    if (attempt === current) update({ busy: undefined, error: typeof error === 'string' ? error : 'Televizi se nepodařilo odpojit.' });
  }
}
