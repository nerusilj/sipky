import type { CapturedWsMessage, StoredMessage } from './types.ts';

export const MAX_MESSAGES = 10_000;
export const MAX_BUFFER_BYTES = 32 * 1024 * 1024;
export const MAX_FRAME_CHARS = 2 * 1024 * 1024;

export class MessageStore {
  private entries: Array<StoredMessage | undefined>;
  private head = 0;
  private length = 0;
  private bytes = 0;
  private revision = 0;
  private received = 0;
  private dropped = 0;
  private limit: number;
  private byteLimit: number;

  constructor(limit = MAX_MESSAGES, byteLimit = MAX_BUFFER_BYTES) {
    if (!Number.isInteger(limit) || limit < 1 || byteLimit < 1) throw new Error('Neplatný limit bufferu.');
    this.limit = limit; this.byteLimit = byteLimit; this.entries = new Array(limit);
  }

  append(message: CapturedWsMessage): boolean {
    this.received++; this.revision++;
    // Hrubý rozpočet textu + parsované kopie + vyhledávacího indexu.
    const estimatedBytes = message.raw.length * 8 + 1024;
    if (message.raw.length > MAX_FRAME_CHARS || estimatedBytes > this.byteLimit) {
      this.dropped++; return false;
    }
    while (this.length && (this.length >= this.limit || this.bytes + estimatedBytes > this.byteLimit)) {
      this.bytes -= this.entries[this.head]!.estimatedBytes;
      this.entries[this.head] = undefined;
      this.head = (this.head + 1) % this.limit;
      this.length--; this.dropped++;
    }
    const preview = message.raw.slice(0, 240).replace(/\s+/g, ' ');
    const entry: StoredMessage = { ...message, preview, estimatedBytes,
      searchText: `${message.channel ?? ''}\n${message.topic ?? ''}\n${message.raw}`.toLowerCase() };
    this.entries[(this.head + this.length) % this.limit] = entry;
    this.length++; this.bytes += estimatedBytes;
    return true;
  }

  snapshot(): readonly StoredMessage[] {
    return Array.from({ length: this.length }, (_, i) => this.entries[(this.head + i) % this.limit]!);
  }
  stats() { return { revision: this.revision, count: this.length, received: this.received, dropped: this.dropped, estimatedBytes: this.bytes }; }
  clear(): void {
    this.entries = new Array(this.limit); this.head = 0; this.length = 0;
    this.bytes = 0; this.received = 0; this.dropped = 0; this.revision++;
  }
}

export const messageStore = new MessageStore();

export function filterMessages(messages: readonly StoredMessage[], channel: string, search: string, direction: string): readonly StoredMessage[] {
  const query = search.trim().toLowerCase();
  return messages.filter(message =>
    (!channel || message.channel === channel) &&
    (!direction || message.direction === direction) &&
    (!query || message.searchText.includes(query)));
}

export function toJsonl(messages: readonly CapturedWsMessage[]): string {
  return messages.map(({ id, timestamp, direction, channel, topic, payload, raw, format }) =>
    JSON.stringify({ id, timestamp, direction, channel, topic, payload, raw, format })).join('\n') + (messages.length ? '\n' : '');
}
