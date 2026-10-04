# Autodarts: ověřené nálezy pro Darts CZ

Výzkum proveden **3. října 2026**. Žádný účet nebyl přihlášen a nebyla přijata skutečná zpráva. „Ověřeno ve zdroji“ znamená nalezeno v aktuálním veřejném klientu; neznamená otestováno s účtem ani smluvní záruku služby.

## Primární ověření

Přímé anonymní HTTP GET vrátily 200 pro:

- [Aktuální Play](https://play.autodarts.com/) → odkaz na `/assets/clients-CqbIjROi.js`.
- [Klientský bundle Play](https://play.autodarts.com/assets/clients-CqbIjROi.js) → implementace `MessageBroker`, `BoardService`, společného API klienta.
- [OIDC discovery](https://api.autodarts.com/.well-known/openid-configuration). Kopie veřejných metadat je v `evidence/openid-configuration.json`, otisky a čas stažení v `evidence/research-manifest.json`.
- Discovery na `.io` také vrátil 200, ale metadata odkazují na `.com`. Pro nový projekt vycházíme z `.com`.

Podpůrné zdroje:

- [Tools for Autodarts 3.1.0](https://github.com/creazy231/tools-for-autodarts/releases/tag/3.1.0), vydané 27. září 2026. [Soubor auth-cookie.ts](https://github.com/creazy231/tools-for-autodarts/blob/f79bd019359ebb7ac6050e92352b7bd6351b0cbf/entrypoints/auth-cookie.ts) dokládá `.com` auth endpointy. Tato extension přebírá token ze stránky; její způsob přihlášení není vhodný pro náš samostatný desktop.
- [ioBroker cloud.js](https://github.com/inventwo/ioBroker.autodarts/blob/d9c8586a4f47272484993e727a792f3c97e47a98/lib/cloud.js), změna 26. září 2026: stejné WS URL, ticket a odběry terče. Login používá `autodarts-play`; není tím doloženo oprávnění Darts CZ používat stejnou identitu.
- [autodarts_local_tournament API ledger](https://github.com/thomasasen/autodarts_local_tournament/blob/d577f59a7bf77b4ca2dd02fd1cbd2945b5ff7dd7/docs/autodarts-api-capabilities.md), stav dokumentu 13. srpna 2026: `.com` API, Bearer auth, čtení terčů. Sám označuje WS nálezy jako community evidence.
- [Migrační návod lloydowen](https://gist.github.com/lloydowen/960079f2b518f6f5d68e160465298964), poslední aktivita 29. května 2026: registrace třetích stran, veřejní klienti, PKCE a volitelný device grant. Starší `.io` hostname v návodu je potřeba porovnat s aktuálním discovery.

## API a autentizace

Aktuální host: `https://api.autodarts.com`. Discovery uvádí:

| Údaj | Hodnota |
|---|---|
| issuer | `https://api.autodarts.com/auth` |
| authorization_endpoint | `https://api.autodarts.com/auth/v1/oauth/authorize` |
| token_endpoint | `https://api.autodarts.com/auth/v1/exchange` |
| device_authorization_endpoint | `https://api.autodarts.com/auth/v1/device/code` |
| userinfo_endpoint | `https://api.autodarts.com/auth/v1/userinfo` |
| jwks_uri | `https://api.autodarts.com/auth/.well-known/jwks.json` |
| code_challenge_methods_supported | `S256` |
| token_endpoint_auth_methods_supported | `none`, `client_secret_post` |
| scopes_supported | `openid`, `profile`, `email` |

Discovery inzeruje `authorization_code`, `client_credentials`, device grant, `password`, `otp`, `refresh_token`. **Dostupnost konkrétního grantu pro třetí stranu z toho neplyne.** Starší migrační návod password grant odmítá; aktuální ioBroker zdroj naopak volá `/auth/v1/login` s first-party ID. Tyto nálezy neopravňují k jeho použití pro Darts CZ.

Migrační návod vyžaduje registraci vlastního `client_id`, pro desktop doporučuje veřejný klient s PKCE. Device grant musí být povolen pro klienta. Popisuje access token 15 minut a refresh token 30 dní s rotací; tyto doby nejsou ověřené skutečnou token response. Aktuální auth zdroj Tools dokládá `/auth/v1/exchange`, `/auth/v1/refresh`, `/auth/v1/token`, `/auth/v1/device/token` na `.com`.

Zvolené pokračování: **vlastní veřejný OAuth klient + systémový prohlížeč + PKCE S256**, případně registrovaný device grant. Bez hesel v aplikaci a bez sdílení tokenů s Play. Tokeny pouze v paměti; přetrvávání přihlášení není součástí v0.1. Nepotřebujeme klientské tajemství distribuované v desktopu.

## Překážka a zastavení implementace

Nemáme potvrzené registrované `client_id` Darts CZ, redirect URI ani povolení device grant. Autorizovaný tok nelze spolehlivě otestovat. Podle výslovného zadání se **živá implementace zastavuje**. `UnregisteredAuthProvider` vrací tuto překážku. Nevytváříme přihlášení přes first-party ID, ruční kopírování tokenů, čtení cookies ani WebSocket monkey-patch.

Další krok: požádat správce Autodarts (migrační návod uvádí lloydowen na Discordu) o registraci veřejného klienta Darts CZ a loopback redirect URI, nebo o aktivaci device grant. Žádná zpráva správci nebyla odeslána.

## Čtení terčů

Oficiální bundle má základ `https://api.autodarts.com/bs/v0` a `getBoards()` volá **GET `/boards`**, tedy `GET https://api.autodarts.com/bs/v0/boards`. Konstruktor terče používá mj. `id`, `name`, `permissions`, `matchId`. Tvar a oprávnění skutečné odpovědi nebyly ověřeny. `matchId` je kandidát pro nalezení již běžícího zápasu, nikoli ověřený postup bootstrapu.

Společný API klient nastavuje Bearer autorizaci přes request interceptor z [auth modulu Play](https://play.autodarts.com/assets/src-DxMWx8xG.js): `Authorization: Bearer <access-token>`. Současně má HTTP klient `withCredentials: true`; význam cookies pro nezávislou třetí stranu nebyl otestovaný. Darts CZ dosud žádné account/board REST volání neprovádí.

## WebSocket: přesný formát ve zdroji Play

REST základ message brokeru: `https://play.ws.autodarts.com/ms/v0`.

1. Zajistí aktuální token.
2. Provede **POST `https://play.ws.autodarts.com/ms/v0/tickets`** přes autentizovaný API klient.
3. Čte `response.data.code`.
4. Otevře **`wss://play.ws.autodarts.com/ms/v0/subscribe?code=<ticket>`**.
5. Při otevření odešle registrované odběry.

Získání ticketu je kontrolní operace pro stream, nikoli mutace zápasu. Play při chybě ticketu zkouší URL bez `code`; tento fallback není důkazem dostupného anonymního streamu a pro Darts CZ ho neimplementujeme. Bearer patří do HTTP požadavku na ticket. V prohlížečovém WS konstruktoru nejsou další vlastní hlavičky ani subprotocol. Ticket ani URL s ticketem nepatří do diagnostiky/exportu. Případná závislost na Origin či cookies zůstává neověřená.

Odběr / zrušení odběru:

```json
{"type":"subscribe","channel":"autodarts.boards","topic":"<board-id>.events"}
{"type":"unsubscribe","channel":"autodarts.boards","topic":"<board-id>.events"}
```

Příjem brokeru parsuje JSON a vybírá **`type`, `channel`, `topic`, `data`**. Níže je strukturální ukázka odvozená ze čtení kódu, **nikoli zachycená zpráva**; záměrně žádný vymyšlený obsah `data`:

```json
{"channel":"autodarts.boards","topic":"<board-id>.state","data":{}}
```

Zdroj výslovně řeší `type === "error"`, ale tvar ostatních chybových polí nedokládá. Inspektor uchovává celou obálku i chybové a neparsovatelné zprávy, ne jen `.data`.

## Témata přímo nalezená v aktuálním brokeru Play

| Kanál | Témata doložená pomocnými metodami |
|---|---|
| `autodarts.boards` | `<board-id>.state`, `<board-id>.events`, `<board-id>.matches`, `discovery.<id>`, `<board-id>.stream` |
| `autodarts.matches` | `<match-id>.state`, `<match-id>.events`, `matches`, `<match-id>.game-events`, `<match-id>.corrections`, `<match-id>.viewers`, `<match-id>.referee`, `<match-id>.challenge` |
| `autodarts.boards.images` | `<board-id>.<camera-id>` |
| `autodarts.lobbies` | `<lobby-id>.state`, `<lobby-id>.events`, `lobbies` |

Enum navíc obsahuje `autodarts.matchmaking`, `.users`, `.permissions`, `.chat`, `.tournaments`, `.maintenance`, `.friends`, `.notifications`, `.controls`. Přítomnost konstanty neznamená přístup ke všem událostem ani znalost jejich obsahu. Pro v0.1 jsou relevantní terč a jeho zápas; plošné wildcards nebyly ověřeny. Přesné povolené odběry se potvrdí až prvními reálnými zprávami.

## Reconnect a souběh s Play

Play po zavření socketu opakuje spojení s rostoucím náhodně rozptýleným zpožděním, znovu kontroluje token, získá ticket a po otevření obnoví odběry. ioBroker má backoff 3–60 sekund. Neviděli jsme doložený resume cursor ani replay zmeškaných zpráv. Aplikační heartbeat a životnost ticketu jsou neznámé; heartbeat nebude odhadován.

**Souběh Darts CZ + oficiální Play nebyl otestovaný.** Samostatný broker v komunitním klientu dokládá možnost vlastní implementace, nikoli serverovou garanci více spojení. Neznáme limity spojení, vedlejší efekt odběru na viewer count ani oprávnění třetího klienta. Budoucí ověření musí sledovat, že Play pokračuje normálně, a proběhnout pouze s čtecími REST požadavky, auth/ticket operacemi a odběry.

## Co zbývá ověřit živě

- Vlastní OAuth registrace, přihlášení, 2FA a souhlas; scopes pro board/match čtení.
- Obnovení a rotace tokenů, 401/403, odmítnutý ticket, WS handshake a chyby odběru.
- Terče dostupné účtu a spolehlivé nalezení zápasu spuštěného před inspektorem.
- První skutečná zpráva a následná kontrola obálky před další integrací.
- Přesné payloady, změna zápasu, ztráta sítě, opětovné odběry, možnost zmeškaných událostí a souběh s Play.

Žádná logika hodů, pořadí hráčů, bust, checkout, undo ani takeout se v této etapě neinterpretuje.
