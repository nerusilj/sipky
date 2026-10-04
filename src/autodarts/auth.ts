export const AUTH_BLOCKER = 'Samostatné přihlášení vyžaduje registraci OAuth aplikace Darts CZ u Autodarts. Zatím nemáme ověřený client_id ani povolený přihlašovací tok.';

export interface AuthProvider {
  getAccessToken(): Promise<string>;
  clear(): void;
}

// Záměrná překážka podle zadání. Žádné vypůjčené ID oficiálního Play,
// zachytávání cookies, zadávání hesel nebo ruční kopírování tokenů.
export class UnregisteredAuthProvider implements AuthProvider {
  async getAccessToken(): Promise<string> { throw new Error(AUTH_BLOCKER); }
  clear(): void { /* Není co uchovávat. */ }
}
