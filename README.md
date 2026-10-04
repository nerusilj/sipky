# Darts CZ · v0.1 WebSocket inspektor

Lehký desktopový základ v Tauri 2, Reactu, TypeScriptu a Vite. Rozhraní je česky, tmavé s oranžovým akcentem. Žádná herní logika ani databáze.

**Stav: základ inspektoru připravený, živá integrace zastavená na registraci OAuth aplikace. Milník v0.1 zatím není dokončen.** Tlačítko Připojit vysvětlí překážku; nevytváří spojení a nezobrazuje simulované události.

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

- Čitelné rozhraní inspektoru, viditelný stav připojení, kanál/téma, detail formátovaného JSON a přepnutí na přesný raw text.
- Filtrace podle kanálu, směru a obsahu. Nejnovější zprávy první, nejvýše 100 řádků najednou.
- Kruhový buffer nejvýše 10 000 zpráv a hrubý textový rozpočet 32 MiB. Odhad není měření skutečného heapu. Jeden raw rámec smí mít nejvýše 2 Mi znaků; větší se nezachová a započítá se jako vyřazený.
- Pozastavení zmrazí snapshot UI; přidávání do úložiště pokračuje nezávisle. Vymazat odstraní buffer i snapshot a vynuluje počítadla.
- Export JSONL přes nativní Tauri dialog; ukládá celý aktuální buffer, nikoli jen filtr nebo zmrazený pohled. Žádné indexy vyhledávání v exportu. Časy ISO 8601 UTC s milisekundami (`Z`); seznam používá místní čas.
- Parser zachová celé obálky, neznámá pole, chyby odběru i neplatný JSON. Nedělá závěry o hodech či skóre.

## Závislosti a struktura

Runtime JS: pouze React, React DOM a `@tauri-apps/api` pro IPC. Vývoj: TypeScript, Vite, typy Reactu, Tauri CLI. Rust: Tauri, build helper, `tauri-plugin-dialog` pro nativní dialog a `serde_json` pro kontrolu exportu. Žádná UI knihovna ani testovací framework; čistá logika používá vestavěný Node test runner.

`src/autodarts/` obsahuje hranici klienta, autentizaci a parser obálky. `src/inspector/` spravuje obecné zachycené zprávy. React komponenty neinterpretují Autodarts payloady. Rust zatím jen spouští Tauri a ukládá uživatelem vybraný soubor.

## Omezení a další krok

Registrace vlastního veřejného OAuth klienta není doložená. Nepoužíváme ID oficiálního Play, sdílené cookies, hesla ani ručně zkopírované tokeny. Autentizační abstrakce úmyslně vrací vysvětlení překážky. Síťový transport, discovery terčů a reconnect ještě nejsou implementované; neexistují žádné mutující herní endpointy.

1. U Autodarts zaregistrovat veřejný klient **Darts CZ** s PKCE a loopback redirect URI; alternativně požádat o povolení device grant.
2. Ověřit přihlášení na aktuální `.com` doméně; tokeny držet v paměti, automaticky obnovovat a nikdy nevkládat do logu.
3. Ověřit čtení seznamu terčů, získání WS ticketu a vlastní spojení. Po první skutečné zprávě se zastavit a prohlédnout ji, jak požaduje zadání.
4. Teprve potom potvrdit odběry, chování při již běžícím zápase a reconnect (např. 3–60 s s exponenciálním backoffem).

Podrobné ověřené nálezy a otevřené otázky: [docs/autodarts-protocol.md](docs/autodarts-protocol.md). Výsledky provedených kontrol: [docs/validation.md](docs/validation.md).

## Automatická příprava Windows

Součástí projektu je `scripts/Install-Prerequisites.ps1`. Stahuje oficiální Rust/MSVC instalátory, ověřuje SHA-256 Rustu a podpis Microsoftu, instaluje C++ Build Tools s Windows SDK a Rust stable MSVC, poté spouští testy a frontend build. Přepínač `-RunDev` následně spustí Tauri. Existující vývojové nástroje využije; potvrzení správce Windows je případně nutné provést přímo v systému.

```powershell
.\scripts\Install-Prerequisites.ps1 -RunDev
```

Skript byl syntakticky ověřený. V aktuálním prostředí Codexu se instalace nepodařila provést: terminál po rozšíření oprávnění selhal při obnově prostředí a alternativní runtime měl síťové spojení odmítnuté. Žádný z nových systémových nástrojů proto zatím není potvrzený jako nainstalovaný.
