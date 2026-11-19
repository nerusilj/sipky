# Předání projektu Šipky

Aktualizováno 19. 11. 2026. Před zahájením práce si projdi také `AGENTS.md` a postup pro nový klon v `README.md`.

## Linux release 0.1.16 — oprava doplňků zveřejněna 19. 11. 2026

- [Šipky 0.1.16](https://github.com/nerusilj/sipky/releases/tag/v0.1.16) jsou zveřejněné a API `releases/latest` je potvrzuje jako nejnovější stabilní vydání. [GitHub Actions 44602195704](https://github.com/nerusilj/sipky/actions/runs/44602195704) úspěšně sestavil a publikoval **pouze aplikaci** `sipky_0.1.16_amd64.deb` (**9 854 216 B**, přibližně 9,9 MB), `linux-components.json` a `SHA256SUMS.txt`. Žádný nový DEB zvuků ani hlasatele v tomto vydání není. WSL se nepoužilo.
- Na pokyn uživatele je odstraněná zbytečná aktualizace doplňků z 0.1.15. Manifest i skutečné závislosti DEB znovu používají **zvuky 1.0.1 z v0.1.10** (26 843 588 B, 26,8 MB) a původní **hlasatel 1.0.0 z v0.1.8** (434 736 092 B). Obsah `public/sounds` je v tagu v0.1.16 přesně shodný s v0.1.10; všechny vstupy balíčku hlasatele jsou přesně shodné s v0.1.8. Také CI tyto shody a dostupnost původních DEB ověřilo.
- Odstraněny dvě nepoužívané nahrávky „Radkovina!“ a jejich metadata, generování a povolení v Rust IPC. Změna `speech_engine.py` byla pouze podporou rychlosti těchto nahrávek a je odstraněná spolu s odpovídajícím voláním generátoru. **Radkovina má dál pivní animaci a standardní součet 29.** Starší poznámky o nutnosti nového hlasatele kvůli této změně už neplatí. Hlasy, model, ostatní zvuky i herní pravidla jsou zachované. Shooter dál **PŘIPRAVUJEME**, `available: false`.
- Aktualizace z 0.1.14 nebo 0.1.15 používá již nainstalované kompatibilní doplňky a stahuje jen aplikaci. Již nainstalované zvuky 1.0.2 / hlasatel 1.0.1 mohou zůstat; nevynucovat downgrade ani nové stažení. První instalace nebo chybějící/starší doplňky dál vyžadují uvedené původní balíčky.
- Prošlo **233 Node testů, 13 Rust testů v Linuxu**, TypeScript, frontend a kontrola aplikace v DEB. Místně také 12 Rust testů ve Windows a kontrola syntaxe obou Python skriptů. Stažené tři soubory mají ověřené velikosti, SHA-256 z GitHubu a SHA256SUMS; nezávisle přečten control DEB se správnou verzí 0.1.16, architekturou amd64 a minimálními verzemi obou původních doplňků. Výstupy `outputs/linux/0.1.16`, důkaz `github-release-verification.json`, stav `build-status.txt` **COMPLETE**. Log `.test-tmp/linux-release-44602195704.log`, metadata původních doplňků `.test-tmp/original-linux-components.json`.
- Zdroj vydání: commit **`8a1d0e0`**, tag **`v0.1.16`**, větev **`codex/release-0.1.16`**. Vzdálená `main` zůstává na `d34cf08`; další práci vést ve stávající vydávací větvi. TV receiver se znovu nenasazoval. Fyzická instalace, slyšitelný zvuk a terč na cílovém Xubuntu jsou stále následnou kontrolou.

## Linux release 0.1.15 — zveřejněno 19. 11. 2026

- [Šipky 0.1.15](https://github.com/nerusilj/sipky/releases/tag/v0.1.15) jsou zveřejněné a API `releases/latest` je potvrzuje jako nejnovější stabilní vydání. [GitHub Actions 44593827227](https://github.com/nerusilj/sipky/actions/runs/44593827227) úspěšně sestavil a publikoval všechny tři DEB na Ubuntu 24.04. **WSL se nepoužilo.**
- Balíčky: `sipky_0.1.15_amd64.deb` **9 853 390 B**, `sipky-zvuky_1.0.2_all.deb` **26 952 522 B**, `sipky-hlasatel_1.0.1_amd64.deb` **434 871 114 B**. Zveřejněny také `linux-components.json` a `SHA256SUMS.txt`. Vše staženo do `outputs/linux/0.1.15`, velikosti a SHA-256 všech pěti souborů odpovídají metadatům GitHubu; DEB a manifest také zveřejněnému seznamu SHA256SUMS. Nezávisle přečten control všech DEB: správné Package, Version, Architecture a závislosti aplikace na nových doplňcích. Důkaz `outputs/linux/0.1.15/github-release-verification.json`, stav `build-status.txt` **COMPLETE**.
- Linuxové CI: **233 Node testů, 13 Rust testů**, TypeScript, produkční frontend, kontrola obsahu a velikosti aplikace, shoda zvuků se zdroji a skutečná syntéza obou hlasů z rozbaleného nového DEB hlasatele. Místně před odesláním prošlo také 233 Node testů a 12 Rust testů ve Windows. Úplný log `.test-tmp/linux-release-44593827227.log`.
- Vydání aktualizuje aplikaci **0.1.15**, zvuky **1.0.2** a hlasatel **1.0.1**. Nové verze doplňků jsou potřeba kvůli změně `public/sounds` a `scripts/speech_engine.py`; Eliška, Martin i hlasový model zůstávají stejné. Stávající linuxový aktualizátor si nové doplňky stáhne podle manifestu. Ruční instalace vyžaduje všechny tři nové DEB společně. Shooter zůstává **PŘIPRAVUJEME**, `available: false`; tato blokace je v ověřeném vydávacím commitu.
- Zdroj vydání je commit **`ca8e37b`**, vzdálená větev **`codex/release-0.1.15`** a tag **`v0.1.15`**. Přímý push do `main` odmítla automatická kontrola; bezpečnou alternativou bylo vydání z oddělené větve. **Vzdálená `main` zůstává na `d34cf08`**, změny vydání do ní nejsou začleněné. Pokračovat ve stávající pracovní větvi, nepřepisovat práci čistým checkoutem. TV receiver se tímto vydáním znovu nenasazoval. Instalace na cílovém Xubuntu, slyšitelný výstup a fyzický terč zbývají ověřit při hraní.

## Linux release 0.1.14

- Linuxový release 0.1.13 byl zastaven, protože release build nepředával veřejné ID Google Cast. Release skript ve verzi 0.1.14 předává výchozí ID `1A195F93` a kontroluje jeho přítomnost v sestaveném frontendu. Používá stávající balíčky zvuků 1.0.1 z v0.1.10 a hlasatele 1.0.0 z v0.1.8.
- [Šipky 0.1.14](https://github.com/nerusilj/sipky/releases/tag/v0.1.14) byly sestaveny a zveřejněny na Ubuntu runneru GitHub Actions z commitu `5490210`. Workflow `43880742372` prošlo. SHA-256 staženého DEB a manifestu souhlasí. Instalace na Xubuntu a fyzický test TV zbývají.
- Kompatibilita se staršími TV se v tomto release kroku neupravovala.

## Projekt a způsob práce

- Šipky, původně Darts CZ, používají React, TypeScript, Vite a Tauri/Rust. Pro práci na dalším počítači použij klon `https://github.com/nerusilj/sipky.git`.
- Piš česky. Uživatel očekává provedení dohodnutých úprav bez opakovaného dotazování. Instalace potřebných nástrojů je obecně povolená, nadále respektuj skutečná oprávnění prostředí.
- Vývoj probíhá ve Windows; cílová produkce je Xubuntu 26.04 x86_64. Uživatel má dual boot. Při spuštění projektu chce nativní aplikaci, ne pouze webovou stránku.
- Při práci ve stávajícím checkoutu zachovej případné rozpracované změny. Staré Piper hlasy byly záměrně odstraněny.

## Bezprostřední stav a další práce

- **Shooter dočasně nepřístupný 19. 11. 2026 na pokyn uživatele:** karta na Domů má označení **PŘIPRAVUJEME** a `available: false`, takže ji nelze spustit. Uživatel chce režim zpřístupnit až po skutečném vyzkoušení. Herní implementace zůstává zachovaná. Pro tuto drobnou změnu použito stávající označení a blokování nedostupných režimů; instalační balíčky ani TV receiver se neměnily.

- **Shooter přidán do zdrojů 19. 11. 2026.** Uživatel schválil nový režim a výslovně zvolil název Shooter. Domů nabízí třetí kartu. Pravidla: náhodný cíl 1–20 po každém hodu bez bezprostředního opakování, správná výseč S/D/T za 1 bod, 1–8 hráčů včetně botů, 5/10/15 kol (výchozí 10) nebo první na 15 bodů, při shodě po kolech společné vítězství. Čas volitelně 10/15 s pro Autodarts, výchozí bez limitu. Timeout spotřebuje jediný pokus, zastaví hru a vyžaduje vyprázdnění terče a potvrzení pokračování s odpočtem 3–2–1; pozdní hody nebodují. Ruční zadávání čas pozastaví. Stabilní los je uložen seedem, opravy/Zpět jej nemění. Doplněn příjem obou formátů Autodarts, opravy, statistiky, záznamy, ochrana rozehrané hry, boti a TV snapshot/validace/zobrazení. Hlasatel hlásí start a hráče, nikoli součty nebo losovaná čísla. **233 Node testů, TypeScript a oba frontendové buildy prošly.** U stávajícího testu X01 pouze doplněno očekávání již dříve přidaného `checkoutSetupEnabled`; jeho funkce se neměnila. Nativní Windows: ověřena karta, nastavení, dva účastníci, velký cíl, zvýrazněná výseč a ruční zásah +1 s přechodem na nový cíl. Fyzický Autodarts, hraniční prodleva rozpoznání a fyzická TV zbývají. **Veřejný TV receiver dosud nebyl aktualizován pro Shooter** (kód a `dist-cast` připravené); vydané instalační balíčky 0.1.14 Shooter neobsahují. Verze ani instalátory se na tento pokyn neměnily. Podrobnosti `docs/shooter.md`, logy `.test-tmp/shooter-{all-tests,build,cast-build}.log`.

- **Průzkum nového režimu 19. 11. 2026:** uživatel popsal losování čísla k zásahu a možný časový limit. Nejbližší doložená varianta je Shoot-Out (Carromco: 10 sekund na šipku, nový cíl po každém hodu, zásah za 1 bod, první na 15); existuje i Random Shoot a odlišný Random Checkout pro losované zavírání. Přímou obdobu Shooter s náhodnými cíli a 10 koly uvádí Dart Arena. Veřejné zdroje, porovnání aplikací a návrh pro Šipky jsou v `docs/nahodny-cil-vyzkum.md`. Navržený název **Náhodný cíl**, základ 10 kol a 1 bod za správnou výseč, čas volitelně. Jde pouze o návrh; přesná hra ani pravidla zatím nejsou potvrzené. Důležitý bod pro časovaný Autodarts: timeout spotřebuje pokus bez fyzické šipky a pozdní hod se nesmí přiřadit dalšímu cíli. Herní kód, verze, instalátory ani TV receiver se tímto průzkumem neměnily; testy ani build nebyly potřeba.

- **TV receiver aktualizován a zveřejněn 19. 11. 2026.** Na pokyn uživatele nasazena Radkovina včetně pivních čísel 7, 19, 3, souběžného plnění, pěny nápisu a většího prsknutí. Přenos používá `lastEffect`, aby TV nepřišla o efekt, když další snímek už obsahuje skončenou animaci; receiver přehraje každý nový klíč jednou po celou délku. Staré pole `effect` kvůli starším receiverům stále odesílá pouze Ambrožovku. Cílený commit **`d34cf08`** byl odeslán do `main`: 17 souborů efektu, Castu, potřebné ukázky a testů; ze sdíleného CSS pouze blok Radkoviny, bez ostatních rozpracovaných úprav. Ostatní změny pracovního stromu zůstaly zachovány. Samostatná příprava v `.test-tmp/cast-publish-20261119` prošla TypeScriptem, TV buildem a 16 cílenými testy. [Workflow 44540164002](https://github.com/nerusilj/sipky/actions/runs/44540164002) úspěšně sestavil a zveřejnil receiver. Přes HTTPS ověřeny nové soubory `receiver-DoOJHpuq.js`, `receiver-bOEl2May.css` a všechny tři PNG (bajtově shodné s místními); protokol je v `.test-tmp/cast-deploy-verification.json`. Veřejná adresa zůstává `https://nerusilj.github.io/sipky/receiver.html`. **Uživatel má odpojit a znovu připojit TV v aplikaci, aby běžící Chromecast načetl nový receiver; fyzické zobrazení na TV zatím nepotvrzeno.** Otevřená rozehraná hra se nerestartovala. Instalační balíčky ani verze aplikace se neměnily.

- **Pistole s praporkem kompletně odstraněna 19. 11. 2026 na pokyn uživatele.** Odstraněno pravidlo a losování, komponenta, CSS, přenos součtu efektu přes Cast, samostatný přehrávač i časování výstřelu, PNG a WAV, generovací skript, specifické testy a související dokumentace. Nabídky DEV a Nastavení se odvozují od pravidel a už ji nenabízejí. Zrušena také podpora jejího WAV v Rust IPC a požadavek v kontrole Linux balíčků. Dodatečná verze komponenty zvuky kvůli tomuto výstřelu už není potřeba. Zdrojové složky `src`, `public`, `scripts`, `tests` a oba nové frontendové výstupy neobsahují provozní reference ani soubory tohoto efektu; odstraněna i jeho zbylá kopie WAV z debug resources. Prošlo **45 cílených Node testů** (efekty, zvuky, Cast, X01, Cricket a ticho mimo hru), TypeScript, oba frontendové buildy a kontrola diffu upravených souborů. Nativní EXE se po odstranění znovu nesestavoval, protože v otevřené aplikaci mezitím běží rozehraná hra; frontend používá aktuální Vite zdroje. Instalační balíčky ani nasazený receiver se neměnily.

- TV část podporuje zbývající Radkovinu, Ambrožovku a konfety pomocí sdílených komponent. Hlasatel a zvuk běží na počítači. Aktuální Radkovina byla následně 19. 11. 2026 také zveřejněna, viz stav nasazení výše.

- Další doladění Radkoviny 19. 11. 2026: nápis má samostatnou bílou pěnovou vrstvu s jemnou strukturou na horních hranách písmen; objeví se při dokončování společného plnění. Prsknutí bylo znovu mírně zvětšeno: 10 kapek na místo místo 8, velikost 4,2–6,3 px, rozlet o 12 % širší a o 10 % vyšší, délka 0,8 s. Nástup zůstává bez další prodlevy a bez obláčku. V nativní aplikaci Windows v DEV vizuálně ověřena viditelná pěna nápisu a větší rozlet kapek. Prošel TypeScript a oba frontendové buildy. Kontrola diffu upravených souborů prošla; celkový diff nadále hlásí nesouvisející koncové mezery v `PlayerName.tsx`. Instalační balíčky ani nasazený receiver se neměnily.

- Nápis **RADKOVINA!** byl 19. 11. 2026 posunut trochu níž (z 13 % na 16 % výšky plochy) a také se plní pivem: průsvitný skleněný obrys překrývá jantarová výplň s jemnou strukturou bublinek a světlým pěnovým okrajem. Nápis i všechna čísla sdílejí proměnné časování na `.beer-numbers`: zpoždění 0,4 s a délku plnění 2,1 s, se stejným průběhem odspodu. Při omezeném pohybu je nápis rovnou vyplněný. Prošel TypeScript, oba frontendové buildy a kontrola diffu. Vizuální kontrolu v nativních Windows zatím překryl nový dotaz firewallu pro Node.js; uživatel byl požádán o ruční zavření přes Zrušit (computer-use nesmí ovládat bezpečnostní dotazy). Vite byl znovu spuštěn mimo sandbox na 127.0.0.1:1420 a nativní vývojové okno je otevřené. Instalační balíčky ani nasazený receiver se neměnily.

- Prsknutí Radkoviny zvětšeno 19. 11. 2026: kapky jsou o 50 % větší (3,6–5,4 px), z každého místa jich vyletí 8 místo 6, rozlet je vyšší a širší. Výstřik trvá 0,75 s místo 0,65 s; nástup zůstává bez prodlevy u doplnění pěny, bez obláčku. Prošel TypeScript, oba frontendové buildy a kontrola diffu. Nativní ukázka se při této změně velikosti samostatně nepřehrávala. Instalační balíčky ani nasazený receiver se neměnily.

- Radkovina upravena 19. 11. 2026 podle dalšího požadavku: **bez obláčku/oparu, pouze krátké prsknutí kapek**. Odstraněn prvek i CSS animace oparu. Prsknutí bylo posunuto z 2,54 s na přibližně **1,83 s** od začátku, aby navazovalo na vizuální doplnění pěny při pozvolném dojezdu plnění. Společné plnění zůstává 2,1 s a délka efektu 5 s. Prošel TypeScript, oba frontendové buildy a kontrola diffu. Tato drobná úprava se v nativním okně samostatně nepřehrávala; instalační balíčky ani nasazený receiver se neměnily.

- Další doladění Radkoviny 19. 11. 2026: společné plnění zpomaleno z 1,8 s na **2,1 s**. Po dokončení (0,4 + 2,1 + 0,04 s od začátku) nad pěnou krátce vystříknou jemné kapky a zvedne se měkký opar jako při došumění nalitého syceného nápoje. Opar se rozptyluje 1,25 s, kapky 0,65 s; u čísla 19 jsou dvě místa nad jedničkou a devítkou. Efekt běží jednou a při omezeném pohybu se skryje. Celková délka Radkoviny zůstává 5 s, hlasatel dál hlásí 29. Prošel `pnpm check` a oba frontendové buildy; v nativních Windows vizuálně ověřeno pomalejší souběžné plnění, výstřik kapek a rozptýlení oparu. Logika skóre se neměnila, Node testy se pro tuto vizuální úpravu znovu nespouštěly. Instalační balíčky ani nasazený receiver se neměnily.

- Dolaďení Radkoviny 19. 11. 2026: všechna tři pivní čísla se plní **současně**, po společném zpoždění 0,4 s. Plnění bylo mírně zpomaleno z 1,4 s na **1,8 s**; světlo a nástup bublinek sledují stejnou délku plnění. Celá oslava má dál 5 s. Oba frontendové buildy a kontrola diffu prošly; nativní animace se po této změně časování samostatně nepřehrávala. Instalační balíčky ani nasazený receiver se neměnily.

- **Aktuální Radkovina od 19. 11. 2026:** uživatel schválil variantu PIVNÍ SKLO. Půllitry a tácky nahradila tři samostatná realistická skleněná čísla **7, 19, 3** s jantarovým pivem a pěnou. Komponenta `BeerNumber.tsx` postupně odhaluje pivo odspodu, na konci se ukáže pěna; drobné animované bublinky jsou oříznuté alfa maskou číslic. Nadpis je pouze **RADKOVINA!**, délka zůstává 5 s a hlasatel standardně hlásí **29**. Při omezeném pohybu se zobrazí rovnou naplněná čísla bez bublinek. Nové vlastní podklady `src/assets/effects/radkovina-number-{7,19,3}.png` (každý 1254 × 1254, dohromady asi 3,71 MiB) vznikly vestavěným imagegenem podle schváleného náhledu; přesná zadání jsou v `NUMBER-PROMPTS.json`. Starší fotografie půllitru a podtácku zůstávají jen jako archiv, neimportují se a nejsou ve výsledných buildech. Nepoužívaná komponenta `BeerMug.tsx` odstraněna. V nativních Windows v DEV vizuálně ověřeno plnění i výsledný vzhled; předchozí dotaz firewallu už náhled neblokuje. Prošel `pnpm check`, všech **16 cílených testů** hlášení, zvuků a Castu a oba frontendové buildy. V `dist/assets` a `dist-cast/assets` jsou všechna tři nová čísla. Fyzická TV, Xubuntu a omezený pohyb se vizuálně netestovaly. Instalační balíčky ani nasazený TV receiver se neaktualizovaly.

- Radkovina má ve zdrojích z 18.–19. 11. 2026 realistické podklady: orosený půllitr s ležákem a jemnou pěnou (`src/assets/effects/radkovina-beer-mug.png`, 1024 × 1536) a tenký savý papírový podtácek (`radkovina-coaster.png`, 1254 × 1254). Vlastní PNG vznikly vestavěným imagegenem, zachovávají skutečný alfa kanál; původ a přesná zadání jsou v `src/assets/effects/README.md` a `PROMPTS.md`. Odstraněny kreslené bublinky mimo sklenice, zjemněno světlo a zvedání. Na další pokyn uživatele byly podtácky zmenšeny z 91 % na 64 % šířky pozice (přibližně o třetinu), výška z 50 % na 25 % kvůli plošší perspektivě. Jejich střed je pod dnem sklenice, slabší stín odpovídá tenkému kartonu a čísla vypadají jako potisk. Zůstává pořadí zleva 7, 19, 3 a běžné hlášení součtu 29. Podklady Radkoviny i revolver byly přesunuty z public do zdrojových importů, aby je obsahoval i TV build s relativními cestami. Prošel TypeScript, všech 16 cílených testů hlášení, zvuků a Castu a oba frontendové buildy. Ověřena přítomnost podkladů v `dist/assets` i `dist-cast/assets`; instalační balíčky ani nasazený receiver se neměnily. Konečné vizuální ověření nové Radkoviny v nativním okně zatím čeká na ruční zavření dotazu firewallu Windows pro Node.js; pravidla computer-use nedovolují ovládat bezpečnostní dotaz. Vite byl pro dostupnost z nativní aplikace spuštěn mimo sandbox na 127.0.0.1:1420; logy jsou `.test-tmp/radkovina-vite.log` a `radkovina-vite-error.log`. Nativní vývojové okno je spuštěné.

- Správa hráčů má ve zdrojích kompaktní seznam v jednom sloupci s oblíbeným doublem. Přidávání a editace na stránce Hráči mají formulář široký nejvýše 760 px, náhled vedle jména a oblíbeného doublu a potvrzovací tlačítka dole vpravo. Kategorie avatarů je česky Zábavné. Iniciály a neutrální avatar nabízejí deset barev a šedou volbu Bez barvy. Výchozí vzhled je původní šedý, vlastní odstín se ukládá volitelně jako avatarColor a přenáší se do X01, Cricketu i TV. Kontrola TypeScriptu prošla. Ukládání a odebrání barvy ověřilo 14 cílených testů hráčů a Castu. Dne 18. 11. 2026 vizuálně ověřeno přidávání, editace a jejich zavření v nativní vývojové aplikaci Windows. Tyto úpravy jsou zatím ve zdrojích, instalační balíčky se nesestavovaly.

- Ve zdrojích přibyla Radkovina za singly 19, 3 a 7 v X01. Dne 18. 11. 2026 byl původní efekt výstřelů nahrazen pivním přípitkem: tři vektorové půllitry s pěnou se postupně zvednou a nakloní nad podtácky s čísly zleva 7, 19 a 3 (pořadí upraveno podle uživatele 18. 11. 2026). Nadpis doplňuje „TAK NA ZDRAVÍ!“, animaci bublinky a teplé pozadí. Délka zůstává 5 s, kliknutí efekt zavře; omezený pohyb ukazuje rovnou zvednuté půllitry a čísla. Sdílený `EffectVisual` používá i TV receiver. V nativní vývojové aplikaci Windows ověřena ukázka v DEV, počáteční zakrytí čísel, jejich odhalení a rozestupy vůči nadpisu. Prošel `pnpm check` a všech 13 cílených testů `caller.test.ts` a `castScoreboard.test.ts`. Fyzická TV ani omezený pohyb se vizuálně netestovaly. Změna je ve zdrojích a otevřené vývojové aplikaci, nové instalační balíčky se nesestavovaly.
- Na pokyn uživatele 18. 11. 2026 Radkovina už nepřehrává vlastní hlášku: pivní animace zůstává, hlasatel standardně oznámí součet 29. Pravidlo má `phrase: null` a `replacesScore: false`; DEV nabízí pouze tlačítko Efekt bez zvuku. Test se skutečnou frontou hlasatele a náhradou Audio ověřil jediný soubor `score/29.wav` pro Elišku i Martina, animaci při vypnutém hlasateli a zachování vlastní hlášky Ambrožovky. Prošel `pnpm check` a všech 17 cílených testů hlášení, zvuků, ticha mimo hru a Castu. Slyšitelný výstup této změny se samostatně nekontroloval. Starší WAV Radkoviny zůstávají jako nepoužívané prostředky; samotný tento efekt již nevyžaduje novou komponentu zvuků. Dřívější změna `speech_engine.py` nadále vyžaduje při vydání aktualizaci komponenty `hlasatel`, protože kontrola porovnává tento soubor s předchozím tagem. Změny jsou pouze ve zdrojích, instalační balíčky se nesestavovaly.

- Google Cast aplikace `1A195F93` je podle uživatele ve stavu **Published**. Čekací obrazovka i záhlaví hry na TV zobrazují **ŠIPKY TV**. Panely X01 sdílejí výpočet rozměrů s notebookem a receiver zobrazuje Ambrožovku i konfety ze snapshotu protokolu v1. Prošly oba frontendové buildy a 211 Node testů. Podpora odesílání je součástí Linux vydání 0.1.14. Fyzická kontrola nových efektů a kompatibility s druhou TV zbývá.

- Po tagu `v0.1.12` přibyl vlastní Google Cast Web Receiver pro X01, Cricket a rozhoz. Připojení je přímo na **Domů → Připojit k TV**. Nativní odesílač v Rustu hledá Chromecast v místní síti, ověřuje jeho certifikát a posílá aktuální stav přes kanál Cast. Aplikace si pamatuje naposledy úspěšně připojenou televizi a nabízí připojení jedním kliknutím. Receiver sdílí herní komponenty a používá vlastní plochu 1920 × 1080. Prohlížeč s testovacím SDK zobrazil oba režimy s osmi hráči a živým terčem při 1920 × 1080 a 1280 × 720.
- Prošlo 209 Node testů a 11 Rust testů, včetně spuštění simulovaného receiveru, potvrzení zobrazení, okamžitého odeslání nového stavu a ukončení relace. Nativní vývojové Šipky ve Windows se spustily a tlačítko našlo dvě zařízení. Windows při prvním hledání zobrazil dotaz firewallu. Nastavení firewallu se neměnilo. Vývojové okno a Vite na portu 1420 zůstaly spuštěné.
- `pnpm build:cast` vytvoří `dist-cast/`. Pro první skutečné připojení zbývá nasadit receiver na HTTPS, zaregistrovat testovací Chromecast a vložit přidělené ID jako `VITE_CAST_APP_ID` při spuštění vývojového frontendu. Běžný uživatel po publikování receiveru a sestavení aplikace s tímto ID nic dalšího nezadává. Fyzické ověření na Chromecastu 3 a Xubuntu zbývá. Nový instalátor se nesestavoval. Návod je v `docs/chromecast.md`.
- V nastavení GitHub Pages je jako zdroj vybrané **GitHub Actions**. Ručně spouštěná úloha `.github/workflows/cast-pages.yml` sestavuje receiver z větve `main` a zveřejňuje pouze její televizní výstup.
- Receiver je nasazený na `https://nerusilj.github.io/sipky/receiver.html` z commitu `555eba4`. GitHub Actions `43834308924` skončil úspěšně a HTML, JavaScript i CSS odpovídají přes HTTPS kódem 200. V Google Cast SDK Developer Console je **Custom Receiver** Šipky zaregistrovaný pod App ID `1A195F93` ve stavu **Unpublished**. ID je v místním `.env.local`. Zbývá zaregistrovat testovací Chromecast 3, restartovat jej po stavu **Ready for Testing** a ověřit přenos.
- Domácí Google TV byla podle uživatele přidána do konzole, má stav **Ready for Testing** a byla restartována. Přímý test na zařízení potvrdil ověřené spojení Cast, ale dostupnost App ID `1A195F93` je `APP_UNAVAILABLE` a pokus o spuštění odpovídá `LAUNCH_ERROR: NOT_FOUND` i s výslovným typem `WEB`. Výchozí receiver Google `CC1AD845` je na stejném zařízení `APP_AVAILABLE`. Stránka receiveru a její dva soubory stále odpovídají přes HTTPS kódem 200. Uživatel po opětovném zadání softwarového sériového čísla Cast a restartu domácí Google TV potvrdil funkční přenos. Konzole číslo přepsala na velká písmena. Samotnou příčinu prvního odmítnutí se nepodařilo potvrdit. Zdrojový kód ukazuje důvod odmítnutí; rozpracovaná diagnostická hláška ještě není v běžícím vývojovém okně.
- Televizní receiver zobrazuje vpravo nahoře živý stav Autodarts z nativního spojení, včetně čekání na hru. Barvy a popisky sdílí se spodní herní lištou.

- GitHub Actions úspěšně zveřejnil [Šipky 0.1.11](https://github.com/nerusilj/sipky/releases/tag/v0.1.11) pro Xubuntu x86_64. Vydání zahrnuje ovládání terče Autodarts, živý stav a Reset ve hře X01 i Cricketu a možnost integraci vypnout. Dělený DEB přebírá zvuky 1.0.1 z vydání 0.1.10 a hlasatele 1.0.0 z vydání 0.1.8. Prošla kontrola TypeScriptu, 207 testů Node a 9 testů Rust ve Windows. SHA-256 staženého DEB a manifestu souhlasí. Ověření instalace a fyzického terče na cílovém Xubuntu zbývá.

- Stav ve spodním herním panelu se aktualizuje po doručení zprávy WebSocket. Úvodní snímek se načte při připojení a stav se načte také po ovládacím příkazu. Delší hlášky mohou rozšířit panel a při nedostatku šířky se zobrazí až na dvou řádcích v dosavadní výšce panelu. Hlavní komponenta aplikace odebírá pouze stav spojení, takže její překreslení nespouští každá zpráva terče.

- **Nastavení → Autodarts → Používat Autodarts** je ve výchozím stavu zapnuté a volba se pamatuje. Vypnutí odpojí terč, skryje jeho ovládání, stav a inspektor v DEV. X01 a Cricket lze dál ovládat ručně. Již zaznamenané šipky zůstávají ve hře. Opětovné zapnutí připojí uloženou adresu a při synchronizaci počká na prázdný terč. Zapnutí a vypnutí, změny na Domů, v Nastavení, DEV a v X01 byly ověřeny v nativním okně Windows. Příjem hodů při přepínání ověřen simulací v X01 i Cricketu.

- Stav Autodarts a Reset jsou nyní vlevo uvnitř společného spodního panelu X01 a Cricketu. Stav má barevný text a tečku, Reset malou ikonu a od herních tlačítek jej odděluje tenká linka. V nativních Windows ověřeno na šesti kartách X01 bez posuvníku se stavem obnovování spojení. Prošla kontrola typů a 207 Node testů. Vývojové okno zůstalo otevřené na zkušební hře.

- Na úvodní kartě je ve zdrojích barevný stav detekce z `status`. Živý stav, jeho čtení bez seznamu hodů a přednost WebSocket zprávy před opožděným GET jsou ověřeny simulací.

- Na pokyn uživatele byl odstraněn nový místní export diagnostiky Autodarts. Uživatel chce návrhy na vzdálený příjem hlášení s volitelným přepínačem v Nastavení. Způsob doručení zatím není zvolený.

- Start, Stop a Reset jsou v řádku úvodní karty Autodarts. Nativní požadavky jdou na nastavenou adresu terče. Prošla kontrola typů, 206 testů Node a 9 testů Rust. Ve vývojových Šipkách na Windows byly kliknutím ověřené všechny tři požadavky proti lokálnímu simulátoru a přechody žlutá → zelená → oranžová → zelená. Simulátor je po kontrole vypnutý. Fyzický terč zbývá ověřit. Prázdný stav z resetu může v aktivní hře potvrdit dosavadní kolo. Příkazy a seznam stavů jsou v `docs/board-manager-local.md`.

- Úvodní karta teď ukazuje jedno tlačítko Stop/Start podle stavu detekce a Reset, obě s ikonami. X01 a Cricket sdílejí spodní barevný proužek s živým stavem z Autodarts. V nativní hře X01 ověřeno zobrazení žlutého stavu `starting` z místního Autodarts 2.1.1 a jeho čitelnost v maximalizovaném okně. Prošla kontrola typů a 206 Node testů, včetně stavů vytažení a přepnutí Start/Stop. Kalibrace se spouští z Autodarts.

- V X01 a Cricketu je na pravém konci barevného stavového proužku malé tlačítko Reset s ikonou. Volá stávající příkaz Autodarts a je neaktivní bez spojení nebo během příkazu. Prošla kontrola typů a 206 Node testů. Nové tlačítko zatím nebylo stisknuto na fyzickém terči.

- Samostatný řádek se stavem Autodarts nahradil tmavý štítek s barevnou tečkou a ikonou Reset vlevo od herního ovládání. Je součástí stejného řádku v X01 i Cricketu, takže výška pro karty se vrátila na původní rozměr. V maximalizovaném nativním okně Windows bylo v X01 vidět všech šest karet ve dvou řadách bez posuvníku. Vývojové okno zůstalo otevřené na zkušebním zápase.

- Zdroje pro linuxové vydání **0.1.10** vyžadují doplněk **zvuky 1.0.1**, který přináší fanfáru při dohození v X01 i Cricketu. Offline hlasatel 1.0.0 se přebírá z vydání 0.1.8. Na Xubuntu lze z 0.1.9 použít panel **Verze aplikace** nebo ručně nainstalovat nové DEB aplikace a zvuků v jednom kroku.

- Uživatel odmítl ruční prodloužení posledního „á“ v Eliščině úvodní hlášce „Hra začíná!“ kvůli nepřirozenému zvuku. Ve zdrojích i v nativní vývojové aplikaci Windows je opět původní WAV. Po obnovení prošly dva Rust testy načítání zvuků. Pomalejší varianty celé věty z lokálního Supertonicu jsou zatím k poslechu v chatu a čekají na výběr.

- Původní potlesk při dohození v X01 a Cricketu nahradila uživatelem vybraná [trubková fanfára od PeekabooLabCreative](https://pixabay.com/sound-effects/film-special-effects-11l-victory-sound-with-t-1749487402950-357606/) pod licencí Pixabay. Je ve stávajícím souboru `public/sounds/game/applause.wav`, převedená na WAV a ztišená o 13 dB kvůli souběhu s hlasatelem. Nastavení a ukázka v DEV mají popisek **Konfety a fanfára**. Prošla kontrola typů, 204 Node testů a osm Rust testů ve Windows. WAV byl zkopírován také do prostředků nativní vývojové aplikace Windows. Balíčky 0.1.9 a zvuky 1.0.0 vyšly s původním potleskem.

GitHub Actions zveřejnil [vydání v0.1.9](https://github.com/nerusilj/sipky/releases/tag/v0.1.9) s jediným DEB aplikace (3,90 MiB). Toto vydání přebírá zvuky a hlasatel 1.0.0 z [vydání v0.1.8](https://github.com/nerusilj/sipky/releases/tag/v0.1.8). Kontrolní součty stažených souborů souhlasí. Ve WSL Ubuntu 26.04 prošla simulace závislostí APT a izolovaný přechod z 0.1.8 na 0.1.9 pouze s novým DEB aplikace. Oba doplňky zůstaly ve verzi 1.0.0. Verze a původ doplňků jsou v `scripts/linux-components.json`, postup v `docs/linux.md`. Tag `vX.Y.Z` spouští automatické vydání.

Vydání prošlo 204 testy Node a 7 testy Rust. Kontrolní součty zveřejněných souborů ověřeny po stažení. Ve WSL Ubuntu 26.04 prošla simulace závislostí APT, izolovaný přechod z 0.1.7 a zkušební aktualizace samotné aplikace. Oba doplňky zůstaly ve verzi 1.0.0 a oba hlasy vytvořily WAV. Spuštění rozhraní, slyšitelný výstup a fyzický terč na cílovém Xubuntu zbývají ověřit.

Vydání 0.1.9 přidává panel **Verze aplikace** na dashboardu. Dotazuje se GitHub Releases `nerusilj/sipky`. Dělený DEB na x86_64 stahuje a ověřuje aktualizaci a případné nekompatibilní doplňky, instalaci potvrzuje systém přes PolicyKit a APT. Nová vydání přikládají `linux-components.json`. Windows a AppImage zobrazují stav a odkaz na vydání. Přechod z 0.1.8 na 0.1.9 se provádí ručně.

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
