# Herní režim 301 / 501

## Jak začít

1. V **Hráči** přidejte hráče.
2. V **Nastavení** zadejte lokální adresu Board Manageru (např. `127.0.0.1:3180` nebo IP terče na síti). Při změně adresy nejprve zvolte **Odpojit**, potom **Připojit**.
3. V **Hra** vyberte 301/501, hráče, pořadí a pravidla. Spusťte **Začít hru**.
4. Házejte. Šipky a skóre se průběžně aktualizují. Po dohozu zazní skóre bez pípnutí. Hra počká na vytažení šipek; teprve po skutečně prázdném terči a doznění skóre se přepne hráč a ohlásí jeho jméno. Tlačítko **Další hráč** při běžné hře z terče není potřeba.

Před začátkem nové hry vyjměte staré šipky. Pokud ještě zůstaly na terči, aplikace na vyprázdnění počká. Rozhoz se hraje po jedné šipce; každý hráč ji před pokračováním vyjme.

## Pravidla a opravy

- 1–8 hráčů, 301/501, Straight Out nebo Double Out, 1–5 vítězných legů nebo nekonečné počítání legů.
- Náhodné pořadí nebo pořadí výběru. Další leg buď střídá začínajícího hráče, nebo řadí od hráče s nejvyšším zbytkem po vítěze.
- Přehoz vrátí skóre před návštěvou. Double Out navíc vyhodnotí zbytek 1 a nulu bez doublu jako přehoz.
- Při přehozu se aktivní dlaždice i horní pruh hodů změní na Prasklý grafit: tmavě šedý podklad s jemnými střepy. Skóre zůstává čitelné a **BUST** má běžnou světlou barvu. Oprava na platné kolo vrátí oranžový podklad; po přepnutí hráče se motiv odstraní.
- Limit kol přejde do rozhozu na střed. Bull má přednost před 25, ostatní zásahy rozhodují podle vzdálenosti; shoda se opakuje mezi remizujícími. Odražená šipka má nulu a souřadnice 0,0 jí nedávají výhodu. Bez dostatečných souřadnic lze určit vítěze ručně.
- U tří a více hráčů lze požadovat další zavření; hotoví hráči se přeskakují, ale leg vyhrává první, kdo zavřel.
- Opravy terče se přebírají až do vytažení, i po třetí šipce či zdánlivém zavření. Ubývání šipek při vytažení nemaže jejich skóre.
- **Zpět** vrátí poslední šipku a zobrazí číselník pro správný zásah. Opakovaně lze vracet i starší šipky a rozhodnutí rozhozu. Samostatný formulář pro opravu kola se nezobrazuje.
- Kliknutím na libovolnou zadanou šipku v horním pruhu se otevře klávesnice a vybere se právě tento hod. Malá bílá tužka v oranžovém zaobleném čtverečku označuje vybranou šipku a barevně navazuje na aktivní kartu hráče. Celé pole hodu se neorámuje. Zadání nahradí pouze vybranou šipku a zbytek kola se přepočítá. U dalšího hodu se označí příští prázdné místo. Po dohozu lze stále vybrat kterýkoli zadaný hod. Skrytím klávesnice označení zmizí. Při přehozu se místo horního součtu zobrazí **BUST**; kolo se podle pravidel započítá za nula bodů.
- Oprava jednotlivé šipky z Autodarts se nepřepíše automatickým snapshotem. Další rozpoznané hody se přijímají a vytažení šipek potvrdí opravené kolo. Oprava přežije i obnovení aplikace. Po ručním kroku Zpět se kolo potvrzuje tlačítkem Další hráč.

## Obnova a výsledky

Sestavu vyberete před zahájením zápasu v přípravě hry.

Rozehraná hra i dokončený výsledek se ukládají po změně do úložiště aplikace (localStorage). Po znovunačtení se otevře sekce Hra, zachovají se hráči, pravidla, návštěvy, legy i rozehrané kolo. Hra pracuje s kopiemi hráčů, takže pozdější přejmenování / odstranění hráče nepoškodí rozehraný zápas. Při nedostupném úložišti se zobrazí upozornění.

Při ručním zadání se poslední šipka nejprve zobrazí; po 450 ms začne hlášení skóre bez zvukového signálu. Hráč zůstává na řadě a jeho hody lze opravit. Tři ručně zadané šipky, přehoz, zavření i kratší kolo se potvrzují tlačítkem Další hráč. U kola převzatého z Autodarts potvrzuje kolo vytažení šipek. Po potvrzení a doznění již spuštěného hlášení se přepne hráč a ohlásí jeho jméno; stejné skóre se nehlásí podruhé. Zpět čekající hlášení a přepnutí zruší, včetně hlášení navazujícího na zvuk. Zprávy terče přijaté během dokončování se zpracují po přepnutí, aby se neztratily hody dalšího hráče. I výslovně potvrzené čekající dokončení se obnoví po načtení stránky.

Oprava z terče před vytažením zruší čekající hlášení původního součtu a ohlásí opravený výsledek. Opakované snapshoty téhož kola hlášení nespouští znovu. Při přehozu místo součtu zazní tlumený zvuk chyby a „BUST!“ v nastaveném hlase; neopakuje se po vytažení. Oprava přehozu zastaví původní zvuk nebo hlášení a ohlásí opravený výsledek. Ztišení ikonou reproduktoru zastaví hlasy i všechny herní signály. Tyto signály nejsou zábavné efekty: jejich přehrávání řídí hlavní vypínač zvuku, nikoli vypínač Ambrožovky a konfet.

 Konec zápasu nabízí **Odvetu** nebo **Novou hru**; výsledek lze předtím opravit. Průběh umožňuje prohlédnout všechny legy. Ukončení hry odstraní její obnovovací záznam; dlouhodobý archiv, sety, turnaje a Cricket se touto změnou nezavádějí.

Herní obrazovka využívá celé okno bez horní lišty a boční navigace. Hráči i klávesnice mají shodné rozměry určené pouze dostupným prostorem okna, nikoli počtem hráčů. V řádku jsou nejvýše tři panely. Šířka se pohybuje od 360 do 480 px (na menším okně podle dostupné šířky), výška od 270 do 360 px. Dva řádky (šest panelů při třech sloupcích, včetně otevřené klávesnice) se vejdou už při dostupné výšce 554 px. Neúplný další řádek začíná vlevo pod prvním sloupcem; celá mřížka je v okně vycentrovaná. Další panely se posouvají uvnitř herní plochy; horní hody a spodní ovládání zůstávají viditelné. Při střídání se hráč na řadě automaticky posune do viditelné části. Výběr do jedné hry je omezený na osm hráčů. Hráče na řadě označuje zvýrazněná karta; samostatný pruh Hází / Na řadě se nezobrazuje. Nahoře uprostřed je společný pás aktuálních hodů (tři šipky a skóre bez popisku), který se při přepnutí hráče vyprázdní. Pás i pole mají pevné rozměry, zápis čísla jimi nehýbe. Číslo se objeví krátkým pohybem zleva; při omezeném pohybu v systému se animace vypne. Pod skóre každého hráče je menší tmavý pruh se třemi šipkami a výsledkem kola vpravo, odděleným jemnou svislou linkou. Součet odpovídá stejnému kolu jako zobrazené šipky; při přehozu ukazuje BUST místo nuly. Při jeho tahu ukazuje aktuální hody; po přepnutí zůstává poslední odehrané kolo. Nový leg pruhy vyprázdní. Aktivní karta má plný oranžový podklad a bílé skóre. Spodní lišta obsahuje Zpět, Klávesnici a Další hráč podle stavu hry. Klávesnice je na středu, Zpět vlevo a Další hráč vpravo. Vpravo nahoře jsou Rozhoz na střed, Statistiky, Zvuk a nabídka Zobrazení a volby hry. Z nabídky lze otevřít Nastavení aplikace. Stav připojení se na herní obrazovce nezobrazuje; je dostupný v Nastavení a na úvodní stránce. Z Nastavení se lze tlačítkem Zpět do hry vrátit do rozehraného zápasu. Pod ikonou Statistiky se otevře samostatné okno s průměry, body, počty šipek a průběhem jednotlivých legů. Zavře se křížkem nebo klávesou Escape.

U aktivního hráče v Double Out nahradí hody a spodní souhrn zelený panel se středovým popiskem **ZAVŘÍT**, pokud zbývajícími šipkami existuje zavření. Po každém hodu se kombinace přepočítá. Dokončené kolo, přehoz nebo nemožné zavření vrátí původní údaje; čekající hráči panel nemají. Překrytí zachovává rozměry dlaždice i polohu skóre.

Doporučení kombinuje běžné zavírací cesty s úplným výpočtem legálních kombinací. Přímý double nebo bull má přednost. Při třech šipkách výběr nejprve zohlední, zda po zásahu singlu místo prvního triplu (nebo druhého kruhu bullu) ještě zbývá dvoušipkové zavření, a potom upřednostní běžnou cestu. Například 76: **T20 → D8**, 70: **T18 → D8**, 122: **T18 → S18 → Bull**. Pokud doporučení z tabulky vyžaduje tři šipky, ale zbývají jen dvě, výpočet vybere dostupnou náhradu; například 104: **T18 → Bull**. Běžná tříšipková cesta proto může mít přednost před kratší cestou přes bull. Tabulka je vlastní výběr ověřený proti [Winmau Checkout Table](https://media.winmau.com/Marketing%20Assets/Winmau%20Checkout%20Table%20Poster/Winmau%20Checkout%20Poster.pdf), s upravenými začátky u 128, 132 a 135 pro zachování možnosti opravy. Nejde o oficiální algoritmus PDC ani model hráčovy pravděpodobnosti zásahu; sousední výseče a osobní preference zatím nehodnotí. Po každém skutečném hodu se znovu zohlední skóre i zbývající šipky, včetně úplného minutí.

## Ověření záznamy skutečného terče

Soubory `sipky-zaznam.jsonl` a `sipky-zaznam2.jsonl` pocházejí z 11. 10. 2026, 15:21:54–16:44:52 UTC. Druhý soubor obsahuje první jako přesný prefix.

| Rozsah | Zprávy | Dokončené neprázdné návštěvy |
|---|---:|---:|
| První soubor | 244 | 41 |
| Celý druhý soubor | 1 167 | 195 |

Ve druhém souboru je 189 návštěv se třemi šipkami, pět se dvěma a jedna s jedinou šipkou. Tři prázdná vytažení, opakované nuly po resetu a kalibrace nepřidávají kola. Celkem se zaznamenalo 578 hodů včetně dvou odražených šipek. V datech nejsou jména hráčů ani nastavení původních her, takže z nich nelze zpětně určit původní vítěze; ověřují synchronizaci a vyhodnocení při zvoleném testovacím nastavení.

Regresní fixture `tests/fixtures/board-session-2026-10-11.jsonl` obsahuje pouze obálky `payload` (bez duplicitního raw, ID a časů); prvních 244 zpráv tvoří první soubor. Testy přehrávají obě délky a kontrolují počet návštěv, skóre, opravy, přepnutí až po vytažení, ruční vstupy, rozhoz, odražené šipky a obnovu hry. Integrační kontrola v prohlížeči přehrála první návštěvu přes místní WebSocket, včetně obnovení stránky před vytažením.

Automatizované ověření: `pnpm test`, `pnpm build` a nativní Tauri sestavení Windows. Skutečné přepnutí terče je ověřené přehráním zaznamenaných zpráv; test u připojeného fyzického terče je potřeba provést při hře.

Na herních dlaždicích je jméno běžným systémovým písmem přímo na pozadí panelu, bez černého štítku a bez převodu na velká písmena. Ve výběru hráčů, seznamu, úvodní stránce, statistikách, rozhozu a výsledcích zůstávají tmavé štítky se šikmým pravým zakončením a písmem Barlow Condensed Bold. Avatar je neutrální šedý kruh s jemným lemem a tlumenou siluetou; výchozí velikost je 44 px, na dlaždici 52 px. Silueta zabírá 51 % velikosti kruhu. Fotky hráčů se zatím nepoužívají. Dlouhá jména se zkrátí výpustkou a celé jméno je dostupné v popisku. Skóre používá vysoké úzké číslice Bebas Neue. Obě písma jsou přibalena pro offline použití v `public/fonts/` spolu s licencemi SIL OFL 1.1.

Konec hry je vlevo nahoře jako bílá ikona odchodu (šipka vlevo v otevřeném čtverci) ve stejném stylu jako ikony Nastavení a Statistiky. Otevře potvrzovací dialog s pravidly zápasu, počtem hráčů a legem; stejná bílá ikona je i v jeho záhlaví. Červené zvýraznění zůstává pouze u potvrzení Ukončit hru. Pokračovat ve hře, křížek nebo Escape vrátí hráče zpět; ukončení se provede až tlačítkem Ukončit hru.

Na herních kartách je jméno s avatarem nahoře vlevo, na hraně pruhu s hody. Skóre se značkou vyhraných legů zůstává uprostřed. Pod pruhem s hody je jeden vycentrovaný řádek: šikmá ikona šipky a její číslo v legu, jemná svislá čára a Ø s průměrem aktuálního legu na 3 šipky. Průměr zápasu je ve Statistikách. Před prvním hodem v novém kole ukazuje aktivní hráč číslo příští šipky, po zadání číslo právě zapsané šipky; ostatní hráči zobrazují počet již hozených šipek v legu. Rozhoz na střed se do těchto údajů nezapočítává.

Klávesnice pro ruční zadání se přepíná ikonou uprostřed spodního ovládání: první stisk ji zobrazí přímo ve stránce, druhý ji skryje. Při otevření je tlačítko zvýrazněné. Ve třech sloupcích je v prvním řádku první hráč, klávesnice a druhý hráč. Ve dvou sloupcích je klávesnice vpravo od prvního hráče; v jednom sloupci následuje pod ním. Další hráči pokračují v původním pořadí. Otevření klávesnice nemění rozměry panelů, její panel má stejnou šířku i výšku jako hráči. Při hře jednoho hráče jsou na širokém okně dva panely vedle sebe.

Klávesnice není dialog, nemá ztmavení pozadí a neblokuje statistiky ani ostatní ovládání. Zůstává otevřená po zadání hodu i při střídání hráčů. Společné hody zůstávají nahoře. Panel neobsahuje jméno hráče, nadpis, křížek, připínáček ani tlačítko Zpět; vrácení šipky je dostupné ve spodním ovládání hry. Nahoře je přepínač Single / Double / Triple bez barevné výplně; aktivní režim označuje oranžové podtržení v barvě aktivní dlaždice. Pod ním je mřížka 1–20 s jemně odlišenými plochými tlačítky a menším zaoblením, dole tlačítka 25 / BULL / MIMO ve stejném neutrálním stylu. Čísla v mřížce mají podle režimu předponu S / D / T. Speciální hody 25, Bull a Mimo jsou na násobku nezávislé. Po zadání hodu i při přepnutí viditelnosti se režim vrátí na Single. Zpět otevře klávesnici pro opravu, pokud byla skrytá. Spodní vysvětlující hlášky se nezobrazují. Po konci zápasu a během rozhozu na střed se běžná klávesnice nezobrazuje.

Konfety a medaile s pořadím se zobrazí hned po platné zavírací šipce, ještě před vytažením šipek a dozněním hlasu, i když je nastaveno dohrávání více hráčů a leg ještě nekončí. Všichni hráči mají stejnou oslavu; vítězství v legu nebo zápasu nepřidává další salvu. BUST ani vítězství v rozhozu konfety nespustí. Opakované snapshoty ani pozdější potvrzení vytažením je neopakují. Oprava šipky, která zruší zavření, ihned odstraní medaili; již spuštěnou oslavu nelze vzít zpět. Samotné potvrzení kola, připsání legu a přepnutí hráče dál respektují vytažení šipek a hlášení. Nastavení konfet i hlavní vypínač efektů se dál respektují. V Cricketu se stejná oslava spustí při platném dokončení hry.


Zvuk přehozu: zazní pouze krátký tlumený efekt ve stejném stylu jako MIMO. Mluvená hláška BUST je odstraněná, nehlásí se ani nula. Na obrazovce se dál zobrazuje BUST. Efekt se nepřehraje znovu při opakovaném snapshotu nebo dodatečné šipce po přehozu; oprava hodu ho přeruší. Řídí se hlavním vypínačem zvuku.
