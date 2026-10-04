// Události hodů odvozené ze zpráv Board Manageru {type:"state", data:{throws, event, status, numThrows}}.
// Formát zatím vychází z komunitních zdrojů; ověřit na skutečném terči (docs/board-manager-local.md).

export interface Dart { name: string; number: number; multiplier: number; score: number }
export type BoardEvent =
  | { kind: 'dart'; index: number; dart: Dart }
  | { kind: 'visit'; darts: Dart[]; total: number };

export const DARTS_PER_VISIT = 3;

// Body jedné šipky: číslo × násobitel; 25 je vnější bull, 25 × 2 = 50 bull; netrefa 0.
export function parseDart(value: unknown): Dart | undefined {
  const segment = (value as { segment?: unknown } | null)?.segment as Record<string, unknown> | undefined;
  if (!segment || typeof segment !== 'object') return undefined;
  const { number, multiplier, name } = segment;
  if (!Number.isInteger(number) || !Number.isInteger(multiplier)) return undefined;
  const n = number as number, m = multiplier as number;
  const valid = (n >= 0 && n <= 20 && m >= 0 && m <= 3) || (n === 25 && m >= 0 && m <= 2);
  if (!valid) return undefined;
  const score = n * m;
  return { name: typeof name === 'string' ? name : String(score), number: n, multiplier: m, score };
}

// Sleduje jedno kolo: hlásí každou novou šipku a součet kola právě jednou,
// po třetí šipce nebo při vytažení šipek (méně než tři šipky, např. odražená šipka).
export class VisitTracker {
  private darts: Dart[] = [];
  private announced = false;

  // Nové spojení začíná bez rozehraného kola.
  reset(): void { this.darts = []; this.announced = false; }

  handle(payload: unknown): BoardEvent[] {
    const envelope = payload as { type?: unknown; data?: unknown } | null;
    if (!envelope || envelope.type !== 'state' || !envelope.data || typeof envelope.data !== 'object') return [];
    const data = envelope.data as Record<string, unknown>;
    const throws = Array.isArray(data.throws) ? data.throws.map(parseDart)
      : data.numThrows === 0 ? [] : undefined;
    const text = `${data.event ?? ''} ${data.status ?? ''}`.toLowerCase();
    const takeout = text.includes('takeout started') || text.includes('takeout in progress');
    const events: BoardEvent[] = [];

    if (throws && throws.every((dart): dart is Dart => dart !== undefined)) {
      if (throws.length < this.darts.length) {
        // Šipky zmizely bez ohlášení (vytažení přišlo bez „Takeout started“).
        if (!this.announced) this.announce(events);
        this.announced = false;
      } else {
        // Opravená šipka nevytváří novou událost; součet se počítá z aktuálního stavu.
        for (let i = this.darts.length; i < throws.length; i++) events.push({ kind: 'dart', index: i, dart: throws[i] });
      }
      this.darts = throws;
      if (!throws.length) this.announced = false;
    }
    if (!this.announced && (this.darts.length >= DARTS_PER_VISIT || (takeout && this.darts.length))) this.announce(events);
    return events;
  }

  private announce(events: BoardEvent[]): void {
    const darts = this.darts.slice(0, DARTS_PER_VISIT);
    if (!darts.length) return;
    events.push({ kind: 'visit', darts, total: darts.reduce((sum, dart) => sum + dart.score, 0) });
    this.announced = true;
  }
}
