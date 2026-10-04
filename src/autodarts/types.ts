import type { CapturedWsMessage } from '../inspector/types.ts';

export type ConnectionState = 'blocked' | 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
export interface AutodartsClient {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  onMessage(handler: (message: CapturedWsMessage) => void): () => void;
}
