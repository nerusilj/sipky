import type { CapturedWsMessage } from '../inspector/types.ts';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
export interface AutodartsClient {
  connect(): void;
  disconnect(): void;
  onMessage(handler: (message: CapturedWsMessage) => void): () => void;
  onState(handler: (state: ConnectionState) => void): () => void;
}
