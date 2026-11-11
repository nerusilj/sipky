# Cricket s body

Vývojová verze nabízí klasický Cricket pro 1–8 hráčů. Jiné varianty jako Cut Throat nebo No Score zatím nenabízí. Instalace 0.1.3 vznikla před dokončením tohoto režimu a Cricket ještě neobsahuje.

## Pravidla

Hrají se čísla 20, 19, 18, 17, 16, 15 a BULL. Single znamená jeden zásah, double dva, triple tři. Vnější střed je jeden zásah, vnitřní dva.

Tři zásahy číslo zavřou. Zásahy nad tuto hranici přidají jeho hodnotu do vlastního skóre, pokud ho ještě některý soupeř nemá zavřené. Body se přidají i při zavření na stejné šipce: S20 a následně T20 zavře dvacítku a přidá 20 bodů. Po zavření čísla všemi hráči už neboduje.

Leg vyhraje hráč, který zavře všech sedm čísel a má alespoň tolik bodů jako každý soupeř. Shoda bodů stačí. Pokud na body prohrává, pokračuje v bodování. V sólovém tréninku stačí zavřít všechna čísla. Zápas lze nastavit na 1–5 vítězných legů nebo hrát dokola. V dalších lezích se střídá začínající hráč, zásahy i body se vynulují. Počet kol není omezen.

Základ pravidel odpovídá [Cricketu v dokumentaci Autodarts](https://docs.autodarts.com/game-modes/cricket-tactics/).

## Ovládání

Oranžový sloupec označuje aktivního hráče. Značky /, X a zakroužkované X znamenají jeden, dva a tři zásahy. Společně zavřené řádky jsou ztlumené. Horní pruh obsahuje aktuální šipky a počet platných zásahů; při bodování navíc ukáže i získané body.

- Klávesnice se zapíná spodní ikonou. Zůstane otevřená i při střídání hráčů a nahradí zobrazený terč.
- Kliknutím na kteroukoli už zadanou šipku nahoře lze opravit právě ji. Ostatní šipky zůstanou zachované a celé kolo se přepočítá.
- Při ručním zadávání se po třetí šipce čeká na Další, výsledek kola se hlasem neoznamuje. Vítězný hod po krátkém zobrazení automaticky připíše leg a případně vyhlásí vítěze.
- Při vstupu z Autodarts se hráč přepne až po prázdném terči. Zahájení vytahování ani třetí šipka samy nepřepnou hráče. Před vytažením je možné opravit i zdánlivě vítězný hod. Ruční opravy rozpoznaných šipek se nepřepisují dalšími snapshoty.
- Zpět vrací jednotlivé šipky i přes hranici kola, legu a výsledku zápasu. Ruční návrat do předchozího kola přepne vstup do ručního režimu.

## Statistiky

Hlavička hráče ukazuje body, vyhrané legy, počet hozených šipek aktuálního legu a MPR. MPR je počet platných zásahů přepočtený na tři šipky. Nepočítají se zásahy do čísel zavřených všemi hráči ani nevyužitelný přesah při zavírání posledním hráčem. Předčasně potvrzené nevítězné kolo se pro statistiky počítá jako tři šipky; vítězné kolo podle skutečně potřebných šipek. Rozehrané kolo ukazuje průběžné hodnoty.

Ikona statistik otevírá souhrn celého zápasu a historii kol včetně šipek, zásahů a získaných bodů. Při zahájení hry zazní „Hra začíná!“ před jménem prvního hráče. Hlasatel dále oznamuje dynamická jména hráčů; počty zásahů ani získané body v Cricketu nehlásí. Efekty specifické pro X01, například přehoz nebo Ambrožovka, se na Cricket nepoužijí.

## Ověření

Samostatné testy pokrývají pravidla, bodovou shodu, nižší skóre po zavření všech čísel, více hráčů, MPR, vítězství, legy, návrat zpět, ruční i automatické opravy, čekání na vytažení a zpracování rychlých následujících zpráv. Přehrání skutečných záznamů terče ověřuje přesně 41 a 195 potvrzených kol. Živá hra s fyzickým terčem musí být ještě vyzkoušena.
