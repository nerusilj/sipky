# Darts CZ · v0.1 WebSocket inspektor

Lehký desktopový základ v Tauri 2, Reactu, TypeScriptu a Vite. Rozhraní je česky, tmavé s oranžovým akcentem. Žádná herní logika ani databáze.

**Stav: inspektor se připojuje k lokálnímu Autodarts Board Manageru (`ws://<host>:3180/api/events`) a zaznamenává jeho události beze změny.** Nepotřebuje účet Autodarts ani cloud. Milník v0.1 zatím není dokončen: chybí první skutečné události hodů a ověření nativního sestavení.

## Předpoklady

- Node.js 22.18+ nebo 24 LTS; pnpm 11 (doporučeno), případně npm.
- Rust stable s Cargo; na Windows toolchain `stable-x86_64-pc-windows-msvc`.
- Windows: Microsoft C++ Build Tools s workloadem **Desktop development with C++**, Windows SDK a Microsoft Edge WebView2 Runtime.
- Linux: nativní knihovny WebKitGTK 4.1, GTK 3, OpenSSL a další balíčky dle distribuce. Přesné příkazy uvádí [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

## Spuštění na Windows

Otevřete PowerShell v adresáři projektu:

```powershell
pnpm install
pnpm test
pnpm build
pnpm tauri:dev
```

Pro samotné rozhraní v prohlížeči: `pnpm dev`, potom `http://127.0.0.1:1420`. Nativní ukládání je dostupné pouze v Tauri.

```powershell
pnpm tauri:build
```

Balíčky jsou v `src-tauri/target/release/bundle/`. Stejný zdrojový kód se sestavuje na Linuxu; sestavení používá nativní toolchain cílového systému.

Alternativa s npm:

```powershell
npm install
npm test
npm run build
npm run tauri:dev -- --config '{"build":{"beforeDevCommand":"npm run dev"}}'
npm run tauri:build -- --config '{"build":{"beforeBuildCommand":"npm run build"}}'
```

Používejte jeden správce balíčků. Součástí dodávky je `pnpm-lock.yaml`.

## Co funguje v základu

- Připojení k Board Manageru na nastavitelné adrese (výchozí `127.0.0.1:3180`, zapamatuje se). Pouze naslouchá, nic neodesílá. Při výpadku se spojení obnovuje s rostoucím odstupem 1–30 s.
- Čitelné rozhraní inspektoru, viditelný stav připojení, typ/kanál zprávy, detail formátovaného JSON a přepnutí na přesný raw text.
- Filtrace podle typu, směru a obsahu. Nejnovější zprávy první, nejvýše 100 řádků najednou.
- Kruhový buffer nejvýše 10 000 zpráv a hrubý textový rozpočet 32 MiB. Odhad není měření skutečného heapu. Jeden raw rámec smí mít nejvýše 2 Mi znaků; větší se nezachová a započítá se jako vyřazený.
- Pozastavení zmrazí snapshot UI; přidávání do úložiště pokračuje nezávisle. Vymazat odstraní buffer i snapshot a vynuluje počítadla.
- Export JSONL přes nativní Tauri dialog; ukládá celý aktuální buffer, nikoli jen filtr nebo zmrazený pohled. Žádné indexy vyhledávání v exportu. Časy ISO 8601 UTC s milisekundami (`Z`); seznam používá místní čas.
- Parser zachová celé obálky, neznámá pole, chyby odběru i neplatný JSON. Nedělá závěry o hodech či skóre.

## Závislosti a struktura

Runtime JS: pouze React, React DOM a `@tauri-apps/api` pro IPC. Vývoj: TypeScript, Vite, typy Reactu, Tauri CLI. Rust: Tauri, build helper, `tauri-plugin-dialog` pro nativní dialog a `serde_json` pro kontrolu exportu. Žádná UI knihovna ani testovací framework; čistá logika používá vestavěný Node test runner.

`src/autodarts/` obsahuje klienta lokálního Board Manageru (`LocalBoardClient`), sestavení adresy (`boardAddress`) a parser obálky. `src/inspector/` spravuje obecné zachycené zprávy. React komponenty neinterpretují Autodarts payloady. Rust zatím jen spouští Tauri a ukládá uživatelem vybraný soubor. WebSocket běží přímo ve WebView; CSP proto povoluje `ws:`.

## Omezení a další krok

- Inspektor otevírá jen `/api/events`. Nevolá `/api/config` ani `/api/system`, které obsahují klíče terče, ani žádné ovládací endpointy (start, stop, kalibrace…).
- Bez kamer Board Manager žádné události hodů neposílá. Oficiální simulátor neexistuje.
- Formát událostí zatím známe jen z komunitních zdrojů. Po první skutečné zprávě je potřeba ho ověřit.
- Cloud Autodarts se v0.1 nepoužívá. Důvody a archivovaný výzkum jsou v [docs/autodarts-protocol.md](docs/autodarts-protocol.md).

Lokální API a pravidla: [docs/board-manager-local.md](docs/board-manager-local.md). Výsledky provedených kontrol: [docs/validation.md](docs/validation.md).

## Automatická příprava Windows

Součástí projektu je `scripts/Install-Prerequisites.ps1`. Stahuje oficiální Rust/MSVC instalátory, ověřuje SHA-256 Rustu a podpis Microsoftu, instaluje C++ Build Tools s Windows SDK a Rust stable MSVC, poté spouští testy a frontend build. Přepínač `-RunDev` následně spustí Tauri. Existující vývojové nástroje využije; potvrzení správce Windows je případně nutné provést přímo v systému.

```powershell
.\scripts\Install-Prerequisites.ps1 -RunDev
```

Skript byl syntakticky ověřený. V aktuálním prostředí Codexu se instalace nepodařila provést: terminál po rozšíření oprávnění selhal při obnově prostředí a alternativní runtime měl síťové spojení odmítnuté. Žádný z nových systémových nástrojů proto zatím není potvrzený jako nainstalovaný.
