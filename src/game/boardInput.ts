import { boardStateText, boardThrowValues } from '../autodarts/boardMessages.ts';
import { parseDart } from '../caller/visitTracker.ts';
import { commitVisit, deriveState, setVisit } from './x01.ts';
import type { Dart, X01Game } from './x01.ts';

export type BoardPhase = 'ready' | 'throwing' | 'takeout' | 'blocked' | 'manual';
interface BoardFrame { darts: Dart[]; takingOut: boolean }

function samePhysicalDart(a: Dart, b: Dart): boolean {
  if (a.coords && b.coords) return a.coords.x === b.coords.x && a.coords.y === b.coords.y;
  return a.number === b.number && a.multiplier === b.multiplier && a.bouncer === b.bouncer;
}

// Board Manager posílá celý stav. Nula bez pole throws znamená prázdný terč.
// Kalibrace / zastavené zařízení nejsou dokončením kola.
function readFrame(payload: unknown): BoardFrame | undefined {
  const envelope = payload as { type?: unknown; data?: unknown } | null;
  if (envelope?.type !== 'state' || !envelope.data || typeof envelope.data !== 'object') return;
  const data = envelope.data as Record<string, unknown>;
  const text = boardStateText(data);
  if (data.connected === false || data.running === false || text.includes('calibrat')) return;
  const values = boardThrowValues(data);
  if (!values) return;
  const darts = values.map(parseDart);
  if (!darts.every((dart): dart is Dart => dart !== undefined)) return;
  return { darts, takingOut: text.includes('takeoutstarted') || text.includes('takeoutinprogress') };
}

// Samostatná synchronizace hry: součet lze hlásit po třetí šipce, ale hráč
// se změní až po skutečném vyprázdnění terče (Takeout finished / Manual reset).
export interface BoardGameRules<Game> {
  commit(game: Game): Game;
  setVisit(game: Game, darts: readonly Dart[]): Game;
  status(game: Game): { winner?: number; bullOff?: unknown };
}
const x01Rules: BoardGameRules<X01Game> = { commit: commitVisit, setVisit, status: deriveState };

export class BoardGameInput<Game extends { current: Dart[] } = X01Game> {
  private readonly rules: BoardGameRules<Game>;
  constructor(rules?: BoardGameRules<Game>) { this.rules = rules ?? x01Rules as unknown as BoardGameRules<Game>; }
  private darts: Dart[] = [];
  private takingOut = false;
  private owned = false;
  private blocked = false;
  private manual = false;
  private waitForEmpty = false;
  private overrides = new Map<number, Dart>();
  private bullTurn?: { retained: number; dartIndex?: number };
  get hasPhysicalBullThrow(): boolean { return !this.manual && this.bullTurn?.dartIndex !== undefined; }
  get corrections(): [number, Dart][] { return [...this.overrides]; }
  notice?: string;

  get phase(): BoardPhase {
    if (this.manual) return 'manual';
    if (this.blocked || this.waitForEmpty) return 'blocked';
    if (this.takingOut || this.darts.length >= 3) return 'takeout';
    return this.darts.length > (this.bullTurn?.retained ?? 0) ? 'throwing' : 'ready';
  }

  // Nová hra ani ruční přepnutí hráče nesmí převzít šipky předchozího hráče.
  begin(): void {
    this.overrides.clear();
    this.owned = false;
    this.manual = false;
    this.blocked = this.darts.length > 0 || this.takingOut;
    this.bullTurn = undefined;
  }

  // V rozhozu mohou dřívější šipky zůstat v terči. Další hod se přidá až za ně.
  beginBullOffTurn(): void {
    this.begin();
    this.bullTurn = { retained: this.darts.length };
    this.blocked = false;
  }

  // Ručně opravené / rozehrané kolo se nepřepíše dalším snapshotem terče.
  editManually(): void { this.overrides.clear(); this.owned = false; this.manual = true; }

  // Oprava jednoho rozpoznaného hodu zachová příjem dalších šipek i potvrzení vytažením.
  overrideDart(index: number, dart: Dart): void {
    if (this.owned && !this.manual && !this.blocked) this.overrides.set(index, dart);
    else this.editManually();
  }

  restore(darts: Dart[], phase: BoardPhase, corrections: [number, Dart][] = []): void {
    this.overrides = new Map(corrections);
    this.darts = [...darts];
    this.manual = phase === 'manual';
    this.blocked = phase === 'blocked';
    this.takingOut = phase === 'takeout';
    this.owned = darts.length > 0 && !this.manual && !this.blocked;
    this.bullTurn = undefined;
    this.waitForEmpty = false;
  }

  // Rozehrané skóre zůstane ruční. Po zapnutí počkáme na fyzicky prázdný terč.
  resetPhysicalInput(hasCurrentDarts: boolean, enabled: boolean): void {
    this.restore([], hasCurrentDarts ? 'manual' : 'ready');
    this.notice = undefined;
    this.waitForEmpty = enabled;
  }

  handle(payload: unknown, game?: Game): { game?: Game; committed: boolean } {
    const envelope = payload as { type?: unknown; data?: Record<string, unknown> } | null;
    if (envelope?.type === 'state' && envelope.data && typeof envelope.data === 'object') {
      const data = envelope.data;
      const text = boardStateText(data);
      if (text.includes('calibrat') || data.running === false || data.connected === false) {
        this.notice = text.includes('calibrat') ? 'Probíhá kalibrace terče. Počkejte na dokončení.' : 'Terč není připravený. Zkontrolujte Board Manager.';
        return { game, committed: false };
      }
    }
    const frame = readFrame(payload);
    if (!frame) return { game, committed: false };
    this.notice = undefined;
    if (this.waitForEmpty) {
      if (frame.darts.length || frame.takingOut) return { game, committed: false };
      this.waitForEmpty = false;
    }
    const status = game && !this.blocked && !this.manual ? this.rules.status(game) : undefined;
    if (game && status?.bullOff) return this.handleBullOff(frame, game);
    if (!game && this.bullTurn) {
      this.takingOut = frame.takingOut;
      if (!frame.takingOut) this.darts = frame.darts;
      return { game, committed: false };
    }
    // Během vytažení může počet šipek klesat; skóre vytažených šipek se nemaže.
    if ((!frame.takingOut && !this.takingOut) || frame.darts.length >= this.darts.length) this.darts = frame.darts;
    this.takingOut ||= frame.takingOut;
    if (!frame.darts.length && !frame.takingOut) {
      this.darts = [];
      this.takingOut = false;
      const shouldCommit = !!game && this.owned && !this.manual && !this.blocked;
      this.owned = false;
      this.blocked = false;
      this.overrides.clear();
      const next = shouldCommit ? this.rules.commit(game!) : game;
      return { game: next, committed: next !== game };
    }
    if (!game || !status || status.winner !== undefined) return { game, committed: false };
    if (!this.darts.length) return { game, committed: false };
    this.owned = true;
    return this.updateVisit(game, [...this.darts]);
  }

  private handleBullOff(frame: BoardFrame, game: Game): { game: Game; committed: boolean } {
    const turn = this.bullTurn ??= { retained: 0, dartIndex: this.owned && this.darts.length ? 0 : undefined };
    this.takingOut = frame.takingOut;
    if (frame.takingOut) return { game, committed: false };
    const previous = this.darts;
    this.darts = frame.darts;
    const index = turn.dartIndex;
    if (index !== undefined && frame.darts.length < previous.length) {
      // Při částečném vytažení se indexy posunou. Potvrzuje se až zmizení šipky hráče na řadě.
      const remainingIndex = frame.darts.findIndex(dart => samePhysicalDart(dart, previous[index]));
      if (remainingIndex >= 0) {
        turn.dartIndex = remainingIndex;
        return { game, committed: false };
      }
      const next = this.rules.commit(game);
      if (this.rules.status(next).bullOff) this.beginBullOffTurn();
      else this.begin();
      return { game: next, committed: next !== game };
    }
    turn.retained = Math.min(turn.retained, frame.darts.length);
    const nextIndex = index ?? turn.retained;
    if (nextIndex >= frame.darts.length) return { game, committed: false };
    turn.dartIndex = nextIndex;
    this.owned = true;
    return this.updateVisit(game, [frame.darts[nextIndex]]);
  }

  private updateVisit(game: Game, darts: Dart[]): { game: Game; committed: false } {
    for (const [index, dart] of this.overrides) {
      if (index <= darts.length) darts[index] = dart;
    }
    if (JSON.stringify(game.current) === JSON.stringify(darts)) return { game, committed: false };
    return { game: this.rules.setVisit(game, darts), committed: false };
  }
}
