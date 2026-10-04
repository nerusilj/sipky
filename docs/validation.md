# Provedené kontroly

Datum: 3. října 2026. **Milník v0.1 není kompletní**, protože nebylo možné ověřit vlastní autentizaci ani spustit nativní Windows aplikaci.

| Kontrola | Výsledek |
|---|---|
| Instalace JS závislostí | Úspěšná, pnpm 11.25.0, Node 24.19.0; vytvořený lockfile |
| `pnpm test` | 7/7 testů prošlo |
| `pnpm build` | TypeScript bez chyb, Vite produkční sestavení úspěšné |
| `pnpm dev` | Server běží na `http://127.0.0.1:1420/` |
| Náhled UI | Otevřený v prohlížeči, české texty, tmavý/oranžový styl, stav Nepřipojeno |
| Ovládání | Připojit vysvětlí překážku; pozastavení/obnovení pohledu mění stav; výběr směru, hledání a Vymazat reagují; prázdný export vysvětlí absenci dat |
| Rozložení | Výchozí úzký panel vizuálně zkontrolovaný; při viewportu 1440 × 960 ověřené dva sloupce a žádné horizontální přetečení DOM. Screenshot širokého viewportu byl omezený šířkou hostitelského panelu; kompletní široký vzhled tím nebyl vizuálně potvrzen |
| Konzole prohlížeče | Bez zaznamenaných warning/error zpráv během kontroly |
| Tauri CLI | 2.12.1; ověření konfigurace pomocí `tauri info`; vygenerované desktopové ikony |
| `pnpm tauri:dev` | Selhalo na chybějícím `cargo metadata`: Cargo není nainstalované |
| Windows prostředí | WebView2 154.0.4258.53 přítomný; Rust/Cargo/rustup a MSVC/Windows SDK Build Tools nedetekované |
| Rust kompilace / nativní save dialog | Neověřené, vyžadují výše uvedené prerequisites |
| Veřejný výzkum | HTTP 200: discovery `.com`/`.io`, HTML Play, aktuální broker/auth bundle a uvedené komunitní zdroje; metadata/otisky v `docs/evidence/` |
| Skutečná autentizace a WS handshake | Neověřené; vlastní OAuth registrace není doložená |
| První reálná zpráva, reconnect, souběh s Play | Neprovedené, živý transport není implementovaný |

Jednotkové testy pokrývají: celou obálku a přesný raw text, milisekundy, libovolný JSON a neplatný JSON, zachování error obálek, kruhové vyřazování, velikostní limity, nezávislost zmrazeného snapshotu, kombinovanou filtraci a JSONL round-trip včetně raw textu s novými řádky. Nejde o živé Autodarts události.

Implementace exportu vybírá cílový soubor v Rustu pomocí nativního Tauri dialogu; webový klient nemůže zadat libovolnou cestu. JS JSONL serializace je otestovaná, ale native dialog a zápis na disk musí být potvrzené až po nativním sestavení. Export obsahuje jen zachovaný buffer, nikoli vyřazené události; jde o záznam dostupného okna, nikoli neomezený archiv.

Příští validace: nainstalovat Windows build prerequisites, `pnpm tauri:dev`, zaregistrovat Darts CZ u Autodarts, ověřit auth tok, získat první zprávu a zastavit se k její inspekci. Teprve následně implementovat a otestovat zbytek živého propojení.

## 4. října 2026: přechod na lokální Board Manager

| Kontrola | Výsledek |
|---|---|
| Testy (`node --test`) | 12/12 prošlo: obálka, buffer, adresa jen na `/api/events`, klient nic neodesílá, obnova spojení a odpojení |
| `tsc --noEmit` | Bez chyb |
| `pnpm dev` + prohlížeč | Připojení ke skutečnému Board Manageru 2.0.2 na `127.0.0.1:3180`: stav „Připojeno“, odpojení „Nepřipojeno“, konzole bez chyb |
| Skutečné události hodů | Neověřené, k dispozici nejsou kamery |
| Tauri / Rust | Stále neověřené, Rust toolchain není nainstalovaný |

## 3. října 2026: poznámky z Codexu

Dodatečná autorizace instalace: uživatel povolil instalaci potřebných nástrojů. Systémový přístup byl schválen, ale terminálové exec/apply_patch následně selhaly při obnově prostředí. Alternativní JavaScriptový runtime umožnil práci se soubory a syntaktickou kontrolu PowerShellu, ale připojení k vendor download serverům bylo odmítnuté (EACCES). Instalační skript je připravený, nebyl však proveden a nativní stav se nezměnil.
