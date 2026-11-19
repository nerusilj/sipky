# Náhodný cíl — výzkum a návrh hry

**Navazující stav:** uživatel 19. 11. 2026 schválil realizaci pod názvem **Shooter**. Aktuální implementaci a ověření popisuje [Shooter](shooter.md). Níže zůstává původní průzkum a návrh.

Datum průzkumu: 19. 11. 2026. Jde o podklad k rozhodnutí, nikoli schválená pravidla nebo implementovaný režim. Uživatel popsal losování čísla, které musí hráč zasáhnout, a možný časový limit.

## Nejpravděpodobnější název

Popisu nejlépe odpovídá **Shoot-Out**, případně **Random Shoot / Náhodný cíl**. Bez upřesnění nelze určit přesnou variantu. Názvy nejsou jednotné a samy o sobě nezaručují stejná pravidla.

- Manuál Carromco popisuje Shoot-Out: náhodný cíl, 10 sekund na jednu šipku, správná výseč za 1 bod bez ohledu na single/double/triple. Po každém hodu nový cíl; vypršení času znamená spotřebovaný neúspěšný hod. Vyhrává první s 15 body. Viz [manuál, PDF strana 81 / tištěná 82](https://pimage.sport-thieme.de/pdf/1865471.pdf#page=81).
- Manuál Echowell AC100 popisuje Random Shoot na 6–15 kol. Body za zásah cíle: single 1, double 2, triple 3, vnější střed 3, vnitřní 5. Vyhrává nejvyšší skóre. Odstavec o této hře neuvádí časový limit ani přesně neurčuje okamžik změny cíle; tyto podrobnosti z něj nelze dovodit. Viz [manuál, druhá strana PDF](https://www.insportline.sk/upload/file/S7709_manual_Terc_Echowell_AC100_SK.pdf#page=2).
- **Random Checkout** je příbuzný, ale jiný princip: například vylosovaných 64 je součet k zavření více šipkami, nikoli výseč terče. Rozlišení 1–20 versus třeba 64/87/121 pomůže určit, na kterou hru si uživatel vzpomíná.

## Co je doložené v aplikacích

| Produkt | Režim a doložené chování | Čas nebo délka | Vztah k zadání |
| --- | --- | --- | --- |
| [Dart Arena — popis vývojáře v Google Play](https://play.google.com/store/apps/details?id=com.strixinteractive.dartarena) | Shooter: zásahy náhodného cíle. Aplikace používá Granboard 132 přes Bluetooth; LED ukazují cíl. | Popis uvádí 10 kol. Sekundový limit ani podrobné bodování neuvádí. | Nejbližší ověřená aplikace. |
| [DartCounter — Random Checkout](https://dartcounter.net/games/random-checkout-game) | Losuje zavírání z vybraných pásem, náročnější pásma mají více bodů. Nabízí pořadí Default, Random a Race a lokální hráče i bota. | Limit 3/6/9/12/15 šipek nebo neomezeně; v Default/Random 10/25 pokusů nebo neomezeně. | Inspirace pro budoucí losované zavírání, nikoli přímá shoda. |
| [Autodarts — Random Checkout](https://docs.autodarts.com/game-modes/practice/random-checkout/) | Nový náhodný počáteční součet v každém legu, společný pro účastníky. Volitelně Straight/Double/Master Out a rozsah losování. | Nejvýše 1/2/3/6/9 kol na leg. Dokumentace neuvádí sekundový odpočet. | Příbuzná hra s limitem pokusů. |
| [Autodarts — Segment Training](https://docs.autodarts.com/game-modes/practice/segment-training/) | Trénink zvoleného čísla a typu zásahu; nabídka obsahuje Random. Zvýrazněný cíl a statistika zásahů. | Konec podle počtu zásahů nebo šipek. | Inspirace pro zobrazení a statistiky. Samotná položka Random nedokládá losování čísla 1–20 po každé šipce. |

Ověřeny byly veřejné popisy vývojářů a dokumentace, nikoli osobní hraní v těchto aplikacích. Neověřené podrobnosti nepřebírat jako pravidla.

## Doporučená podoba pro Šipky

Nová karta na Domů: **Náhodný cíl**, podtitul „Zasáhni vylosované číslo“. V pravidlech lze uvést inspiraci Shoot-Out. Následující nastavení jsou vlastní návrh, nikoli tvrzení o všech uvedených hrách.

### Základní pravidla

1. Jeden až osm místních hráčů, střídání po třech pokusech.
2. Losování čísel 1–20; nový cíl po každém hodu, i po minutí. Bez okamžitého opakování stejného čísla.
3. Jakýkoliv single, double nebo triple správného čísla znamená **1 bod**. Jiná výseč, MIMO a odraz znamenají 0 bodů.
4. Výchozí délka **10 kol**, volitelně 5 nebo 15. Všichni dostanou stejně pokusů; vyhraje nejvyšší skóre. Při shodě nabídnout společné pořadí nebo dodatečné celé kolo pouze shodným hráčům.
5. V sólu zobrazit zásahy z počtu pokusů a úspěšnost; nesměšovat s průměrem X01.
6. Později lze přidat alternativní konec „první na 15 bodů“ pro bližší shodu s doloženou variantou Carromco. Jde o jinou volbu délky, ne o současně platnou podmínku.

### Časový limit

- Nabídnout **bez limitu / 10 s / 15 s na šipku**. Deset sekund odpovídá doloženému Shoot-Out; patnáct je naše snazší varianta. Pro první hraní doporučeno bez limitu, časový režim jako volitelná výzva.
- Před první šipkou hráče krátké „Připrav se“ a odpočet 3–2–1. První časomíra nezačne při vytažení šipek předchozího hráče. Další začne až po zobrazení nového cíle a případném hlášení čísla.
- Vypršení spotřebuje jeden pokus za 0 bodů. Čas neběží během vytahování, pozastavení, oprav, nepřipraveného terče nebo ztráty spojení. Obnovení časovaného hraní vyžaduje vědomé pokračování.
- Pro Autodarts musí být oddělený počet herních pokusů a fyzických šipek: timeout spotřebuje pokus, ale v terči nepřibude šipka. Pozdní hod se nesmí automaticky přiřadit novému cíli. Před implementací časované varianty ověřit zpoždění rozpoznání a dořešit postup po timeoutu; samotný sekundový odpočet v UI nestačí.
- Pro ruční zadávání je vhodnější režim bez času: čas kliknutí není čas dopadu. Časovanou ruční variantu bez dalšího mechanismu nepovažovat za srovnatelnou s automatickým měřením.

### Rozhraní a férovost

- Dominantní číslo cíle a text „TREF 17“, vedle zvýrazněná celá výseč na stávajícím terči. V časované variantě čitelný odpočet/pruh.
- U aktuálního hráče skóre, kolo a tři políčka: cíl → skutečný zásah → získaný bod. Ostatní hráči mají menší přehled skóre.
- Zachovat Zpět, opravu hodu, MIMO, klávesnici a přepnutí až po vytažení fyzických šipek.
- Volitelně pro soutěž předem vylosovat stejnou posloupnost cílů pro všechny, odhalovat postupně. Snižuje rozdíly obtížnosti, ale pozdější hráči mohou část posloupnosti znát; neoznačovat ji za jedinou férovou možnost.
- BULL a režimy pouze double/triple až jako rozšíření. Pokud se přidá BULL, výslovně určit, zda platí 25 i 50. Nezaměňovat losovaný BULL s požadavkem na přesný vnitřní střed.
- Hlasatel může využít stávající nahrávky čísel, ale musí mít vlastní větev pro cíl. Současná pipeline běžných součtů se nemá pouštět po třetí šipce této hry. Přirozené slovní uvedení cíle a slyšitelnou podobu je ještě třeba navrhnout.

## Napojení na současný projekt

Kontrola současných zdrojů potvrdila, že nejde jen o přidání dlaždice:

- `src/pages/HomePage.tsx` má nyní dvě herní karty; `src/game/activeGame.ts` definuje pouze `x01 | cricket` a rozesílá fyzický vstup oběma storeům.
- `src/App.tsx` má volbu stránky a ochranu rozehrané hry navázanou na tyto dva režimy. Nový store musí vstoupit také do kontroly spuštěné hry, ukončení a změny režimu.
- `src/game/boardInput.ts` již nabízí generický `BoardGameInput` s pravidly pro `setVisit`, `commit` a stav hry. Pro nečasovaný režim je vhodným základem, stále je nutná integrační kontrola. Časovaný režim potřebuje navíc evidenci timeoutů a mapování fyzických šipek na pokusy.
- Vlastní čistý herní engine a store podle stávajících vzorů. Vylosované cíle uložit do herního záznamu, nelosovat během renderování ani při opravě hodu. Oprava staršího zásahu nesmí změnit již ukázané další cíle.
- `src/cast/protocol.ts` má v `CastSnapshot.game` jen X01 a Cricket a vlastní validaci příchozích dat. Přidat nový snapshot, validaci, odesílání a TV stránku; starý receiver nový režim neumí. Časomíru řídí počítač, TV pouze zobrazuje synchronizovaný stav.
- Posoudit samostatné cílení botů; existence botů pro X01 automaticky neznamená podporu této hry. První verze může být pro lidi a sólový trénink.

## Doporučený postup a ověření

1. Nejprve rozhodnout, zda uživatel myslí výseče 1–20, nebo losovaný součet k zavření.
2. Pro výseče implementovat nečasovanou hru včetně Autodarts, ručního ovládání a TV. Pravidla výše jsou návrh k projednání.
3. Časovanou variantu doplnit po ověření fyzického příjmu na hranici limitu. Není důvod kvůli průzkumu sestavovat instalátor.

Při implementaci ověřit zejména: správnou výseč včetně D/T za jediný bod; chybný zásah a MIMO; stabilní losování při opravách a Zpět; opakované snapshoty; částečné a úplné vytažení; nepřevzetí starých šipek při startu; stejné počty pokusů a konec hry; TV snapshot a validaci. Pro čas navíc timeout bez fyzického hodu, pozdní dopad, souběh přijetí šipky a deadline, pozastavení, odpojení, obnovení a opravu posledního pokusu.

V tomto kroku nebyl upraven herní kód, aplikace se nespouštěla a neproběhl build ani testy hry.
