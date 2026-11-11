export interface BotTurn { id: string; darts: number; closed: boolean }
export interface BotClock { after(delay: number, run: () => void): () => void }
const realClock: BotClock = { after: (delay, run) => { const timer = setTimeout(run, delay); return () => clearTimeout(timer); } };
// Jediný čekající úkon. Změna tahu, Zpět a ukončení hry starý timer zruší.
export class BotRunner {
  private cancelTimer?: () => void;
  private scheduled?: string;
  private gate?: object;
  private cancelGate?: () => void;
  paused = false;
  private readonly view: () => BotTurn | undefined;
  private readonly hit: () => void;
  private readonly finish: () => void;
  private readonly clock: BotClock;
  constructor(view: () => BotTurn | undefined, hit: () => void, finish: () => void, clock: BotClock = realClock) {
    this.view = view; this.hit = hit; this.finish = finish; this.clock = clock;
  }
  private clear() { this.cancelTimer?.(); this.cancelTimer = undefined; this.scheduled = undefined; }
  reset() { this.clear(); this.paused = false; this.gate = undefined; this.cancelGate?.(); this.cancelGate = undefined; }
  pause() { this.paused = true; this.clear(); }
  resume() { this.paused = false; this.sync(); }
  waitFor(announcement: Promise<unknown>) {
    if (!this.view()) return;
    this.clear(); this.cancelGate?.(); const token = {}; this.gate = token;
    const release = () => { if (this.gate !== token) return; this.gate = undefined; this.cancelGate?.(); this.cancelGate = undefined; this.sync(); };
    this.cancelGate = this.clock.after(4000, release);
    void announcement.then(release, release);
  }
  sync() {
    const turn = this.view();
    if (!turn || this.paused || this.gate) { this.clear(); return; }
    const key = `${turn.id}/${turn.darts}/${turn.closed}`;
    if (key === this.scheduled) return;
    this.clear(); this.scheduled = key;
    this.cancelTimer = this.clock.after(turn.closed ? 150 : turn.darts ? 1000 : 900, () => {
      const now = this.view();
      this.cancelTimer = undefined; this.scheduled = undefined;
      if (!now || this.paused || this.gate || `${now.id}/${now.darts}/${now.closed}` !== key) return;
      if (now.closed) this.finish(); else this.hit();
    });
  }
}
