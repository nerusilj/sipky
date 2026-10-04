import { captureMessage } from './envelope.ts';
import { eventsUrl } from './boardAddress.ts';
import type { AutodartsClient, ConnectionState } from './types.ts';
import type { CapturedWsMessage } from '../inspector/types.ts';

// Minimální část WebSocket API, kterou klient používá. Metoda send záměrně chybí.
export interface ListenSocket {
  binaryType: string;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  close(): void;
}
export type SocketFactory = (url: string) => ListenSocket;

export const RECONNECT_MIN_MS = 1_000;
export const RECONNECT_MAX_MS = 30_000;

// Společné pro všechny instance, aby ID zpráv zůstala jedinečná i po novém připojení.
let nextMessageId = 1;

// Pasivní posluchač lokálního Board Manageru: nic neodesílá a nevolá žádné ovládací endpointy.
export class LocalBoardClient implements AutodartsClient {
  private readonly url: string;
  private readonly createSocket: SocketFactory;
  private socket?: ListenSocket;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private attempt = 0;
  private wanted = false;
  private state: ConnectionState = 'disconnected';
  private readonly messageHandlers = new Set<(message: CapturedWsMessage) => void>();
  private readonly stateHandlers = new Set<(state: ConnectionState) => void>();
  private readonly decoder = new TextDecoder();

  constructor(address: string, createSocket: SocketFactory = url => new WebSocket(url) as unknown as ListenSocket) {
    this.url = eventsUrl(address);
    this.createSocket = createSocket;
  }

  connect(): void {
    if (this.wanted) return;
    this.wanted = true; this.attempt = 0;
    this.open();
  }

  disconnect(): void {
    this.wanted = false;
    clearTimeout(this.retryTimer); this.retryTimer = undefined;
    const socket = this.socket; this.socket = undefined;
    if (socket) { detach(socket); socket.close(); }
    this.setState('disconnected');
  }

  onMessage(handler: (message: CapturedWsMessage) => void): () => void {
    this.messageHandlers.add(handler);
    return () => { this.messageHandlers.delete(handler); };
  }

  onState(handler: (state: ConnectionState) => void): () => void {
    this.stateHandlers.add(handler); handler(this.state);
    return () => { this.stateHandlers.delete(handler); };
  }

  private open(): void {
    this.setState(this.attempt ? 'reconnecting' : 'connecting');
    let socket: ListenSocket;
    try { socket = this.createSocket(this.url); } catch { this.scheduleRetry(); return; }
    this.socket = socket;
    socket.binaryType = 'arraybuffer';
    socket.onopen = () => { this.attempt = 0; this.setState('connected'); };
    socket.onmessage = event => this.receive(event.data);
    // Prohlížeč po chybě vždy volá i onclose; obnova se řeší jen tam.
    socket.onerror = () => {};
    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = undefined;
      if (this.wanted) this.scheduleRetry(); else this.setState('disconnected');
    };
  }

  private receive(data: unknown): void {
    const raw = typeof data === 'string' ? data
      : data instanceof ArrayBuffer ? this.decoder.decode(data) : String(data);
    const message = captureMessage(raw, 'in', nextMessageId++);
    this.messageHandlers.forEach(handler => handler(message));
  }

  private scheduleRetry(): void {
    this.setState('reconnecting');
    const ceiling = Math.min(RECONNECT_MAX_MS, RECONNECT_MIN_MS * 2 ** this.attempt++);
    const delay = ceiling / 2 + Math.random() * ceiling / 2;
    this.retryTimer = setTimeout(() => { this.retryTimer = undefined; if (this.wanted) this.open(); }, delay);
  }

  private setState(state: ConnectionState): void {
    if (state === this.state) return;
    this.state = state;
    this.stateHandlers.forEach(handler => handler(state));
  }
}

function detach(socket: ListenSocket): void {
  socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
}
