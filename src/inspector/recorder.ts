import { messageLine } from './messageStore.ts';
import type { CapturedWsMessage } from './types.ts';

// Zapíše dávku řádků (každý končí \n) na konec souboru relace a vrátí cestu k souboru.
export type RecordingWriter = (session: string, lines: string) => Promise<string>;

export interface RecorderSnapshot {
  enabled: boolean;
  session: string;
  path?: string;
  written: number;
  pending: number;
  lost: number;
  error?: string;
}

export const FLUSH_INTERVAL_MS = 250;
const MAX_BATCH_LINES = 2_000;
// Pojistka paměti, kdyby zápis na disk dlouho selhával.
export const MAX_PENDING_LINES = 200_000;

// Místní čas RRRR-MM-DD_HH-MM-SS; Rust jiný název souboru nepřijme.
export function sessionName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

// Bezztrátový průběžný záznam: řádky čekají ve frontě, dokud je zápis nepotvrdí.
export class Recorder {
  private readonly write?: RecordingWriter;
  private readonly queue: string[] = [];
  private readonly listeners = new Set<() => void>();
  private snapshot: RecorderSnapshot;
  private flushing = false;

  constructor(write: RecordingWriter | undefined, session = sessionName()) {
    this.write = write;
    this.snapshot = { enabled: !!write, session, written: 0, pending: 0, lost: 0 };
  }

  get = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };

  message(message: CapturedWsMessage): void { this.push(messageLine(message)); }

  // Události aplikace (připojení, stav, verze); poznají se podle pole "meta".
  meta(event: string, details: Record<string, unknown> = {}): void {
    this.push(JSON.stringify({ timestamp: new Date().toISOString(), meta: event, ...details }));
  }

  async flush(): Promise<void> {
    if (!this.write || this.flushing || !this.queue.length) return;
    this.flushing = true;
    const count = Math.min(this.queue.length, MAX_BATCH_LINES);
    try {
      const path = await this.write(this.snapshot.session, this.queue.slice(0, count).join('\n') + '\n');
      this.queue.splice(0, count);
      this.update({ path, written: this.snapshot.written + count, error: undefined });
    } catch (error) {
      // Řádky zůstávají ve frontě a zkusí se znovu při dalším zápisu.
      this.update({ error: error instanceof Error ? error.message : String(error) });
    } finally { this.flushing = false; }
  }

  private push(line: string): void {
    if (!this.write) return;
    // Plnou frontu nezkracujeme zepředu: probíhající zápis s jejím začátkem počítá.
    if (this.queue.length >= MAX_PENDING_LINES) { this.update({ lost: this.snapshot.lost + 1 }); return; }
    this.queue.push(line);
    this.update({});
  }

  private update(patch: Partial<RecorderSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch, pending: this.queue.length };
    this.listeners.forEach(listener => listener());
  }
}
