# Předání projektu Šipky

Aktualizováno 11. 11. 2026. Před zahájením práce si projdi také `AGENTS.md` a postup pro nový klon v `README.md`.

## Projekt a způsob práce

- Šipky, původně Darts CZ, používají React, TypeScript, Vite a Tauri/Rust. Pro práci na dalším počítači použij klon `https://github.com/nerusilj/sipky.git`.
- Piš česky. Uživatel očekává provedení dohodnutých úprav bez opakovaného dotazování. Instalace potřebných nástrojů je obecně povolená, nadále respektuj skutečná oprávnění prostředí.
- Vývoj probíhá ve Windows; cílová produkce je Xubuntu 26.04 x86_64. Uživatel má dual boot. Při spuštění projektu chce nativní aplikaci, ne pouze webovou stránku.
- Při práci ve stávajícím checkoutu zachovej případné rozpracované změny. Staré Piper hlasy byly záměrně odstraněny.

## Bezprostřední stav a další práce

Zdrojová verze je **0.1.9**. GitHub Actions automaticky zveřejnil tři linuxové DEB ve [vydání v0.1.8](https://github.com/nerusilj/sipky/releases/tag/v0.1.8). Samotná aplikace měla 3,21 MiB, statické zvuky 25,49 MiB a offline hlasatel 414,60 MiB. Verze 0.1.9 přebírá oba doplňky 1.0.0 z tohoto vydání. Verze a původ doplňků jsou v `scripts/linux-components.json`, postup v `docs/linux.md`. Tag `vX.Y.Z` spouští automatické vydání.

Vydání prošlo 204 testy Node a 7 testy Rust. Kontrolní součty zveřejněných souborů ověřeny po stažení. Ve WSL Ubuntu 26.04 prošla simulace závislostí APT, izolovaný přechod z 0.1.7 a zkušební aktualizace samotné aplikace. Oba doplňky zůstaly ve verzi 1.0.0 a oba hlasy vytvořily WAV. Spuštění rozhraní, slyšitelný výstup a fyzický terč na cílovém Xubuntu zbývají ověřit.

Ve zdrojích po vydání 0.1.8 je nový panel **Verze aplikace** na dashboardu. Dotazuje se GitHub Releases `nerusilj/sipky`. Dělený DEB na x86_64 stahuje a ověřuje aktualizaci a případné nekompatibilní doplňky, instalaci potvrzuje systém přes PolicyKit a APT. Nová vydání přikládají `linux-components.json`. Windows a AppImage zobrazují stav a odkaz na vydání. Pro první přechod z 0.1.8 je potřeba ruční instalace vydání s tímto panelem.

Prošla kontrola TypeScriptu, 204 testů Node, 9 testů Rust v Ubuntu 26.04 ve WSL a `cargo check --locked` ve Windows. Ověřen formát aktuální odpovědi GitHubu a metadata zveřejněného DEB. Skutečný průchod instalačním dialogem a restartem zbývá ověřit na Xubuntu po vydání.

Linuxové balíčky z 5. 11. 2026 obsahují změny uvedené v sekcích vydání 0.1.7. Níže jsou změny ve zdrojích po 0.1.7.

Před předáním do Gitu prošla kontrola TypeScriptu a všech 204 Node testů. Přípravu Windows, Linuxu a hlasatele popisují `README.md`, `docs/linux.md` a `docs/hlasatel.md`. Testovací vstupy jsou v `tests/fixtures/`.

### Rozpracované změny po vydání 0.1.7

- Společná oslava zavření v X01 i Cricketu přehraje krátký syntetický potlesk (`public/sounds/game/applause.wav`, 1,45 s) při spuštění konfet. Zvuk běží souběžně s hlasatelem a řídí jej hlavní ztišení. Přepínač efektu i ukázka v DEV se jmenují **Konfety a potlesk**.
- WAV se na desktopu načítá stávajícím příkazem `static_audio`. Prošla kontrola typů, všech 197 Node testů, oba cílené Rust testy načítání zvuků a kontrola formátu WAV. Výstup Node testů je v `.test-tmp/checkout-applause-tests.log`.
- V X01 ukazuje karta hráče i statistika vyhraný leg hned po platném dohozu prvního hráče. Ukazatel vychází ze stejného pořadí jako medaile, reaguje na opravu šipky a po dohrání se leg nezapočítá podruhé. Herní pravidla dál dovolují ostatním hráčům dohrát. Kontrola typů a 30 cílených testů X01, rozhozu a oslav prošly.
- Rozhoz přes Autodarts započte každému jednu novou šipku. Mimo střed předá tah automaticky a ignoruje dříve ponechané šipky. BULL a 25 předají tah až po vytažení příslušné šipky. Při naplnění tří pozic hra vyzve k vytažení před dalším hodem. MIMO funguje i s ponechanými šipkami, když terč přijímá hody.
- Zaseknutí reprodukováno v `tests/finishBullOffStore.test.ts` zprávami ve formátu Board Manageru 2.1. Přibyly tři scénáře pro ponechané a opakované šipky, částečné vytažení BULLu a 25, MIMO a vyčištění terče po třetí šipce. Prošla kontrola typů a všech 200 Node testů. Log je v `.test-tmp/bull-off-retained-darts-tests.log`. Zprávy z fyzického částečného vytažení zatím ověřeny simulací. Podrobnosti v `docs/rozhoz-na-stred.md`.
- Tužka v rozhozu otevře klávesnici BULL / 25 / MIMO pro právě rozehraný nebo již zapsaný hod aktuálního kola. Ve výsledcích tlačítko **Upravit výsledek** zpřístupní opravu posledního hodu a šipky pro ruční pořadí. Zavření na nulu mají přednost a jejich pozice zůstávají uzamčené. Potvrzená oprava určuje vítěze i pořadí dalšího legu. Ihned po potvrzení lze přes Zpět znovu otevřít původní výsledek.
- Prošla kontrola typů a všech 203 Node testů. Testy ověřují ruční opravu proti opakovaným zprávám Autodarts, výměnu vítěze, ochranu zavřených hráčů a přehrání následujícího legu s ručně potvrzeným pořadím. Log je v `.test-tmp/bull-off-review-tests.log`.
- Úvodní přehled Autodarts zobrazuje po připojení verzi Board Manageru a stav podpory i bez rozbalení podrobností. Ověřené jsou konkrétní verze 2.0.2 a 2.1.0. Ostatní zobrazuje jako **Podpora neověřena** a při selhání dotazu ukáže **Verzi nelze zjistit**. Obnova spojení načítá čerstvou verzi a opožděné odpovědi z předchozího spojení ignoruje. Prošla kontrola typů a 22 cílených testů terče a připojení.
- V X01 i Cricketu má horní řádek hodů větší čísla (až 36 px), jemné oddělení polí a výšku podle původního rozložení. Oranžová výplň součtu sahá až k okrajům pásu, vlevo má rovnou hranu a vpravo navazuje na jeho zaoblení. Číslo je bílé a stejně velké jako čísla hodů, bez popisku **Součet**. BUST má grafitový vzhled.
- V kartách X01 je součet v posledním poli černého pásu, s bílým číslem a výraznější tenkou svislou linkou před ním. Oranžová výplň součtu je vyhrazená hornímu pásu.
- Na pokyn uživatele 10. 11. 2026 úspěšně přeložena a spuštěna nativní vývojová verze Windows s aktuálním Rust kódem. Vite běží místně na 127.0.0.1:1420. Ověřeno otevření úvodní nabídky X01 a Cricketu. Instalační balíčky se tím nemění.

### Dokončené linuxové vydání 0.1.7

- Výstupy: `outputs/linux/0.1.7/Šipky_0.1.7_amd64.deb` (541 296 548 B; 516,22 MiB) a `Šipky_0.1.7_amd64.AppImage` (581 876 216 B; 554,92 MiB). Cíl Xubuntu 26.04 x86_64, sestaveno v Ubuntu 26.04.1 ve WSL.
- `build-status.txt` je **COMPLETE**, proces skončil kódem 0. Prošlo **197 Node testů**, **7 Rust testů**, TypeScript a produkční sestavení frontendu. Kontrola DEB potvrdila Package: sipky, Version: 0.1.7, ELF x86_64, kompletní linuxový runtime a 368 statických WAV bez namluveného BUST.
- Oba hlasy skutečně vytvořily WAV z rozbaleného DEB. AppImage prošel 12sekundovým startem bez okamžitého pádu; `appimage-startup.log` je prázdný. Jde o kontrolu startu, nikoli vizuální kontrolu nebo slyšitelné přehrání na cílovém počítači.
- SHA-256 obou výsledků byl nezávisle ověřen z Windows; záznam v `package-checksums-verified.json`. Logy, `SHA256SUMS.txt`, seznam změn a `INSTALACE.txt` jsou vedle balíčků.
- Nový skript `scripts/build-linux-0.1.7.sh`, zdrojový archiv `source-0.1.7.tar.gz`, manifest 609 souborů. SHA-256 archivu: `39bc4bcaf557c3093387dcc174d2fa1dae291b20dea39ac83061b0fb39aa375c`. Shoda manifestu se zdroji ověřena před závěrečnou aktualizací dokumentace vydání.
- WSL fungovalo mimo sandbox přes eskalované exec; v sandboxu nadále vrací Wsl/E_ACCESSDENIED. Nebylo potřeba automatizovat terminál ani měnit systémové závislosti.

### Vydáno v 0.1.7: zrušení rozhozu a nezachycené MIMO

- Spodní lišta rozhozu má sjednocený herní vzhled. Vlevo **Zpět**, uprostřed **MIMO**, vpravo křížek **Zrušit rozhoz**. Po zachycení šipky se uprostřed zobrazí **Další hráč**, také pro obnovení pozastaveného bota. Samostatná textová tlačítka pod hráči jsou odstraněná.
- Zrušení obnoví běžnou hru ke skóre, pořadí a hráči před začátkem rozhozu, i po dílčích hodech nebo během vyhodnocování. Zápis MIMO funguje pro člověka bez rozpoznané šipky a předá tah po krátkém zobrazení bez čekání na vytažení.
- `cancelBullOff` v `src/game/x01.ts` zapisuje událost `{ cancelBullOff: true }`. Při přehrání se obnoví stav před prvním kolem rozhozu. Zrušení automatického rozhozu uvolní limit pouze do konce aktuálního legu. Následující leg respektuje původní pravidla. Zpět dokáže zrušení vrátit.
- `cancelGameBullOff` a `markBullOffMiss` v `src/game/gameStore.ts` ruší čekající vyhodnocení a správně synchronizují fyzický stav terče. Dřívější šipky nepřetečou do běžné hry. Záznam obsahuje `game-bulloff-cancel`, MIMO se zapisuje jako běžný hod rozhozu.
- Podrobnosti v `docs/rozhoz-na-stred.md`. Změny obsahují linuxové balíčky 0.1.7.
- Ověření 5. 11. 2026. `pnpm check` a všech **197 Node testů** prošlo (39,0 s), včetně návratu ke skóre před rozhozem, zrušení během vyhodnocování, opětovného příjmu fyzických hodů a zapsání MIMO bez dvojího přepnutí. Výstup je v `.test-tmp/bulloff-cancel-miss-tests.log`.
- Nativní Windows dev aplikace vizuálně ověřena se dvěma hráči. **Zapsat mimo** ukáže MIMO a předá tah druhému hráči. **Zrušit rozhoz** obnoví původní skóre, leg a hráče na řadě. Fyzický terč při kontrole připojený nebyl.
- Přesun akcí do spodní lišty ověřen v nativním Windows okně, včetně zápisu MIMO a návratu k původní hře křížkem. Prošla kontrola typů a 14 cílených testů rozhozu a botů.

### Co zbývá ověřit

- Fyzická hra v Linuxu s Board Managerem 2.1 po instalaci 0.1.7. Oprava parseru, okamžité oslavy a nové ovládání rozhozu jsou v hotových balíčcích, ověření na připojeném terči zatím chybí.
- Viditelnost posuvníku ve výběru hráčů na cílovém Xubuntu. Ověřeno také v archivu zdrojů vydání 0.1.6, že seznam má `overflow-y:auto`. Vzhled pruhu řídí WebKitGTK. Je potřeba rozlišit skrytý pruh od nefunkčního posouvání. Uživatel nyní Linux nemá a téma odložil.
- Slyšitelné přehrání hlášek a efektů na cílovém Xubuntu. Syntéza řeči ze skutečného balíčku je ověřená.

### Zjednodušené ovládání hry

- Uživatel se rozhodl zrušit přidávání a odebírání účastníků v rozehraném X01 i Cricketu. Sestava se vybírá před startem. Odstraněny také nevydané změny herního stavu, záznamové události a cílené testy pro změny sestavy za hry.
- Dole jsou v kompaktní liště Zpět, Klávesnice a Další hráč podle stavu hry. Nahoře je v X01 přímý Rozhoz na střed. Statistiky a rychlé ztišení jsou přímo dostupné v obou režimech. Ozubené kolo otevírá společnou nabídku zobrazení, terče, hlasatele, efektů a odkazu do nastavení aplikace.
- Úpravy jsou součástí linuxového vydání 0.1.7.
- Po odstranění změn sestavy prošel `pnpm check` i všech 192 Node testů (39,5 s). Výstup testů je v `.test-tmp/game-controls-tests.log`.
- Po vizuální revizi se přepínač hlasatele při ztišení v herní nabídce zobrazuje jako neaktivní stejně jako v nastavení. Zpět po spuštění ručního rozhozu obnoví příjem hodů z terče a ruční klávesnici samo neotevře. Ověřeno v nativní aplikaci Windows bez fyzického terče, kontrolou typů a 22 cílenými testy včetně simulovaného hodu z terče po zrušení rozhozu.

### Vydáno v 0.1.7: samostatné ovládání rozhozu

- Uživatel chce rozhodnout aktuální leg rozhozem přímo ze hry a potom pokračovat dalším legem stejného zápasu. Výslovně potvrdil, že se má nejprve dokončit aktuální kolo.
- `src/components/GameToolbar.tsx` má samostatné tlačítko **Rozhoz na střed** pro aktivní X01 ve všech třech pohledech. `src/components/FinishLegDialog.tsx` vysvětlí ukončení legu a nabídne **Spustit rozhoz**; spuštění čeká na dokončení kola a alespoň dva nezavřené hráče.
- `src/pages/GamePage.tsx` už nenabízí rozhoz pod **Konec hry**. Herní engine, zachování dříve zavřených hráčů, výsledky rozhozu i přechod do dalšího legu zůstávají beze změny.
- Původní kontroly této úpravy: `pnpm check` a všech **13 cílených testů** v `bullOffRanking.test.ts` a `finishBullOffStore.test.ts` prošlo. Následně zahrnuto do úspěšného sestavení 0.1.7 a celé sady 197 testů.
- Nativní Windows dev aplikace byla spuštěna přes computer-use. Ověřeno samostatné tlačítko, vzhled a text dialogu, úspěšné spuštění rozhozu a návrat přes Zpět; po zadání S20 dialog vyžaduje dokončit kolo. Bez fyzického terče. Vite běží na portu 1420; pro dosažitelnost z nativního okna bylo nutné spustit server mimo sandbox.

### Potvrzená příčina produkčního problému s Autodarts a provedená oprava

Uživatel hlásil: v Linuxu funguje Autodarts a Dev přijímá zprávy, ale hra nepočítá šipky. Nepomohl restart ani návrat ke starší aplikaci 0.1.3. Windows vývojová aplikace při jiném pokusu fungovala.

Dodaný funkční log z úterý `2026-10-27_18-07-12.jsonl` uvádí Board Manager **2.0.2**. Nedělní log `2026-11-01_17-25-38.jsonl` na řádku 5 ještě uvádí 2.0.2, na řádku 9 po opětovném spojení už **2.1.0**, čas `2026-11-01T16:34:12.748Z` = 17:34:12 SEČ. Řádek 10 už obsahuje nový formát. Další nedělní relace mají také 2.1.0. Záznam dokazuje změnu běžící verze, nikoli kdo nebo jak aktualizaci spustil. Verze Board Manageru z úspěšného pokusu Windows není těmito logy doložená.

Změna formátu:

- 2.0: `throws[i].segment.number / multiplier / name`, `coords.x / y`, `numThrows`, události `Takeout started` / `Takeout in progress`.
- 2.1: `throws[i].segmentNumber / multiplier / segmentName`, `coordsX / coordsY`, chybí `numThrows`, názvy `takeoutStarted` / `takeoutInProgress` / `takeoutFinished`.
- Původní parser požadoval `segment`, takže nepřijal žádný nový zásah; Dev ukládá zprávy před interpretací, proto fungoval. Hypotézy o ručním režimu nebo čekání na prázdný terč byly před dodáním logů pouze hypotézy, nikoli potvrzená příčina.

Oprava už je ve zdrojích:

- `src/autodarts/boardMessages.ts` — sdílené čtení pole šipek a sjednocení textu událostí.
- `src/caller/visitTracker.ts` — oba formáty zásahu a souřadnic, rozpoznání camelCase událostí.
- `src/game/boardInput.ts` — stejné rozpoznání při hře; správné uchování hodů při postupném vytahování.
- `src/autodarts/boardState.ts` — počáteční GET /api/state přijímá také throws bez numThrows.
- Původní surové zprávy zůstávají v inspektoru a záznamu beze změny. Chybný obsah se nepovažuje za prázdný terč. Bouncer nemá souřadnice, kterými by falešně vyhrál rozhoz.
- Samotné `takeoutFinished` NENÍ důkaz prázdného terče: reálná verze 2.1 toto jméno někdy ponechá i u stavu s první novou šipkou. Rozhoduje obsah throws.

Důkazy a testy:

- Původní záznamy jsou uložené lokálně. Očištěné testovací zprávy jsou v `tests/fixtures/`.
- `tests/fixtures/board-manager-2.1-sessions.json`: 522 skutečných stavů z devíti nedělních relací, včetně jednoho počátečního snapshotu. Pouze data terče, bez jmen hráčů a aplikačních metadat.
- `tests/boardManagerCompatibility.test.ts`: parser, souřadnice, bouncer, GET, neúplné vytažení, součet a integrace společného vstupu do X01 i Cricketu; replay každé relace.
- Očekávání byla před změnou parseru spočtena původním enginem nad explicitním převodem do starého formátu. Před opravou nové zprávy vytvořily 0 kol, po opravě odpovídá všech 90 potvrzených kol, jejich skóre, zbytky a rozehrané hody.
- Úterní log: nový parser přijal všech 3 149 uložených výskytů šipek bez odmítnutí (nejde o počet unikátních hodů, snapshoty je opakují).
- `pnpm check` prošel. **Všech 192 Node testů prošlo** (37,4 s).
- Důkazy: `.test-tmp/board-manager-2.1-tests.log`, `.test-tmp/board-format-before.json`, `.test-tmp/board-format-backward-check.json`.
- Podrobný rozbor v `docs/board-manager-local.md`, poslední sekce. Oprava zatím NEBYLA ověřena nainstalovaným novým balíčkem na fyzickém linuxovém terči.

### Vydáno v 0.1.7: okamžité dohození

Uživatel požádal zobrazovat konfety a medaili s pořadím už hned po platné zavírací šipce, bez čekání na vytažení. Implementováno:

- `src/game/gameStore.ts` a `cricketStore.ts` oslavují živý přechod do checkout, ne až přírůstek potvrzené historie; opakované snapshoty ani pozdější potvrzení neoslavují podruhé.
- `playerFinishPlace` v `src/game/x01.ts` vrátí i živé pořadí zavírajícího hráče; `src/pages/GamePage.tsx` podle něj kreslí medaili a stav done ve všech třech pohledech.
- Oprava šipky, která zruší zavření, odstraní medaili. Už spuštěné konfety nelze vzít zpět. Platné zavření po opravě opět spustí oslavu.
- Herní potvrzení, připsání legu a přepnutí hráče nadále čekají na vytažení a dokončení hlášení. Ruční zavření má dosavadní automatické potvrzení po hlášení; běžné ruční kolo čeká na Další.
- `tests/confetti.test.ts` šest případů, následně zahrnuto do úspěšných 192 testů.

## Instalace a sestavování

- Existující `outputs/linux/0.1.6/Šipky_0.1.6_amd64.deb` a `.AppImage` jsou historicky dokončené balíčky, **neobsahují opravu Autodarts 2.1 ani okamžité konfety**. Existuje build-status COMPLETE, verification.log, SHA256SUMS a package-checksums-verified.json. Pouhé znovuodeslání těchto souborů produkční problém nevyřeší.
- Verze 0.1.6 odstranila mluvený BUST; místo něj je jen tlumený zvuk jako pro MIMO. Text BUST zůstává. Byly odstraněny oba namluvené bust.wav, očekává se 368 statických WAV souborů. Nemíchat starou hlášku zpět.
- Nové číslo vydání měnit konzistentně v package.json, src-tauri/tauri.conf.json, src-tauri/Cargo.toml a pouze položce balíčku sipky v Cargo.lock (ne hromadně všechny stejné verze knihoven).
- Postupy: `scripts/prepare-linux-release.py`, `scripts/build-linux-0.1.7.sh`, `scripts/finish-versioned-linux-build.sh`, `scripts/check-versioned-linux-build.sh`, `scripts/verify-linux-packages.py`, podrobnosti `docs/linux.md`.
- Příští verze potřebuje svůj skript a nový zdrojový archiv/manifest. Staré skripty mají pevnou verzi a hash; nelze jim jen předat náhodně změněný archiv.
- Přímé volání WSL dříve opakovaně vracelo Wsl/E_ACCESSDENIED. Při kontrole posuvníku 4. 11. prošlo spuštění WSL mimo sandbox. Ubuntu 26.04.1 má WebKitGTK 2.52.6. Pokus spustit rozbalené vydání 0.1.6 v odděleném testovacím profilu ale skončil při nastavení Tauri chybou `Permission denied (os error 13)`. Vizuální kontrola Linuxu ani nový linuxový build tím potvrzené nejsou. Neobcházet blokace automatizací terminálu, při příštím sestavování ověřit skutečný log a balíčky.
- WSL kompilace používá pracovní složku `/var/tmp/darts-cz-linux.*`, protože kapacita `/tmp` nestačila. Konkrétní cesta je v místním `outputs/linux/workdir.txt`. Obnovu historického symlinku řeší verziované skripty.
- Zachovat úplný lokální hlasový runtime pro Linux a kontrolu obou hlasů. Model je záměrně ponechaný větší; uživatel odmítl měnit model nebo generovat všechna čísla dynamicky.

## Důležité chování a rozhodnutí

- Tři herní pohledy: dlaždice, řádky, aktivní hráč. Max. 8 účastníků, max. 3 sloupce a cílově 6 panelů bez posouvání v maximalizovaném okně; poslední řádek začíná vlevo. Připnutá klávesnice má stejný rozměr panelu, nahoře uprostřed při třech sloupcích, vpravo při dvou.
- Vzhled: tmavý základ, tlumená modrá systémová barva, aktivní hráč oranžový #ee5836. Zelený panel dopočtu #24cb82 s jemnou září jen na něm; bez nápisu Zavřít. BUST bílý text a prasklý grafit. Horní bílé přepínací ikony, oranžový malý editovací symbol. Flat klávesnice má oranžové podtržení násobku. Jednotné přepínače přes SegmentedControl a Toggle.
- X01: rychle 301/501, další 101/201/401/601/701; bez setů. Legy u skóre, počet šipek a průměr aktuálního legu; součet je i v černém pruhu na kartě. Skóre 0 zůstává, pořadí má medaili se stuhou.
- Autodarts přebírá kompletní snapshoty, opravy před vytažením, další hráč až po prázdném terči. Po BUST se další šipky nezobrazují a nehlásí, ale raw hody lze využít při opravě předchozí šipky.
- Ruční klávesnice je součást stránky, spodní tlačítko ji zapne/vypne. Bez křížku, jména hráče a duplicitního Zpět. Horní šipky lze vybírat a opravovat. Animace zápisu jen u nového hodu, ne při střídání ani u součtu.
- Žádná hlášení součtů při volném házení mimo hru. Cricket součet zásahů nehlásí. Žádné pípnutí po třetí šipce ani při vytažení.
- Offline Supertonic 3, hlasy Eliška F1 a Martin M1. Čísla předgenerovaná, jména generovaná a cachovaná lokálně dynamicky. Nový zápas „Hra začíná!“, pak „Hraje {jméno}“. Jména botů se negenerují ani nehlásí; úvod hry zůstává.
- Boti 3 obtížnosti; barevně odlišený robot avatar. Hráči mají sadu avatarů nebo iniciály.
- Sdílená aplikace vždy začíná na Home, bez nabízení pokračování uložené hry. Potvrzení zavření při rozehrané hře. Home má ŠIPKY a stejné panely X01/Cricket, bez posledních hráčů.
- Terč je jeden společný, flat, bez loga/nadpisů/křížku; zapíná se horní ikonou. Tečka a krátký efekt zásahu podle skutečných souřadnic, bez čísel. Nevymýšlet souřadnice ručně zadané šipky.
- Ukončení rozhozem na střed ukončí jen aktuální leg, zachová pořadí již zavřených. BULL > 25 > vzdálenost v mm, remízy opakují jen shodní hráči. Velký čistý terč, vpravo panely účastníků a oranžový aktuální. Bez ručního zadávání vzdálenosti; chybějící souřadnice řeší Zpět a nový fyzický hod. Více v docs/rozhoz-na-stred.md.
- Záznamy desktopové aplikace běží automaticky v Dokumenty/Sipky/zaznamy, samostatný JSONL pro každé spuštění. Dev ukazuje skutečnou cestu a chyby zápisu. Export tlačítkem není nutný pro trvalý záznam.

## Nástroje a spuštění ve Windows

- Připrav Node.js, pnpm, Rust/Cargo a pro hlasatele Python 3.12 podle `README.md` a `docs/hlasatel.md`.
- Kontrola: pnpm check. Testy: node --test tests/*.test.ts (plná sada přibližně 38 sekund). Nejdřív přidej adresář Node do PATH, pokud ho shell nemá. Nevyžaduje to instalační build.
- Vite má port http://127.0.0.1:1420/. Nativní dev executable: src-tauri/target/debug/sipky.exe. Poslední spuštění používalo Vite + tento debug executable; aktuální frontend se načítá z Vite. Pro změny Rustu nestačí pouhý restart starého executable.
- Stav běžících procesů a UI znovu ověř; staré session ID nejsou spolehlivý přenos do nového chatu. Windows UI ovládat přes dostupnou computer-use dovednost a její zdokumentované API.

## Dokumentace pro podrobnosti

`docs/board-manager-local.md`, `docs/herni-rezim.md`, `docs/cricket.md`, `docs/boti.md`, `docs/hlasatel.md`, `docs/rozhoz-na-stred.md`, `docs/linux.md`.

Poslední úprava rozhraní zvýraznila oddělení součtu v černém pásu karty hráče. Tyto změny jsou zatím ve zdrojích. Další instalační sestavení vyžaduje pokyn uživatele a zvýšení verze.
