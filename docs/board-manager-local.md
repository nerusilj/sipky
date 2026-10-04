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

- Inspektor otevírá jen `ws://<host>:<port>/api/events` a nic na něj neodesílá.
- Nikdy nevolá `/api/config` ani `/api/system`: vracejí API klíč terče a TLS klíč.
- Nikdy nevolá PUT, POST ani PATCH (start, stop, reset, restart, kalibrace, streamy).

## Formát zpráv podle komunitních zdrojů (zatím neověřeno živě)

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

Tyto tvary jsou hypotéza, dokud je nepotvrdí skutečný hod. Inspektor je neinterpretuje, jen ukládá.
