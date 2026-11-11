# Místní hlasatel

Jediným enginem je **Supertonic 3**. Hlasy **Eliška (F1)** a **Martin (M1)** sdílejí ONNX model; liší se pouze hlasovým profilem. Eliška je výchozí i při načtení již neexistující volby hlasu. Čísla, efekty i dynamická jména mají konzistentní hlas. Žádný účet, API klíč ani síť při hraní nejsou potřeba.

## Příprava

Z kořene repozitáře připravte prostředí s Pythonem 3.12 a model. Stejné příkazy lze použít po klonování na další Windows počítač.

```powershell
py -3.12 -m venv .tools/supertonic-runtime
.\.tools\supertonic-runtime\Scripts\python.exe -m pip install -r scripts/speech-requirements.txt
py -3.12 scripts/prepare-supertonic-preview.py
py -3.12 scripts/prepare-speech-runtime.py
pnpm tauri:dev
```

Stahovací skript používá archivní model `supertone-oss-archive/supertonic-3` v revizi `aafc6e32416a594460b32413efc49d7fe4ce6d46`. Obsah modelů kontroluje SHA-256 a ostatní soubory Git blob SHA-1 proti metadatům pevné revize. Model a prostředí zůstávají v ignorované složce `.tools`. Hotové hlášky v repozitáři stačí pro přehrávání, jejich přegenerování je volitelné.

Přenositelný runtime lze připravit také s explicitními cestami:

```powershell
python scripts/prepare-speech-runtime.py --speech-env <prostredi> --assets <supertonic-3/assets>
node scripts/generate-voice.mjs --python <python.exe> --assets <supertonic-3/assets>
```

Runtime se vytváří znovu do čistého adresáře, aby v něm nezůstaly předchozí knihovny a modely. Obsahuje pouze aktuální Python, NumPy/ONNX Runtime se závislostmi, jeden model a profily F1/M1. Po sestavení je nutné u distribuované aplikace vyměnit celou složku `tts`, nikoli ji sloučit s předchozí verzí. Generované runtime soubory jsou ignorované Gitem.

## Generování a přehrávání

`scripts/speech_engine.py` je jediná implementace nastavení hlasatele, společná pro hromadný generátor a JSON-lines worker. Používá češtinu, 16 kroků, rychlost 1,05 a dvě CPU vlákna. ONNX telemetrie je vypnutá.

`scripts/supertonic_backend.py` je nezměněný referenční výpočet ze zdrojové revize `1e9799e964ea4c0dad7cde993b65c3c813a7b373`, doplněný hlavičkou s uvedením původu. Licence je v `scripts/SUPERTONIC-CODE-LICENSE.txt`.

Čísla 0–180, Ambrožovka a „Hra začíná!“ jsou hotové WAV nahrávky v `public/sounds/cs/eliska/` a `public/sounds/cs/martin/`. Nevyžadují syntézu při každém hodu. Generátor kontroluje kompletnost již vytvořených souborů a shodu parametrů v `public/sounds/generation.json`. Mluvená hláška BUST je odstraněná, při přehozu se používá pouze zvukový efekt. Hlášky a jména zůstávají česky. Výběr hlasu a přehrání ukázky zůstávají v Nastavení a DEV.

Jména se tvoří na pozadí při načtení seznamu, přidání či přejmenování hráče a při změně hlasu. Při startu hry se připraví i jména právě vybraných hráčů. Ukládají se do `Dokumenty/Sipky/hlaseni-hracu/<hlas>/<hash>.wav`; klíč zahrnuje verzi enginu, hlas a normalizované jméno, nikoli ID hráče. Opakované přidání stejného jména využije uložené hlášení. Opožděné hlášení se nepřehraje po hodu, Zpět ani konci hry.

Oba hlasy používají jeden společný načtený model i v persistentním workeru. Hlášení při střídání zní „Hraje {jméno}.“. Verze klíče cache se při změně fráze zvýší, takže se staré „Na řadě je“ nepoužije. Místní cache se zapisuje atomicky; poškozený nebo neúplný WAV se vytvoří znovu. Nepotřebuje síť. Worker se spouští s izolovaným Pythonem a bez konzolového okna.

## Signály při dokončení kola

`public/sounds/game/bust.wav` a `miss.wav` používají tlumený zvuk chyby z uživatelem dodaného souboru `lesiakower-error-mistake-sound-effect-incorrect-answer-437420.mp3`. Efekt trvá 850 ms, má RMS −27 dBFS a špičku nejvýše −12 dBFS; je zeslabený přibližně o 11 dB. Při přehozu zazní pouze tento krátký efekt, bez mluveného hlášení BUST a bez nuly. MIMO přehraje efekt při zápisu nového hodu, opakovaný snapshot ho neopakuje. Běžný dohoz a vytažení jsou bez pípnutí. Hlavní ztišení vypne vše; vypínač zábavných efektů zvuk chyby neovládá. Ukázky vytvoří `python scripts/preview-turn-sounds.py`, novou přípravu z MP3 `--regenerate` (vývojové miniaudio a NumPy).

Při automatickém vstupu je pořadí: vykreslení poslední šipky → skóre → čekání na prázdný terč → jméno dalšího hráče. Rychlé vytažení nezpůsobí překrytí ani opakování skóre. Opravy snapshotů zůstávají možné do potvrzení kola. Při ručním vstupu zazní skóre také, ale hráč se přepne až po stisku Další hráč. Oprava konkrétní šipky zastaví původní hlášení a po dohozu ohlásí opravené skóre. Všechny zvuky sdílejí frontu hlasatele a hlavní vypínač zvuku; jméno čeká na doznění skóre a potvrzení kola, bez dalšího zvukového signálu.

Ikona zvuku ve hře a přepínač **Zapnout zvuk** v Nastavení ovládají stejný uložený stav. Ztišení zachová volbu hlasu a hlasatele pro opětovné zapnutí. Ikona efektů vpravo od zvuku sdílí stav s přepínačem **Zapnout efekty**; vypne zábavné efekty i konfety a zachová jejich jednotlivé volby.

## Licence

Model: Supertone Inc., **OpenRAIL-M**, úplný text v `public/sounds/SUPERTONIC-MODEL-LICENSE.txt` a v distribuované složce `tts`. Kód: **MIT**, úplný text v `scripts/SUPERTONIC-CODE-LICENSE.txt` a `tts`. Runtime obsahuje i licence Pythonu a ostatních knihoven. Zdrojový projekt je archivovaný od 9. 9. 2026 a dále není podporovaný vydavatelem.

- [Model a dostupné profily](https://huggingface.co/supertone-oss-archive/supertonic-3)
- [Původní kód a licence](https://github.com/supertone-oss-archive/supertonic)

Při startu X01 i Cricketu (také při odvetě) zazní „Hra začíná!“ a teprve potom jméno prvního hráče. Hláška respektuje vybraný hlas, ztišení a zapnutí hlasatele. Při běžném střídání hráčů ani mezi legy se neopakuje. Zrušení hry nebo Zpět zruší i čekající úvod a jméno.

Automatická hlášení a herní efekty se spouštějí pouze v rozehrané hře. Volné házení na domovské obrazovce, při výběru hráčů nebo po ukončení hry je bez hlášení. Spojení s terčem, události pro inspektor a záznam kol na disk zůstávají aktivní. Ruční ukázky v Nastavení a DEV lze nadále přehrávat.
