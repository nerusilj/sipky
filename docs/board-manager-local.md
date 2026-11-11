# Lokální Board Manager: zdroj dat pro v0.1

Od 4. října 2026 je zdrojem v0.1 **pouze lokální Board Manager**. Cloud Autodarts (OAuth, `play.ws.autodarts.com`) se nepoužívá; dřívější výzkum je archivovaný v [autodarts-protocol.md](autodarts-protocol.md).

## Ověřeno na skutečném zařízení (4. 10. 2026)

Board Manager **2.0.2** (headless), Windows, port 3180.

| Požadavek | Výsledek |
|---|---|
| `GET /api/version` | `200 text/plain`, `2.0.2` |
| `GET /api/state` | `200 application/json`, `{"connected":true,"event":"Starting","numThrows":0,"running":true,"status":"Starting"}` |
| CORS | `Access-Control-Allow-Origin: *` |
| `ws://127.0.0.1:3180/api/events` | Připojení bez přihlášení a bez úvodní zprávy. Bez kamer a bez změny stavu nepřišla za 10 s žádná zpráva. |
| `discover.autodarts.com` | Vrací terče ve stejné veřejné síti včetně lokální IP a verze. |

Pozor: `/api/state` z tohoto zařízení neobsahuje klíč `throws`, pokud nejsou šipky.

## Pravidla pouze pro čtení

- Aplikace poslouchá `ws://<host>:<port>/api/events` (nic na něj neodesílá). Po připojení volá pouze `GET /api/version` a `GET /api/state`. Počáteční stav se ignoruje, pokud mezitím přišla novější živá zpráva; slouží k obnovení již zapíchnutých šipek. Verze se zobrazí, jen když vypadá jako číslo verze.
- Nikdy nevolá `/api/config` ani `/api/system`: vracejí API klíč terče a TLS klíč.
- Nikdy nevolá PUT, POST ani PATCH (start, stop, reset, restart, kalibrace, streamy).

## Formát zpráv a záznamy skutečného terče

Zdroj: [HACSAutodarts](https://github.com/Dennis-Otto/HACSAutodarts), hlavně `custom_components/autodarts/local_api.py`, `tests/e2e/board_mock.py` a `tests/e2e/scenario.py`. Oficiální dokumentace lokálního API ani oficiální simulátor neexistují.

Obálka je textový JSON `{"type": <druh>, "data": {...}}`. Známé druhy jsou `state`, `motion_state`, `cam_state`, `stats` a `cam_stats`. Board Manager 2 podle autora integrace posílá kamerové zprávy zřídka nebo vůbec. Klient neposílá žádnou zprávu ani odběr.

`state` posílá vždy celý stav, ne rozdíl:

```json
{"type":"state","data":{"connected":true,"running":true,"status":"Throw","event":"Throw detected","numThrows":1,
 "throws":[{"segment":{"name":"T20","number":20,"multiplier":3,"bed":"Triple"},"coords":{"x":0.0123,"y":0.5981}}]}}
```

Průběh jednoho kola podle komunitního scénáře:

1. `event: "Throw detected"`, postupně 1–3 šipky v `throws`.
2. Případně `event: "Dart corrected"`.
3. `status: "Takeout in progress"`, `event: "Takeout started"`.
4. `status: "Throw"`, `event: "Takeout finished"`, `throws: []`.

Souřadnice jsou normalizované k vnějšímu okraji double (170 mm), x doprava a y k sektoru 20. Netrefa je `{"name":"M","number":0,"multiplier":0}`, vnější bull `{"name":"25","number":25,"multiplier":1}`.

Záznamy z 11. 10. 2026 potvrzují obálku `state`, celé pole `throws`, zásahy, 25, Bull i netrefy `M<number>` s násobitelem 0. Odražené šipky mají `bouncer: true`, `Miss`, číslo a násobitel 0 a souřadnice 0,0. Tyto souřadnice proto nesmějí vyhrát rozhoz.

Potvrzený průběh je `Throw detected` (1–3), třetí hod se stavem `Takeout`, `Takeout started` / `Takeout in progress`, následně `Takeout finished` s `numThrows: 0` **bez pole throws**. Často následuje ještě `Manual reset` s nulou; nesmí vytvořit druhé kolo. V záznamu jsou i návštěvy s jednou / dvěma šipkami a prázdná vytažení. Hra průběžně přebírá snapshoty, ale hráče přepne až na prázdném terči. Rozbor a regresní ověření viz [herní režim](herni-rezim.md).

`Dart corrected` se v těchto záznamech nevyskytl; jeho zpracování je ověřené syntetickými regresními případy. Kamerové kanály a metadata původních her tyto soubory neobsahují. Inspektor nadále ukládá zprávy beze změny; interpretace probíhá samostatně ve hře.


## Kompatibilita s Board Managerem 2.1.0 (ověřeno 2. 11. 2026)

Produkční záznam `2026-10-27_18-07-12.jsonl` uvádí na řádku 5 verzi **2.0.2**.
V `2026-11-01_17-25-38.jsonl` je na řádku 5 stále 2.0.2, ale po obnovení spojení na řádku 9 již **2.1.0** (`2026-11-01T16:34:12.748Z`, tedy 17:34:12 SEČ).
První následující WebSocket zpráva na řádku 10 už má nový formát. Pozdější nedělní relace také uvádějí 2.1.0.
Záznam potvrzuje změnu běžící verze; neříká, jakým způsobem byla aktualizace spuštěna.

| Údaj | 2.0.2 | 2.1.0 |
|---|---|---|
| Zásah | `throws[i].segment.number / multiplier / name` | `throws[i].segmentNumber / multiplier / segmentName` |
| Souřadnice | `throws[i].coords.x / y` | `throws[i].coordsX / coordsY` |
| Počet šipek | `numThrows` | délka pole `throws`, `numThrows` chybí |
| Začátek vytažení | `Takeout started`, `Takeout in progress` | `takeoutStarted`, `takeoutInProgress` |
| Konec vytažení | `Takeout finished` | `takeoutFinished` |

Původní parser vyžadoval vnořené `segment`, proto odmítal všechny nedělní ploché zásahy. Inspektor ukládá celé zprávy před interpretací a dál fungoval; ve hře se žádné nové hody nezapsaly. To také vysvětluje, proč návrat ke starší aplikaci se stejným parserem problém neodstranil. Bez záznamu z úspěšné windowsové relace nelze určit tehdejší verzi Board Manageru ve Windows.

Oprava čte obě struktury zásahu i souřadnic a rozpoznává názvy událostí s mezerami i camelCase. Počáteční `GET /api/state` přijme také pole `throws` bez `numThrows`. Původní obsah zpráv v Dev a na disku zůstává beze změny. Pokud je počet přítomen, musí souhlasit s polem šipek; neplatný nebo chybějící obsah se nepovažuje za vyprázdnění terče.

Hráč se stále střídá pouze na skutečně prázdném terči. Samotný název `takeoutFinished` nestačí: v reálných zprávách 2.1.0 se objevuje i se zapíchnutou první šipkou dalšího kola. Průběžné ubývání šipek při `takeoutInProgress` nesmaže skóre. Bouncer se nikdy nepoužije jako zásah středu se souřadnicemi 0,0.

Regresní fixture `tests/fixtures/board-manager-2.1-sessions.json` obsahuje 522 původních stavů terče z devíti nedělních relací (včetně jednoho počátečního snapshotu), bez osobních údajů hráčů. Před opravou vytvořil parser při přehrání těchto relací nula kol. Očekávání byla před změnou parseru odvozena původním enginem nad explicitním převodem nových zpráv do starého formátu. Po opravě se shodují počty všech 90 potvrzených kol, jejich bodové výsledky, zbytky i rozehrané šipky. Další testy ověřují skutečný vstup do X01 i Cricketu, neúplné vytažení a počáteční snapshot. Původní regresní replay z 11. října zůstává zachovaný; v úterním produkčním záznamu nový parser přečte všech 3 149 uložených výskytů šipek bez odmítnutí.
