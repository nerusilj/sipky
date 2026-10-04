# Hlášky hlasatele – návrh na později

Stav k 4. 10. 2026: odloženo. Zatím je hotové hlášení součtu kola 0–180 (Jirka, Kasandra) a efekt Ambrožovina.

## Co hlásí šipkové aplikace

Zdroj: seznam SOUND-FILE-KEYS v README projektu [darts-caller](https://github.com/lbormann/darts-caller), komunitního hlasatele pro Autodarts. Odpovídá tomu, co hlásí Autodarts i hlasatelé na turnajích.

| Kategorie | Klíče v darts-caller | Český návrh |
|---|---|---|
| Začátek | `gameon`, `matchon`, `first_to_throw`, `bulling_start/end` | „Hra začíná!“, „Začíná Jarda“, „Házíme o začátek na bull“ |
| Kdo hraje | `{jméno hráče}` při střídání | „Jarda“ / „Na řadě Petr“ |
| Skóre kola | `0–180` | hotovo |
| Kolik zbývá | `you_require`, `yr_2–yr_170` (jen v dosahu zavření ≤170) | „Jarda potřebuje třicet dva“ |
| Přehoz | `busted` | „Přehozeno!“ |
| Konec legu/setu/zápasu | `gameshot`, `leg_{x}`, `set_{x}`, `matchshot` | „Leg pro Jardu!“, „Druhý leg“, „Konec zápasu, vítěz Jarda!“ |
| Jednotlivá šipka | `t20`, `d16`, `bull`, `bullseye`, `outside` nebo body 0–60 | „Triple dvacet“, „Double šestnáct“, „Bull“, „Mimo“ |
| Zvláštní hody | `ambient_100more/140/180`, kombinace šipek, no score | „Sto osmdesát!“, „Bez skóre“, Ambrožovina |
| Ovládání | `control_undo`, `control_next`, `control_dart_correction` | „Oprava šipky“, „Další hráč“, „Zpět“ |
| Cricket | trefy a zavření čísel | „Dvacítka zavřená“ |

## Co jde bez hry a co s ní

- **Jen z terče (už teď):** jednotlivé šipky, „Bez skóre“, zvýraznění 100+/140+/180 a další kombinace jako Ambrožovina.
- **Až s hrou (sekce Hra):** jména hráčů, „potřebuje X“, přehoz, leg/set/zápas, kdo začíná. Terč tyto informace nemá.

## Otevřené otázky

1. Formulace: české texty výše, nebo vlastní hospodské hlášky?
2. Hlásit každou šipku („Triple dvacet“), nebo jen součet kola?
3. Jména hráčů. Nahrávky se generují předem a jména předem neznáme:
   - A) přibalit Piper do aplikace a jméno namluvit při přidání hráče (offline, asi +90 MB),
   - B) jméno namluvit vlastním hlasem přes mikrofon,
   - C) bez jmen („Hráč jedna“).
