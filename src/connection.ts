import { useSyncExternalStore } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { DEFAULT_BOARD_ADDRESS } from './autodarts/boardAddress.ts';
import { LocalBoardClient } from './autodarts/LocalBoardClient.ts';
import { fetchBoardVersion } from './autodarts/boardVersion.ts';
import type { ConnectionState } from './autodarts/types.ts';
import { messageStore } from './inspector/messageStore.ts';
import { FLUSH_INTERVAL_MS, Recorder } from './inspector/recorder.ts';
import type { RecorderSnapshot } from './inspector/recorder.ts';
import { caller } from './caller/caller.ts';
import { VisitTracker } from './caller/visitTracker.ts';
import type { BoardEvent } from './caller/visitTracker.ts';
import { isCallerEnabled, isEffectActive } from './settings.ts';
import { EFFECTS, matchEffects } from './effects/effectRules.ts';
import { triggerEffect } from './effects/effects.ts';

// Průběžný záznam na disk běží jen v desktopové aplikaci; jeden soubor na spuštění.
export const recorder = new Recorder(isTauri() ? (session, lines) => invoke<string>('append_recording', { session, lines }) : undefined);
if (isTauri()) window.setInterval(() => { void recorder.flush(); }, FLUSH_INTERVAL_MS);
recorder.meta('start', { app: 'Šipky' });

// Události hodů (šipka, kolo) pro hlasatele a později efekty.
const visitTracker = new VisitTracker();
const boardEventListeners = new Set<(event: BoardEvent) => void>();
export function onBoardEvent(listener: (event: BoardEvent) => void): () => void {
  boardEventListeners.add(listener);
  return () => { boardEventListeners.delete(listener); };
}
// Efekty mají přednost: jejich hláška zazní první a může nahradit hlášení součtu.
onBoardEvent(event => {
  const fired = matchEffects(event, isEffectActive);
  fired.forEach(id => { triggerEffect(id); recorder.meta('effect', { effect: id }); });
  const speakScore = isCallerEnabled() && !fired.some(id => EFFECTS[id].replacesScore);
  caller.handle(event, speakScore, fired.map(id => EFFECTS[id].name).join(', ') || undefined);
});
// Ohlášená kola jdou i do záznamu, aby šla po testu porovnat se surovými zprávami.
onBoardEvent(event => { if (event.kind === 'visit') recorder.meta('visit', { total: event.total, darts: event.darts.map(dart => dart.name) }); });
export function useRecorder(): RecorderSnapshot {
  return useSyncExternalStore(recorder.subscribe, recorder.get);
}

const ADDRESS_KEY = 'sipky.boardAddress';

export interface ConnectionSnapshot { address: string; state: ConnectionState; version?: string; lastMessageAt?: number }

// Jediné spojení s terčem pro celou aplikaci; zprávy jdou do společného úložiště inspektoru.
class BoardConnection {
  private client?: LocalBoardClient;
  private snapshot: ConnectionSnapshot = { address: storedAddress(), state: 'disconnected' };
  private readonly listeners = new Set<() => void>();

  get = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };

  // Vyhodí chybu u neplatné adresy; jinak naváže spojení a adresu si zapamatuje.
  connect(address = this.snapshot.address): void {
    const next = new LocalBoardClient(address);
    this.client?.disconnect();
    this.client = next;
    this.update({ address: address.trim(), version: undefined });
    try { localStorage.setItem(ADDRESS_KEY, address.trim()); } catch { /* Adresa se jen nezapamatuje. */ }
    recorder.meta('connect', { address: address.trim() });
    next.onState(state => {
      if (this.client !== next || state === this.snapshot.state) return;
      this.update({ state });
      recorder.meta('state', { state });
      // Verzi čteme při každém (znovu)připojení; Board Manager se mezitím mohl aktualizovat.
      if (state === 'connected') void fetchBoardVersion(address).then(version => {
        if (this.client !== next) return;
        this.update({ version }); recorder.meta('version', { boardManager: version ?? null });
      });
    });
    visitTracker.reset();
    next.onMessage(message => {
      messageStore.append(message); recorder.message(message); this.update({ lastMessageAt: Date.now() });
      for (const event of visitTracker.handle(message.payload)) boardEventListeners.forEach(listener => listener(event));
    });
    next.connect();
  }

  // Automatické připojení po startu; podruhé (React StrictMode) už nic nedělá.
  start(): void {
    if (this.client) return;
    try { this.connect(); } catch { /* Neplatnou adresu opraví uživatel v Nastavení. */ }
  }

  disconnect(): void {
    if (this.client) recorder.meta('disconnect');
    this.client?.disconnect(); this.client = undefined;
    this.update({ state: 'disconnected', version: undefined });
  }

  private update(patch: Partial<ConnectionSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach(listener => listener());
  }
}

function storedAddress(): string {
  try { return localStorage.getItem(ADDRESS_KEY) || DEFAULT_BOARD_ADDRESS; } catch { return DEFAULT_BOARD_ADDRESS; }
}

export const boardConnection = new BoardConnection();
export function useConnection(): ConnectionSnapshot {
  return useSyncExternalStore(boardConnection.subscribe, boardConnection.get);
}
