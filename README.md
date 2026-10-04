# Šipky · v0.1

Lokální šipkařská aplikace pro naši hospodu. Spustitelný soubor je `sipky` (Windows `sipky.exe`). Složka repozitáře se zatím jmenuje `darts-cz`.

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

- Rámec aplikace podle návrhu UI: horní lišta se stavem Autodarts, levé menu se sekcemi Domů, Hra, Hráči, Nastavení a DEV. Hra a Hráči jsou zatím jen zástupné stránky; turnaje a statistiky nejsou v plánu v0.1.
- Domů ukazuje skutečný stav spojení s terčem a čas poslední události. Herní dlaždice jsou zatím neaktivní.
- **Hráči:** přidání, přejmenování a smazání (s potvrzením). Hráč má jméno a přidělenou barvu avataru. Jména se nesmí opakovat, bez ohledu na velikost písmen a diakritiku. Na Domů jsou „Poslední hráči“. Desktopová aplikace ukládá hráče do `Dokumenty/Sipky/hraci.json` bezpečně přes dočasný soubor a přejmenování. Když se soubor nepodaří načíst, úpravy se zablokují, aby se nepřepsal. Při vývoji v prohlížeči jsou hráči jen v localStorage.
- Aplikace se po spuštění sama připojí na uloženou adresu terče. Adresa se mění v Nastavení.
- V horní liště je název podniku (výchozí „HOLICE“, mění se v Nastavení) a obrázek ležaté šipky.
- **Průběžný bezztrátový záznam na disk** (jen desktopová aplikace): každé spuštění zapisuje do `Dokumenty/Sipky/zaznamy/RRRR-MM-DD_HH-MM-SS.jsonl`. Zapisuje se každá přijatá zpráva (stejný formát jako export) a události aplikace s polem `meta` (`start`, `connect`, `state`, `version`, `disconnect`). Zápis probíhá v dávkách po 250 ms. Při chybě disku řádky čekají ve frontě a zápis se opakuje. Stav záznamu je vidět v DEV.
- **Hlasatel v češtině:** ze zpráv terče (`state`) sečte šipky kola a po třetí šipce, nebo při vytažení šipek, nahlas ohlásí součet. Hlášení lze vypnout v DEV, kde jde také přehrát kterékoli číslo 0–180 nebo všechna postupně. V DEV je i seznam ohlášených kol. Ohlášená kola se zapisují do záznamu jako `meta: "visit"`. Události hodů jdou přes `onBoardEvent` v `src/connection.ts`, kam se později připojí efekty. Formát zpráv je zatím komunitní a musí se ověřit na skutečném terči.
- **Zábavné efekty:** pravidla jsou v `src/effects/effectRules.ts` a každé spouští hlášku a animaci přes celou obrazovku (`EffectOverlay`, asi 3 s, kliknutím jde zavřít dřív). První efekt je **Ambrožovina**: kolo S1, S20 a S5 v libovolném pořadí. Zazní „Ambrožovina!“ místo součtu a ukáže se velký nápis s konfetami. Efekty jdou zapnout a vypnout celkově i jednotlivě v Nastavení. Vyzkoušet je jde v DEV. Zvuky se řadí do fronty, takže se hlášky a součty nepřekřikují. Spuštěné efekty se zapisují do záznamu (`meta: "effect"`).
- **Nahrávky hlášení** jsou ve dvou hlasech: `public/sounds/cs/jirka/score/` (mužský, asi 11 MB) a `public/sounds/cs/kasandra/score/` (ženský, asi 9 MB), soubory `0.wav` až `180.wav`. Hlas a zapnutí hlasatele se volí v Nastavení (s ukázkou) i v DEV. Vygenerované jsou offline programem [Piper](https://github.com/rhasspy/piper) (MIT):
  - `cs_CZ-jirka-medium`, data CC0,
  - `cs_CZ-kasandra-medium`, autor Ondřej Šimek, licence [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Uvedení autora je povinné a je zobrazené v Nastavení.

  Příkaz: `node scripts/generate-voice.mjs --voice <jirka|kasandra> --piper <cesta k piper.exe> --model <cesta k .onnx> [--only score|fun]`. Hlášky efektů jsou v `public/sounds/cs/<hlas>/fun/`. Piper je mírně náhodný, každý běh soubory přepíše jinými daty, proto přes `--only` generujte jen to, co se změnilo.
  Lze je nahradit vlastními nahrávkami se stejnými názvy. Aby hlasatel mluvil i bez kliknutí do aplikace, okno má ve WebView2 povolené automatické přehrávání.
- DEV je inspektor událostí:
  - Připojení k Board Manageru na nastavitelné adrese (výchozí `127.0.0.1:3180`, zapamatuje se). Pouze naslouchá, nic neodesílá. Při výpadku se spojení obnovuje s rostoucím odstupem 1–30 s.
  - Čitelné rozhraní inspektoru, viditelný stav připojení, typ/kanál zprávy, detail formátovaného JSON a přepnutí na přesný raw text.
  - Filtrace podle typu, směru a obsahu. Nejnovější zprávy první, nejvýše 100 řádků najednou.
  - Kruhový buffer nejvýše 10 000 zpráv a hrubý textový rozpočet 32 MiB. Odhad není měření skutečného heapu. Jeden raw rámec smí mít nejvýše 2 Mi znaků; větší se nezachová a započítá se jako vyřazený.
  - Pozastavení zmrazí snapshot UI; přidávání do úložiště pokračuje nezávisle. Vymazat odstraní buffer i snapshot a vynuluje počítadla.
  - Export JSONL přes nativní Tauri dialog; ukládá celý aktuální buffer, nikoli jen filtr nebo zmrazený pohled. Žádné indexy vyhledávání v exportu. Časy ISO 8601 UTC s milisekundami (`Z`); seznam používá místní čas.
  - Parser zachová celé obálky, neznámá pole, chyby odběru i neplatný JSON. Nedělá závěry o hodech či skóre.

## Závislosti a struktura

Runtime JS: pouze React, React DOM a `@tauri-apps/api` pro IPC. Vývoj: TypeScript, Vite, typy Reactu, Tauri CLI. Rust: Tauri, build helper, `tauri-plugin-dialog` pro nativní dialog a `serde_json` pro kontrolu exportu. Žádná UI knihovna ani testovací framework; čistá logika používá vestavěný Node test runner.

`src/connection.ts` drží jediné spojení s terčem pro celou aplikaci. `src/pages/` obsahuje sekce, `src/components/Icons.tsx` vlastní SVG ikony (žádná knihovna ikon). `src/autodarts/` obsahuje klienta lokálního Board Manageru (`LocalBoardClient`), sestavení adresy (`boardAddress`) a parser obálky. `src/inspector/` spravuje obecné zachycené zprávy. React komponenty neinterpretují Autodarts payloady. Rust zatím jen spouští Tauri a ukládá uživatelem vybraný soubor. WebSocket běží přímo ve WebView; CSP proto povoluje `ws:`.

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
