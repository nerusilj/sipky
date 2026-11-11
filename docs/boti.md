# Hra s botem

V nastavení nové hry otevřete **Přidat hráče → Bot**. Na výběr jsou tři obtížnosti:

| Obtížnost | Jméno | Chování |
| --- | --- | --- |
| Lehká | Bot začátečník | Větší rozptyl a častější minutí cíle. |
| Střední | Bot soupeř | Přesnější hody, občas mine důležitý hod. |
| Těžká | Bot expert | Nejmenší rozptyl, častější triple a double. |

Každého bota lze do sestavy přidat jednou. Lze je kombinovat s lidskými hráči nebo nechat hrát proti sobě. Celkový limit zůstává osm účastníků. Výběr se pamatuje v sestavě příští hry; boti se nevytvářejí v evidenci skutečných hráčů.

## Tahy a ovládání

Bot hází jednotlivé šipky s krátkou prodlevou a po vyhodnocení automaticky předá tah dalšímu hráči. Nepotřebuje síť ani zprávu o vytažení šipek. Počáteční hláška a jméno mají přednost před prvním hodem; chyba nebo dlouhé generování hlasu nezablokuje hru.

Ruční zadávání a zprávy z fyzického terče během tahu bota nemění jeho skóre. U člověka zůstává stejné ovládání jako dosud: ruční kolo se potvrzuje tlačítkem Další, Autodarts čeká na vytažení šipek.

**Zpět bota pozastaví**, aby neházel během kontroly historie. Tlačítko Další ho znovu spustí. Ukončení hry zruší čekající hody.

## Přesnost a pravidla

Obtížnosti používají stejná pravidla a rozhodování, liší se přesností. Cíl šipky dostává náhodnou dvourozměrnou Gaussovu odchylku 42 / 24 / 11,5 mm podle obtížnosti. Z dopadu se spočítá skutečný segment, včetně sousedních čísel, bullu a netrefy. Průměr není uměle pevně nastavený a bot nepřizpůsobuje výsledky skóre člověka.

V X01 využívá doporučené dohazování, respektuje Double Out / Straight Out, počet zbývajících šipek a rozhoz na střed. V Cricketu zavírá čísla od 20 dolů a BULL; pokud bodově zaostává, může bodovat na vlastním zavřeném čísle, které má soupeř ještě otevřené. Legy a vítězství vyhodnocuje stejný herní engine jako u lidí.

Logiku cílů a rozptylu obsahuje `src/game/bots.ts`, časování `src/game/botRunner.ts`. Automatické testy ověřují rozdíly obtížností, vítězství, rozhoz, střídání, Zpět a ignorování vstupů z terče během tahu bota.
