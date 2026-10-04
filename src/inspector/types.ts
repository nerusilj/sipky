export interface CapturedWsMessage {
  id: number;
  timestamp: string;
  direction: 'in' | 'out';
  channel?: string;
  topic?: string;
  payload: unknown;
  raw: string;
  format: 'json' | 'text';
}

export interface StoredMessage extends CapturedWsMessage {
  preview: string;
  searchText: string;
  estimatedBytes: number;
}
