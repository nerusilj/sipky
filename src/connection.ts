import { useSyncExternalStore } from 'react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { DEFAULT_BOARD_ADDRESS } from './autodarts/boardAddress.ts';
import { LocalBoardClient } from './autodarts/LocalBoardClient.ts';
import { fetchBoardVersion } from './autodarts/boardVersion.ts';
import type { ConnectionState } from './autodarts/types.ts';
import { messageStore } from './inspector/messageStore.ts';
import { FLUSH_INTERVAL_MS, Recorder } from './inspector/recorder.ts';
import type { RecorderSnapshot } from './inspector/recorder.ts';

// Průběžný záznam na disk běží jen v desktopové aplikaci; jeden soubor na spuštění.
export const recorder = new Recorder(isTauri() ? (session, lines) => invoke<string>('append_recording', { session, lines }) : undefined);
if (isTauri()) window.setInterval(() => { void recorder.flush(); }, FLUSH_INTERVAL_MS);
recorder.meta('start', { app: 'HOLICE-Šipky' });
export function useRecorder(): RecorderSnapshot {
  return useSyncExternalStore(recorder.subscribe, recorder.get);
}

const ADDRESS_KEY = 'darts-cz.boardAddress';

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
    next.onMessage(message => { messageStore.append(message); recorder.message(message); this.update({ lastMessageAt: Date.now() }); });
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
