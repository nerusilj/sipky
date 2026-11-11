export class WindowCloseGuard {
  private closing = false;
  private running: () => boolean;
  private prompt: (open: boolean) => void;
  private destroy: () => Promise<void>;
  private report: (message: string) => void;
  constructor(running: () => boolean, prompt: (open: boolean) => void,
    destroy: () => Promise<void>, report: (message: string) => void) {
    this.running = running; this.prompt = prompt; this.destroy = destroy; this.report = report;
  }
  request(event: { preventDefault: () => void }): void {
    if (!this.running() && !this.closing) return;
    event.preventDefault();
    if (!this.closing) this.prompt(true);
  }
  cancel(): void { if (!this.closing) this.prompt(false); }
  async confirm(): Promise<void> {
    if (this.closing) return;
    this.closing = true;
    try { await this.destroy(); }
    catch { this.report('Aplikaci se nepodařilo zavřít. Zkuste to znovu.'); }
    finally { this.closing = false; }
  }
}
