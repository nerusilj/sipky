import { UnregisteredAuthProvider } from './auth.ts';
import type { AuthProvider } from './auth.ts';
import type { AutodartsClient } from './types.ts';
import type { CapturedWsMessage } from '../inspector/types.ts';

// Síťová integrace se zde zastavuje do ověření vlastního přihlašovacího toku.
export class ResearchBlockedClient implements AutodartsClient {
  private auth: AuthProvider;
  constructor(auth: AuthProvider = new UnregisteredAuthProvider()) { this.auth = auth; }
  async connect(): Promise<void> {
    await this.auth.getAccessToken();
    throw new Error('Živý transport čeká na ověření přihlášení a první skutečné zprávy.');
  }
  async disconnect(): Promise<void> { this.auth.clear(); }
  onMessage(_handler: (message: CapturedWsMessage) => void): () => void { return () => {}; }
}
