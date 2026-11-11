export type CompletionStage = 'showing' | 'announcing';
export interface CompletionClock {
  now(): number;
  after(delay: number, run: () => void): () => void;
}
const browserClock: CompletionClock = {
  now: () => performance.now(),
  after: (delay, run) => { const timer = setTimeout(run, delay); return () => clearTimeout(timer); },
};
export const LAST_DART_VISIBLE_MS = 450;
export const MIN_VISIT_VISIBLE_MS = 1000;
export const AFTER_ANNOUNCEMENT_MS = 200;

// Poslední šipka se nejdřív vykreslí, potom zazní hláška a až pak se změní hráč.
export class VisitCompletion {
  private token = 0;
  private cancelTimer?: () => void;
  active = false;
  private readonly clock: CompletionClock;
  constructor(clock: CompletionClock = browserClock) { this.clock = clock; }
  cancel(): void {
    this.token++;
    this.cancelTimer?.(); this.cancelTimer = undefined;
    this.active = false;
  }
  run(announce: (valid: () => boolean) => Promise<void>, complete: () => void, stage: (stage: CompletionStage) => void): void {
    this.cancel();
    const token = this.token, start = this.clock.now();
    this.active = true;
    stage('showing');
    this.cancelTimer = this.clock.after(LAST_DART_VISIBLE_MS, () => {
      if (token !== this.token) return;
      stage('announcing');
      void Promise.resolve().then(() => announce(() => token === this.token && this.active)).catch(() => undefined).then(() => {
        if (token !== this.token) return;
        this.cancelTimer = this.clock.after(Math.max(AFTER_ANNOUNCEMENT_MS, MIN_VISIT_VISIBLE_MS - (this.clock.now() - start)), () => {
          if (token !== this.token) return;
          this.active = false; this.cancelTimer = undefined;
          complete();
        });
      });
    });
  }
}
