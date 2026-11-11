import { useSyncExternalStore } from 'react';
import { DEFAULT_BOARD_ADDRESS } from './autodarts/boardAddress.ts';
import { LocalBoardClient } from './autodarts/LocalBoardClient.ts';
import { fetchBoardVersion } from './autodarts/boardVersion.ts';
import { fetchBoardState } from './autodarts/boardState.ts';
import type { ConnectionState } from './autodarts/types.ts';
import { messageStore } from './inspector/messageStore.ts';
import { VisitTracker } from './caller/visitTracker.ts';
import type { BoardEvent } from './caller/visitTracker.ts';
import { feedActiveGame } from './game/activeGame.ts';
import { recorder } from './recording.ts';

export { useRecorder } from './recording.ts';

// Události hodů (šipka, kolo) z terče pro hru, hlasatele a efekty.
const visitTracker = new VisitTracker();
const boardEventListeners = new Set<(event: BoardEvent) => void>();
export function onBoardEvent(listener: (event: BoardEvent) => void): () => void {
  boardEventListeners.add(listener);
  return () => { boardEventListeners.delete(listener); };
}
// Hlasatele a efekty spouští pouze herní režimy. Volné házení se jen zaznamenává.
// Kola z terče jdou vždy i do záznamu, aby šla po testu porovnat se surovými zprávami.
onBoardEvent(event => { if (event.kind === 'visit') recorder.meta('visit', { total: event.total, darts: event.darts.map(dart => dart.name) }); });

const ADDRESS_KEY = 'sipky.boardAddress';

export interface ConnectionSnapshot { address: string; state: ConnectionState; version?: string; versionLoading?: boolean; lastMessageAt?: number }

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
    this.update({ address: address.trim(), version: undefined, versionLoading: false });
    try { localStorage.setItem(ADDRESS_KEY, address.trim()); } catch { /* Adresa se jen nezapamatuje. */ }
    recorder.meta('connect', { address: address.trim() });
    let stateRevision = 0;
    let epoch = 0;
    next.onState(state => {
      if (this.client !== next || state === this.snapshot.state) return;
      const expectedEpoch = ++epoch;
      const connected = state === 'connected';
      this.update({ state, version: undefined, versionLoading: connected });
      recorder.meta('state', { state });
      if (!connected) return;
      // Verzi čteme při každém (znovu)připojení; Board Manager se mezitím mohl aktualizovat.
      void fetchBoardVersion(address).then(version => {
        if (this.client !== next || epoch !== expectedEpoch) return;
        this.update({ version, versionLoading: false }); recorder.meta('version', { boardManager: version ?? null });
      });
      const expectedRevision = stateRevision;
      void fetchBoardState(address).then(payload => {
        if (this.client !== next || stateRevision !== expectedRevision || epoch !== expectedEpoch || !payload) return;
        feedActiveGame(payload);
        recorder.meta('board-snapshot', { payload });
      });
    });
    visitTracker.reset();
    next.onMessage(message => {
      if ((message.payload as { type?: unknown } | null)?.type === 'state') stateRevision++;
      messageStore.append(message); recorder.message(message); this.update({ lastMessageAt: Date.now() });
      feedActiveGame(message.payload);
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
    this.update({ state: 'disconnected', version: undefined, versionLoading: false });
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
