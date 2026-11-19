# Shooter

Režim přidán do zdrojů 19. 11. 2026 na pokyn uživatele. Navazuje na [průzkum náhodných cílů](nahodny-cil-vyzkum.md); schválený název je **Shooter**.

**Dostupnost:** na navazující pokyn uživatele 19. 11. 2026 má karta na Domů označení **PŘIPRAVUJEME** a je neaktivní. Běžní uživatelé hru z nabídky nespustí, dokud neproběhne skutečné vyzkoušení a nebude znovu povolená. Implementace zůstává zachovaná pro další vývoj a testování.

## Pravidla a ovládání

- 1–8 hráčů včetně stávajících botů. Volitelné náhodné pořadí. Sestava se po startu nemění.
- Náhodná čísla 1–20, nový cíl po každém pokusu, včetně minutí. Bez bezprostředního opakování čísla. BULL se nelosuje.
- Single, double i triple správného čísla znamenají přesně 1 bod. Jiná výseč, MIMO, odraz, timeout a vynechaný pokus znamenají 0 bodů.
- Výchozí hra: **10 kol bez času**. Lze zvolit 5/10/15 kol nebo závod **první na 15 bodů**. Závod nemá limit kol a poslední návštěva končí po patnáctém bodu, třeba už první šipkou.
- Každý hráč má tři pokusy na návštěvu. V režimu na kola se dokončí stejný počet návštěv všem hráčům. Při shodě nejvyššího skóre se vítězství dělí.
- Ruční zadání používá stávající klávesnici S/D/T, 25, BULL, MIMO. Kliknutí na zapsaný pokus umožní jeho opravu. Zpět funguje i přes hranici návštěvy a po dokončení hry.
- Další hráč potvrdí návštěvu; předčasné potvrzení má vlastní dotaz a započte zbývající pokusy jako vynechané. Automatický vstup přepíná až po vytažení šipek.
- Statistiky rozlišují pokusy (včetně timeoutů/vynechání), skutečně zapsané šipky a úspěšnost. Historie obsahuje cíle, skutečné zásahy a body. Průměr X01 se zde nepoužívá.
- Odveta zachová pravidla a sestavu, posune začínajícího hráče a vytvoří nový los. Pamatuje se sestava a pravidla, nikoli rozehraná hra.

## Časovaná hra

Volby **bez limitu / 10 / 15 sekund na šipku**. Časovaná varianta je určená pro Autodarts; během ručního zadávání se čas nepočítá. Boti mají vlastní běžné tempo hodů.

1. Hráč potvrdí **Připravit hod** a proběhne odpočet 3–2–1.
2. Každá přijatá fyzická šipka dostane aktuální cíl. Po přijetí se ukáže další cíl a obnoví čas na další šipku. Oprava již přijaté šipky nepřelosuje cíle.
3. Timeout spotřebuje právě jeden pokus a uloží do něj **ČAS**. Hra se pozastaví. Zbývající cíle se nezačnou automaticky odpočítávat.
4. Hráč vytáhne všechny fyzické šipky a stiskne **Pokračovat**. Po odpočtu pokračuje zbývajícími pokusy téže návštěvy. Po třetím pokusu potvrzení přejde k dalšímu hráči.
5. Jakékoliv pozdní šipky během čekání po timeoutu se pouze sledují pro vyprázdnění terče a nebodují. Počet pokusů se neodvozuje od počtu šipek v terči.

Pauza, ztráta spojení, nepřipravený terč, vytahování, oprava, otevření statistik či nastavení a skrytí/opuštění stránky zruší běžící odpočet. Obnovení vyžaduje potvrzení a nový odpočet, poskytující celý limit. Šipka hozená před koncem odpočtu nebo během pauzy se nepřiřadí novému cíli; je třeba terč vyprázdnit. Dřívější platné pokusy zůstávají zachované.

Limit používá monotónní čas aplikace a **okamžik přijetí rozpoznaného hodu**, nikoli nezávisle měřený čas fyzického dopadu. Příjem přesně na hranici nebo později znamená timeout. Prodlevu na skutečném terči je ještě potřeba fyzicky vyzkoušet.

## Implementace

- `src/game/shooter.ts`: čistá pravidla, replay a stabilní los ze seedu uloženého při startu. Zpět a opravy nemění budoucí cíle. Každá návštěva má vlastní náhodné cíle, všichni hráči nedostávají společnou posloupnost.
- `src/game/shooterStore.ts`: Autodarts, ruční zásahy, opravy, časování, boti, oznámení hráče, záznamy a oslava výsledku. Používá generický `BoardGameInput`; prefix zachovává pokusy před timeoutem/odstraněním fyzických šipek. Board Manager 2.0 i 2.1 čte stávajícím parserem.
- `src/pages/ShooterPage.tsx`, `src/components/ShooterScoreboard.tsx`, `src/shooter.css`: nastavení, hráči, velké číslo cíle, zvýrazněná celá výseč, klávesnice a statistiky. Vzhled se sdílí s TV.
- `src/game/activeGame.ts`, `src/App.tsx`, `src/connection.ts`: start/ukončení režimu, ochrana rozehrané hry, příjem fyzických stavů a ztráta spojení.
- `src/cast/protocol.ts`, `localCast.ts`, `receiver.tsx`: nový diskriminant `shooter` v protokolu v1, validace a přenos aktuálního cíle, skóre, zásahů a časomíry. Historie celého zápasu se na TV neposílá. Čas řídí počítač.
- Hlasatel oznamuje start a hráče. Součty šipek ani losovaná čísla se samostatně nehlásí; nebyly přidány zvukové soubory ani závislosti.

## Ověření a vydání

- **233 Node testů prošlo**, včetně 15 nových testů Shooteru: pravidla, stabilní los, opravy, konec/remíza/závod, TV validace, Autodarts obou formátů, opakované snímky, částečné vytažení, start se starými šipkami, timeout bez fyzického hodu, pozdní/předčasný hod, hranice času, pauza, reconnect, kalibrace, zachování bodů při obnovení a bot.
- V existujícím testu sestavy X01 aktualizováno očekávání o již dříve přidané pole `checkoutSetupEnabled`; funkce X01 se kvůli tomu neměnila.
- TypeScript a oba frontendové buildy prošly. Logy: `.test-tmp/shooter-all-tests.log`, `shooter-build.log`, `shooter-cast-build.log`.
- V nativní vývojové aplikaci Windows ověřena nová karta, nastavení, hra se dvěma účastníky, velké číslo, zvýrazněná výseč a ruční zásah za bod s přechodem na nový cíl.
- Fyzický Autodarts, skutečný čas dopadu a zobrazení na fyzické TV zatím neověřeny. TV receiver je připravený ve zdrojích a v `dist-cast`, **dosud nenasazený**; veřejný receiver z předchozího nasazení Shooter neumí.
- Verze aplikace zůstává **0.1.14**. Nové instalační balíčky nebyly vyžádány ani sestaveny; vydané balíčky tento režim neobsahují.
