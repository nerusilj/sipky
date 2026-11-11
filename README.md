# Šipky · v0.1.9

Lokální šipkařská aplikace pro naši hospodu. Spustitelný soubor je `sipky` (Windows `sipky.exe`). Repozitář obsahuje zdroje, testy a návody k sestavení. Instalační balíčky a přenositelný hlasový runtime vznikají místně.

Lokální aplikace v Tauri 2, Reactu, TypeScriptu a Vite. Rozhraní je česky, tmavé s tlumeným modrým akcentem. Obsahuje X01, klasický Cricket s body, správu hráčů a inspektor událostí terče.

**Stav: hry automaticky zpracovávají lokální Autodarts Board Manager (`ws://<host>:3180/api/events`).** Zpracování je ověřené záznamy 1 167 skutečných událostí z 11. 10. 2026 i přehráním přes WebSocket v prohlížeči. Účet Autodarts ani cloud nejsou potřeba. Windows aplikace se sestavuje včetně místního hlasatele. Podrobný návod a rozsah najdete v [herním režimu](docs/herni-rezim.md).

## Předpoklady

- Node.js 22.18+ nebo 24 LTS; pnpm 11 (doporučeno), případně npm.
- Rust stable s Cargo; na Windows toolchain `stable-x86_64-pc-windows-msvc`.
- Windows: Microsoft C++ Build Tools s workloadem **Desktop development with C++**, Windows SDK a Microsoft Edge WebView2 Runtime.
- Linux: nativní knihovny WebKitGTK 4.1, GTK 3, OpenSSL a další balíčky dle distribuce. Přesné příkazy uvádí [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

## Práce na dalším počítači

```sh
git clone https://github.com/nerusilj/sipky.git
cd sipky
pnpm install --frozen-lockfile
pnpm check
pnpm test
```

Rozpracované změny a stav vydání shrnuje [PREDANI.md](PREDANI.md). Postup pro Linux je v [návodu k sestavení](docs/linux.md).

## Spuštění na Windows

Po instalaci závislostí připravte lokální hlasový runtime podle [návodu k hlasateli](docs/hlasatel.md). V adresáři projektu potom spusťte aplikaci z PowerShellu.

```powershell
pnpm tauri:dev
```

Pro samotné rozhraní v prohlížeči: `pnpm dev`, potom `http://127.0.0.1:1420`. Nativní ukládání je dostupné pouze v Tauri.

Zástupce `Šipky` na ploše otevírá přímo `outputs/windows/sipky.exe`. Jde o Windows sestavení se zabaleným rozhraním, které nepotřebuje Node.js, PowerShell ani vývojový server při spuštění. Vedle EXE musí zůstat složka `tts` s přenositelným lokálním hlasatelem a českými modely (přibližně 496 MiB; jeden model pro oba hlasy); při přenosu kopírujte celou složku `outputs/windows`. Kopie zástupce je také v `outputs/Šipky.lnk`. Aplikace používá nainstalovaný WebView2 Runtime. Otevírá se pouze její okno, bez konzole.

Po změnách zdrojového kódu je potřeba zavřít okno aplikace a samostatnou verzi znovu sestavit a zkopírovat na stejnou cestu (zástupce se pak nemění):

```powershell
.\.tools\supertonic-runtime\Scripts\python.exe scripts/prepare-speech-runtime.py
pnpm tauri build --debug --no-bundle
New-Item -ItemType Directory -Force outputs/windows | Out-Null
Copy-Item -LiteralPath src-tauri/target/debug/sipky.exe -Destination outputs/windows/sipky.exe
Copy-Item -LiteralPath src-tauri/target/debug/tts -Destination outputs/windows -Recurse -Force
```

Příprava hlasatele používá prostředí `.tools/supertonic-runtime` s NumPy a ONNX Runtime a model `.tools/supertonic-3/assets`. Složka `.tools` může být v projektu nebo nad ním. Jiné cesty lze zadat přes `--speech-env` a `--assets`. Po změně workeru nebo enginu připravte runtime znovu. Postup instalace, licence i generování čísel popisuje [hlasatel](docs/hlasatel.md).

Pro průběžný vývoj s automatickými změnami rozhraní zůstává k dispozici `pnpm tauri:dev`.

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

- Horní lišta se stavem Autodarts a menu Domů, Hra, Hráči, Nastavení a volitelné DEV. Turnaje zatím nejsou součástí aplikace.
- Domů nabízí hry X01 a Cricket a stav připojení terče.
- **X01 (rychlá volba 301/501, další 101/201/401/601/701)** (dlaždice na Domů nebo sekce Hra):
  - Nastavení: až 8 hráčů, náhodné / zvolené pořadí, 1–5 vítězných legů nebo hra dokola, Double / Straight Out, pořadí dalšího legu, limit kol a počet hráčů, kteří musí zavřít.
  - Přehoz pod nulou, při Double Out i zbytek 1 a nula bez doublu. Po limitu kol rozhoduje rozhoz na střed se souřadnicemi terče a opakováním při shodě.
  - Živé snapshoty průběžně přepočítají všechny šipky, včetně oprav třetí šipky, přehozu či zavření. Běžné kolo potvrdí prázdný terč. Duplicitní reset ani prázdné vytažení nepřidají kolo. U rozhozu se mimo střed tah předá automaticky, u BULLu a 25 se čeká na vytažení příslušné šipky.
  - Zpět odebírá šipky i přes hranici kola a legu. Stav hry se dopočítává z odehraných kol (`src/game/x01.ts`).
  - Nad kartami je společný pás tří šipek a oranžový součet aktuálního kola. Karty ukazují zbytek a checkout. Průměry, body, počty šipek a průběh všech legů se otevírají ikonou Statistiky. Dole uprostřed jsou Zpět, Klávesnice a Další hráč podle stavu hry. Kliknutím na hod v horním pásu lze šipku opravit.
  - Ruční zadání ohlásí uzavřené kolo a počká na Další hráč; Autodarts přepíná po vytažení šipek. Kliknutím na hod v horním pruhu lze opravit právě tuto šipku, včetně první po třetím hodu. Zpět funguje i po konci zápasu. Prázdné ruční kolo vyžaduje potvrzení.
  - Během hry hlasatel hlásí body vyhodnoceného kola (přehoz = zvukový signál a „BUST!“) a efekty reagují na vyhodnocená kola.
  - Aplikace je sdílená: po spuštění se otevře Domů, rozehraný zápas se neobnovuje. Zavření okna nebo zahájení nové hry při běžícím zápase vyžaduje potvrzení. Pamatují se hráči a sestava pro příští hru.
- **Cricket s body:** čísla 20–15 a BULL, 1–8 hráčů, zápas na 1–5 legů nebo dokola. Společná tabulka zásahů, živé body a legy, MPR, historie, klávesnice, opravy horních šipek, terč a hlášení jména dalšího hráče bez hlášení výsledku kola. Standardní pravidla a ovládání popisuje [Cricket](docs/cricket.md). Cut Throat ani No Score zatím nejsou implementovány.
- **Ukončení legu rozhozem:** během X01 použijte tlačítko **Rozhoz na střed** v horní liště. Mezi koly lze nechat všechny nezavřené hráče hodit jednu šipku. BULL a 25 mají přednost, u ostatních zásahů rozhoduje vzdálenost. Shodné skupiny se rozstřelují samostatně. Lze zapsat nezachycené MIMO, opravit zásah i konečné pořadí nebo zrušit rozhoz a vrátit se do legu. Dříve zavření si ponechají pořadí a další leg začne až po potvrzení. Podrobnosti jsou v [návodu k rozhozu](docs/rozhoz-na-stred.md).
- **Hra s botem:** v nové hře zvolte Přidat hráče → Bot. Lehká, střední a těžká obtížnost fungují v X01 i Cricketu a lze je kombinovat s lidmi do celkového limitu osmi účastníků. Bot hází a předává tah automaticky; Zpět ho pozastaví, Další obnoví. Boti se nezapisují do evidence hráčů. Podrobnosti: [Boti](docs/boti.md).
- **Hráči:** přidání, přejmenování a smazání (s potvrzením). Hráč má jméno a přidělenou barvu avataru. Jména se nesmí opakovat, bez ohledu na velikost písmen a diakritiku. Desktopová aplikace ukládá hráče do `Dokumenty/Sipky/hraci.json` bezpečně přes dočasný soubor a přejmenování. Když se soubor nepodaří načíst, úpravy se zablokují, aby se nepřepsal. Při vývoji v prohlížeči jsou hráči jen v localStorage.
- Aplikace se po spuštění sama připojí na uloženou adresu terče. Adresa se mění v Nastavení.
- V horní liště je název podniku (výchozí „HOLICE“, mění se v Nastavení). Dekorativní šipka a její výběr v Nastavení byly odebrány.
- Systémové ovládání má jednotný tlumený modrý akcent (`#86b9d6`), bez výběru barvy v Nastavení. Aktivní hráč si zachovává oranžový panel (`#ee5836`).
- V nové hře se hráči přidávají v dialogu s hledáním (i bez diakritiky) a možností vytvořit nového hráče. Po přidání zůstává dialog otevřený pro další výběr, zobrazuje stav „Ve hře“ a hlídá limit osmi hráčů. Zavře se přes Hotovo, křížek nebo Escape.
- Ve hře je vedle Nastavení ikona reproduktoru: vypne či zapne všechna hlášení a zvuky efektů, při ztišení zastaví právě přehrávaný zvuk. Volba se pamatuje i po restartu; nastavení hlasatele a jednotlivých efektů zůstává zachováno.
- **Dynamická jména:** při načtení, přidání nebo přejmenování hráčů se na pozadí připraví „Hraje …“ ve zvoleném hlasu. WAV se atomicky ukládá do `Dokumenty/Sipky/hlaseni-hracu/<hlas>/<hash>.wav`. Klíč obsahuje normalizované jméno, hlas a verzi hlášky, nikoli ID hráče. Odebrání hráče ze sestavy ani smazání z evidence nahrávku nesmaže; nové přidání stejného jména ji využije. Změna hlasu připraví vlastní variantu. Hra oznámí prvního hráče a dalšího po dokončení skóre, nikoli po konci zápasu. Opožděná příprava nepřehraje staré jméno po změně tahu, opravě nebo ukončení hry. Ztišení i vypnutí hlasatele platí i pro jména. Generování běží offline v desktopové aplikaci; samotný prohlížečový náhled hlásí pouze předem připravené součty.
- Lokální hlasatel používá jediný **Supertonic 3** pro čísla, efekty i jména. **Eliška (F1)** je ženský hlas, **Martin (M1)** mužský. Model je společný, mění se jen hlasový profil. Licence modelu OpenRAIL-M a kódu MIT i licence Pythonu a knihoven jsou ve složce `tts`; přehled obsahuje `tts/CREDITS.txt`.
- **Průběžný bezztrátový záznam na disk** (jen desktopová aplikace): každé spuštění zapisuje do `Dokumenty/Sipky/zaznamy/RRRR-MM-DD_HH-MM-SS.jsonl`. Zapisuje se každá přijatá zpráva (stejný formát jako export) a události aplikace s polem `meta` (`start`, `connect`, `state`, `version`, `disconnect`). Zápis probíhá v dávkách po 250 ms. Při chybě disku řádky čekají ve frontě a zápis se opakuje. Stav záznamu je vidět v DEV.
- **Hlasatel v češtině:** během hry hlásí potvrzené vyhodnocené kolo, při přehozu zazní sestupný signál a „BUST!“ místo nuly; mimo hru jsou volné hody bez hlášení a efektů, příjem i záznam zpráv pokračují. Hlas a vypnutí se volí v Nastavení; DEV nabízí ukázky, efekty a seznam hlášení. Formát je potvrzen skutečnými záznamy terče. Události jsou beze změny ukládány jako `state`, odvozená kola navíc jako `meta: "visit"` a herní vyhodnocení jako `meta: "game-visit"`.
- **Zábavné efekty:** pravidla jsou v `src/effects/effectRules.ts` a každé spouští hlášku a animaci přes celou obrazovku (`EffectOverlay`, asi 3 s, kliknutím jde zavřít dřív). První efekt je **Ambrožovka**: kolo S1, S20 a S5 v libovolném pořadí. Zazní „Ambrožovka!“ místo součtu a ukáže se velký nápis s konfetami. Efekty jdou zapnout a vypnout celkově i jednotlivě v Nastavení. Vyzkoušet je jde v DEV. Zvuky se řadí do fronty, takže se hlášky a součty nepřekřikují. Spuštěné efekty se zapisují do záznamu (`meta: "effect"`).
- **Nahrávky hlášení:** `public/sounds/cs/eliska/` a `public/sounds/cs/martin/`, soubory `score/0.wav` až `score/180.wav` a `fun/ambrozovina.wav`, `fun/bust.wav`. Hlas a zapnutí hlasatele se volí v Nastavení a DEV. Celá sada se generuje místně příkazem `node scripts/generate-voice.mjs`; volitelně `--voice eliska|martin`, `--only score|fun`, `--force`. Hraní ani přehrávání nepotřebuje síť. Generátor používá stejný engine, model a profily jako jména. Parametry a postup jsou v [dokumentaci hlasatele](docs/hlasatel.md).
- **Samostatný záznamník** `tools/zaznamnik.html`: jeden HTML soubor bez závislostí pro sběr událostí u terče bez této aplikace. Otevírá se jako soubor v Chrome/Edge na počítači nebo v mobilu, připojí se na `ws://<adresa>:3180/api/events` a zapisuje stejný JSONL jako aplikace. Na počítači umí průběžně zapisovat do souboru, všude umí kopírovat do schránky a stahovat (volitelně automaticky každé 2 minuty).
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
- Formáty Board Manageru 2.0.2 a 2.1.0 jsou ověřené přehráním skutečných zpráv. Úvodní přehled ukazuje verzi připojeného terče a stav ověření.
- Cloud Autodarts se v0.1 nepoužívá. Důvody a archivovaný výzkum jsou v [docs/autodarts-protocol.md](docs/autodarts-protocol.md).

Lokální API a pravidla: [docs/board-manager-local.md](docs/board-manager-local.md). Výsledky provedených kontrol: [docs/validation.md](docs/validation.md).

## Automatická příprava Windows

Součástí projektu je `scripts/Install-Prerequisites.ps1`. Stahuje oficiální Rust/MSVC instalátory, ověřuje SHA-256 Rustu a podpis Microsoftu, instaluje C++ Build Tools s Windows SDK a Rust stable MSVC, poté spouští testy a frontend build. Přepínač `-RunDev` následně spustí Tauri. Existující vývojové nástroje využije; potvrzení správce Windows je případně nutné provést přímo v systému.

```powershell
.\scripts\Install-Prerequisites.ps1 -RunDev
```

Skript byl syntakticky ověřený. V aktuálním prostředí Codexu se instalace nepodařila provést: terminál po rozšíření oprávnění selhal při obnově prostředí a alternativní runtime měl síťové spojení odmítnuté. Žádný z nových systémových nástrojů proto zatím není potvrzený jako nainstalovaný.

Skóre na herních dlaždicích používá lokálně přibalené písmo Bebas Neue (Dharma Type, SIL Open Font License 1.1). Jméno na dlaždici je běžným systémovým písmem bez černého podkladu. Štítky jmen ve zbytku aplikace používají Barlow Condensed Bold (The Barlow Project Authors, SIL Open Font License 1.1). Soubory obou písem a úplné licence jsou v `public/fonts/`; písma fungují i bez internetu.
