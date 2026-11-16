# Šipky na televizi přes Chromecast

## Připojení v Šipkách

1. Zapněte televizi a Chromecast. Notebook a Chromecast připojte ke stejné místní síti.
2. V nativních Šipkách klikněte na **Domů → Připojit k TV**.
3. Vyberte svoji televizi. Chromecast načte televizní obrazovku Šipek a zobrazí aktuální hru nebo čekání na zahájení.
4. Po úspěšném připojení se televize zapamatuje. Při příštím spuštění můžete použít **Připojit k TV – název televize** nebo vybrat jiné zařízení. Přenos ukončíte tlačítkem **Odpojit TV**.

Televizor vykresluje skóre X01, Cricket nebo rozhoz na střed. Vpravo nahoře je při zapnuté integraci živý stav Autodarts. Volba **Živý terč** se promítne také na televizor. Rozložení X01 používá dlaždice pro všech osm hráčů.

Receiver používá plochu **1920 × 1080, 16:9** a přizpůsobí ji ploše, kterou poskytne Chromecast. Velikost okna notebooku do tohoto výpočtu nevstupuje. Chromecast 3 podporuje výstup až 1080p. Rozlišení vykreslování HTML určuje firmware. Pokud receiver dostane plochu 1280 × 720, vykreslí stejný layout v měřítku 2/3. [Specifikace Chromecastu](https://support.google.com/chromecast/answer/3046409) · [Podporovaná média Google Cast](https://developers.google.com/cast/docs/media)

## Jednorázové nasazení pro vývojáře

1. V kořeni projektu spusťte `pnpm build:cast`. Výsledkem je samostatný adresář `dist-cast/`.
2. Obsah nasaďte na statický HTTPS hosting dostupný z Chromecastu. Zachovejte relativní cesty k souborům vedle `receiver.html`.
3. V Google Cast SDK Developer Console vytvořte aplikaci typu **Custom Receiver** s HTTPS adresou `receiver.html`. Pro zkoušku před publikováním přidejte testovací Chromecast a počkejte na stav **Ready for Testing**. Po publikování bude receiver dostupný běžným uživatelům. [Google Cast SDK Developer Console](https://cast.google.com/publish/) · [Registrace aplikace a testovacího zařízení](https://developers.google.com/cast/docs/registration)
4. Před spuštěním vývojové verze nebo sestavením aplikace nastavte `VITE_CAST_APP_ID` na přidělené osmimístné ID. Pro místní vývoj stačí řádek `VITE_CAST_APP_ID=1234ABCD` v souboru `.env.local` a restart Vite. V instalační verzi je ID součástí frontendu.

### Nasazení z repozitáře Šipek

Na GitHubu v repozitáři `nerusilj/sipky` vyberte **Settings → Pages → Source → GitHub Actions**. Po nahrání změn do hlavní větve otevřete **Actions → Televizní obrazovka → Run workflow** a zvolte `main`. Úloha sestaví a zveřejní adresář `dist-cast/`. Do Google Cast Console patří adresa `https://nerusilj.github.io/sipky/receiver.html`, pokud GitHub Pages používá výchozí doménu. Stejnou úlohu spusťte při změnách televizní obrazovky nebo protokolu Cast. [Nastavení GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## Přenos skóre

Šipky najdou Chromecast přes mDNS, ověří jeho identitu a spustí na něm vlastní receiver. Rust odesílá nejnovější stav přímo přes místní relaci Cast. Hosting slouží k načtení souborů receiveru. Prověřování identity využívá ověřovací kód z knihovny chromiacast 0.3.1 a důvěryhodné kořeny z projektu Open Screen, viz `public/licenses/cast/`. Zapamatované zařízení poznají Šipky podle ID a otisku jeho ověřeného certifikátu. [Protokol Cast](https://chromium.googlesource.com/openscreen/+/HEAD/cast/docs/protocol_flow.md)

Aktualizace odejde po každém zaznamenaném hodu nebo opravě bez čekání na potvrzení předchozí zprávy. Při rychlé sérii změn se odešle nejnovější snímek a receiver ignoruje zastaralé revize. Po potvrzení prvního snímku ukážou Šipky stav **Připojeno k TV**. [Vlastní zprávy CAF](https://developers.google.com/cast/docs/web_receiver/core_features#custom_messages)

## Ověření na Chromecastu 3

- Připojte televizi před zahájením i uprostřed hry. V obou režimech vyzkoušejte ruční hod, hod z Autodarts, opravu, Zpět, změnu hráče a výsledek. V X01 vyzkoušejte také rozhoz.
- Ověřte **Odpojit TV**, rychlé připojení po restartu Šipek a stav při ztrátě připojení.
- U Full HD televize zkontrolujte její HDMI režim a viewport receiveru. Zpoždění změřte z videa, které současně zachycuje notebook i televizi. [Ladění Web Receiveru](https://developers.google.com/cast/docs/debugging/remote_debugger)
