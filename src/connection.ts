import { useSyncExternalStore } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { DEFAULT_BOARD_ADDRESS } from './autodarts/boardAddress.ts';
import { LocalBoardClient } from './autodarts/LocalBoardClient.ts';
import { fetchBoardVersion } from './autodarts/boardVersion.ts';
import { fetchBoardStateSnapshot, playableBoardState } from './autodarts/boardState.ts';
import { readBoardStatus } from './autodarts/boardStatus.ts';
import type { ConnectionState } from './autodarts/types.ts';
import { messageStore } from './inspector/messageStore.ts';
import { VisitTracker } from './caller/visitTracker.ts';
import type { BoardEvent } from './caller/visitTracker.ts';
import { feedActiveGame, resetGameBoardInputs } from './game/activeGame.ts';
import { recorder } from './recording.ts';
import { isAutodartsEnabled, setAutodartsEnabled } from './settings.ts';

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

export type BoardCommand = 'start' | 'stop' | 'reset';

export interface ConnectionSnapshot {
  address: string;
  state: ConnectionState;
  version?: string;
  versionLoading?: boolean;
  lastMessageAt?: number;
  boardStatus?: string;
  commandPending?: BoardCommand;
  commandResult?: { action: BoardCommand; error?: string };
}

// Jediné spojení s terčem pro celou aplikaci; zprávy jdou do společného úložiště inspektoru.
class BoardConnection {
  private client?: LocalBoardClient;
  private snapshot: ConnectionSnapshot = { address: storedAddress(), state: 'disconnected' };
  private readonly listeners = new Set<() => void>();
  private connectionEpoch = 0;
  private stateRevision = 0;
  private stateRequest = 0;

  get = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };

  setEnabled(enabled: boolean): void {
    if (enabled === isAutodartsEnabled()) return;
    setAutodartsEnabled(enabled);
    if (!enabled) this.disconnect();
    resetGameBoardInputs(enabled);
    if (enabled) this.start();
  }

  // Vyhodí chybu u neplatné adresy; jinak naváže spojení a adresu si zapamatuje.
  connect(address = this.snapshot.address): void {
    if (!isAutodartsEnabled()) return;
    const next = new LocalBoardClient(address);
    this.client?.disconnect();
    this.client = next;
    this.update({ address: address.trim(), version: undefined, versionLoading: false, boardStatus: undefined, lastMessageAt: undefined });
    try { localStorage.setItem(ADDRESS_KEY, address.trim()); } catch { /* Adresa se jen nezapamatuje. */ }
    recorder.meta('connect', { address: address.trim() });
    next.onState(state => {
      if (this.client !== next || state === this.snapshot.state) return;
      const epoch = ++this.connectionEpoch;
      const connected = state === 'connected';
      this.update({ state, version: undefined, versionLoading: connected, boardStatus: undefined, commandResult: undefined });
      recorder.meta('state', { state });
      if (!connected) return;
      // Verzi čteme při každém (znovu)připojení; Board Manager se mezitím mohl aktualizovat.
      void fetchBoardVersion(address).then(version => {
        if (this.connectionEpoch !== epoch) return;
        this.update({ version, versionLoading: false }); recorder.meta('version', { boardManager: version ?? null });
      });
      void this.refreshBoardState(address, epoch, true);
    });
    visitTracker.reset();
    next.onMessage(message => {
      if (this.client !== next) return;
      const isState = (message.payload as { type?: unknown } | null)?.type === 'state';
      if (isState) this.stateRevision++;
      messageStore.append(message); recorder.message(message);
      this.update({ lastMessageAt: Date.now(), ...(isState ? { boardStatus: readBoardStatus(message.payload) } : {}) });
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
    this.update({ state: 'disconnected', version: undefined, versionLoading: false, boardStatus: undefined });
  }

  async controlBoard(action: BoardCommand): Promise<void> {
    const { address, state, commandPending } = this.snapshot;
    if (!isAutodartsEnabled() || state !== 'connected' || commandPending) return;
    const epoch = this.connectionEpoch;
    this.update({ commandPending: action, commandResult: undefined });
    let failure: string | undefined;
    try {
      await invoke('send_board_command', { address, action });
      if (this.connectionEpoch === epoch) await this.refreshBoardState(address, epoch, false);
    } catch (error) {
      failure = typeof error === 'string' ? error : 'Příkaz Autodarts se nepodařilo odeslat.';
    } finally {
      this.update({ commandPending: undefined, commandResult: this.connectionEpoch === epoch ? { action, error: failure } : undefined });
    }
  }

  private async refreshBoardState(address: string, epoch: number, initializeGame: boolean): Promise<void> {
    const request = ++this.stateRequest;
    const revision = this.stateRevision;
    const payload = await fetchBoardStateSnapshot(address);
    if (!payload || this.connectionEpoch !== epoch || this.stateRequest !== request || this.stateRevision !== revision) return;
    this.update({ boardStatus: readBoardStatus(payload) });
    if (!initializeGame) return;
    const playable = playableBoardState(payload);
    if (!playable) return;
    feedActiveGame(playable);
    recorder.meta('board-snapshot', { payload: playable });
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

export function useConnectionState(): ConnectionState {
  return useSyncExternalStore(boardConnection.subscribe, () => boardConnection.get().state);
}
