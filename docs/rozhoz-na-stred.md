# Ukončení legu rozhozem na střed

V rozehrané hře X01 otevřete samostatné tlačítko **Rozhoz na střed** (ikona terče se šipkou v horní liště) a potvrďte **Spustit rozhoz**. Tlačítko je dostupné přímo během hry ve všech třech pohledech. Rozhoz už není součástí dialogu **Konec hry** ani zavírání aplikace.

Spustit ho lze mezi koly, když ještě nezavřeli alespoň dva hráči. Rozehrané kolo je třeba nejprve dokončit; dialog to vysvětlí a do té doby spuštění nepovolí. Jde o záměrné pravidlo potvrzené uživatelem. Zpět dokáže zahájení rozhozu vrátit.

Zobrazí se velký terč a vedle něj panely účastníků. Hráč na řadě má oranžový panel, zásah BULL / 25 / vzdálenost v mm se zobrazuje přímo v jeho panelu. Každý hodí jednu šipku. BULL nebo 25 vytáhněte. Hra počká, až zmizí právě tato šipka, a ostatní mohou zůstat v terči. Po zásahu mimo střed nechte šipku v terči, tah se předá automaticky. Před dalším hodem počkejte, až se zvýrazní další hráč. Opravu z terče lze přijmout do předání tahu, u BULLu a 25 do vytažení.

Pokud Board Manager zaplní všechny tři pozice, aplikace vyzve k vytažení šipek před dalším hodem. Již zaznamenané výsledky se zachovají. Zprávy s ponechanými šipkami nebo opakované zprávy nevytvářejí další hody.

Spodní ovládání rozhozu má stejný vzhled jako běžná herní lišta. Vlevo je **Zpět**, uprostřed **MIMO** a vpravo křížek **Zrušit rozhoz**. Po zachycení šipky nahradí MIMO šipka **Další hráč**, která je při čekání na vytažení BULLu a 25 neaktivní. Šipkou lze také pokračovat s pozastaveným botem. Popisky ikon se zobrazí po najetí myší.

Pokud šipka letí úplně mimo a kamery hod nezaznamenají, použijte **MIMO** uprostřed spodní lišty. Zapíše netrefu aktuálnímu hráči a po krátkém zobrazení předá tah. Tlačítko je dostupné, když terč čeká na hod člověka. Dřívější ponechané šipky tomu nebrání, pokud terč ještě přijímá nové hody. Zadanou netrefu lze opravit přes Zpět a nový fyzický hod.

**Zrušit rozhoz** vrátí běžnou hru ke skóre, pořadí a hráči před jeho spuštěním. Zahodí i dílčí výsledky dosud probíhajícího rozhozu. Dříve zavření hráči zůstávají na svých místech. Zrušení funguje také během vyhodnocování hodu. Šipky ponechané na terči je potřeba před pokračováním vyjmout. Při zrušení automatického rozhozu po limitu kol se aktuální leg dohrává bez dalšího automatického rozhozu. V následujícím legu opět platí nastavený limit.

## Řazení a shody

1. BULL (vnitřní střed).
2. 25 (vnější střed).
3. Ostatní zásahy podle nejmenší vzdálenosti od středu.
4. Netrefa / odražená šipka bez platné vzdálenosti.

Vzdálenost Board Manageru je normalizovaná vůči 170mm poloměru hrací plochy. Aplikace ji převádí na mm a porovnává na desetinu mm stejně jako na displeji.

Dva BULLy nebo dvě 25 znamenají shodu; rozhoduje nový rozstřel, nikoli vzdálenost uvnitř stejného středového pásma. Stejná zobrazená desetina mm také remizuje. Znovu házejí jen členové konkrétní shodné skupiny. Ostatní výsledky jsou zachované, i kdyby remizující v dalším kole hodili hůře než již vyřazený hráč. Více shodných skupin se řeší od nejvyššího dosud nerozhodnutého místa.

Pokud terč vyhodnotí zásah chybně, klikněte na tužku u hráče a vyberte **BULL**, **25** nebo **MIMO**. Během rozhozu lze opravit aktuální šipku i již zapsané hody stejného kola. Opravený BULL nebo 25 se u fyzického hodu potvrdí vytažením. Pokud terč pošle zásah mimo střed bez vzdálenosti, aplikace na to upozorní. Skutečný BULL, 25 nebo MIMO lze zapsat tužkou. Jiný zásah lze vrátit tlačítkem Zpět a zopakovat s měřením.

## Výsledek a další leg

Hráči, kteří už zavřeli na nulu, si ponechají své pořadí a rozhozu se neúčastní. Rozhoz určí všechna zbývající místa. Leg se připíše prvnímu hráči konečného pořadí, takže původní vítěz zůstane vítězem, pokud už někdo zavřel.

Ukončí se **jen aktuální leg**. Ostatní pravidla zápasu zůstávají v platnosti, včetně počtu vítězných legů a pořadí začínajících. Výsledky včetně zásahů rozstřelů zůstávají na samostatné obrazovce, dokud se nepotvrdí pokračování. Do té doby se další leg nehraje a bot neháže. Pokud tím zápas skončil, potvrzení otevře jeho konečný výsledek.

Na obrazovce výsledků zvolte **Upravit výsledek**. Šipky nahoru a dolů přesouvají účastníky rozhozu o jedno místo. Hráči zavření na nulu jsou na svých místech uzamčení. Tužka u výsledku opraví poslední hod hráče. Po této opravě určete správné pořadí šipkami. Tlačítko **Potvrdit a pokračovat** zapíše zvolené pořadí do výsledku legu i zápasu. **Zrušit úpravy** zahodí rozepsané změny. Pokud ihned po potvrzení stisknete **Zpět**, znovu se otevře původní automatické pořadí.

Rozhoz nemění zbývající skóre na nulu a nevstupuje do počtu šipek ani průměrů hry X01. Nevyvolává konfety za zavření. Hody a pořadí jsou v záznamu hry. Průběžný diskový záznam obsahuje události `game-bulloff-start`, `game-bulloff-throw`, `game-bulloff-result` a při zrušení `game-bulloff-cancel`. Zpět funguje i po zobrazení výsledků a umí vrátit také zrušení rozhozu.

Původní automatický rozhoz po limitu kol zůstává dostupný; stejně jako dříve rozhoduje postupně o potřebných místech. Nové ručně spuštěné ukončení vždy seřadí všechny zbývající hráče.
