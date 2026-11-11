import { boardStateText, boardThrowValues } from '../autodarts/boardMessages.ts';

// Události hodů z obou formátů Board Manageru 2.0.2 / 2.1.0.
// Potvrzeno skutečnými záznamy z října a listopadu 2026 (docs/board-manager-local.md).

// distance: vzdálenost od středu v poměru k vnějšímu okraji doublu (z coords terče, pokud je pošle).
export interface Dart { name: string; number: number; multiplier: number; score: number; distance?: number; coords?: { x: number; y: number }; bouncer?: boolean }
export type BoardEvent =
  | { kind: 'dart'; index: number; dart: Dart }
  | { kind: 'visit'; darts: Dart[]; total: number };

export const DARTS_PER_VISIT = 3;

// Body jedné šipky: číslo × násobitel; 25 je vnější bull, 25 × 2 = 50 bull; netrefa 0.
export function parseDart(value: unknown): Dart | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const segment = source.segment === undefined
    ? { number: source.segmentNumber, multiplier: source.multiplier, name: source.segmentName }
    : source.segment;
  if (!segment || typeof segment !== 'object' || Array.isArray(segment)) return undefined;
  const { number, multiplier, name } = segment as Record<string, unknown>;
  if (!Number.isInteger(number) || !Number.isInteger(multiplier)) return undefined;
  const n = number as number, m = multiplier as number;
  const valid = (n >= 0 && n <= 20 && m >= 0 && m <= 3) || (n === 25 && m >= 0 && m <= 2);
  if (!valid) return undefined;
  const bouncer = source.bouncer === true;
  const score = bouncer ? 0 : n * m;
  const dart: Dart = { name: bouncer ? 'Miss' : typeof name === 'string' ? name : String(score), number: bouncer ? 0 : n, multiplier: bouncer ? 0 : m, score };
  if (bouncer) dart.bouncer = true;
  const coords = source.coords === undefined ? { x: source.coordsX, y: source.coordsY } : source.coords;
  if (!bouncer && coords && typeof coords === 'object' && 'x' in coords && 'y' in coords && Number.isFinite(coords.x) && Number.isFinite(coords.y)) {
    dart.coords = { x: coords.x as number, y: coords.y as number };
    dart.distance = Math.hypot(dart.coords.x, dart.coords.y);
  }
  return dart;
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
    const throws = boardThrowValues(data)?.map(parseDart);
    const text = boardStateText(data);
    const takeout = text.includes('takeoutstarted') || text.includes('takeoutinprogress');
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
