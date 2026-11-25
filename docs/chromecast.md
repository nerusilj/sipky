# Šipky na televizi přes Chromecast

## Připojení v Šipkách

1. Zapněte televizi a Chromecast. Notebook a Chromecast připojte ke stejné místní síti.
2. V nativních Šipkách klikněte na **Domů → Připojit k TV**.
3. Vyberte svoji televizi. Chromecast načte televizní obrazovku Šipek a zobrazí aktuální hru nebo čekání na zahájení.
4. Po úspěšném připojení se televize zapamatuje. Při příštím spuštění můžete použít **Připojit k TV – název televize** nebo vybrat jiné zařízení. Přenos ukončíte tlačítkem **Odpojit TV**.

Televizor vykresluje skóre X01, Cricket nebo rozhoz na střed. Vpravo nahoře je při zapnuté integraci živý stav Autodarts. Volba **Živý terč** se promítne také na televizor. Rozložení X01 používá dlaždice pro všech osm hráčů.

Receiver používá plochu **1920 × 1080, 16:9** a přizpůsobí ji ploše, kterou poskytne Chromecast. Velikost okna notebooku do tohoto výpočtu nevstupuje. Chromecast 3 podporuje výstup až 1080p. Rozlišení vykreslování HTML určuje firmware. Pokud receiver dostane plochu 1280 × 720, vykreslí stejný layout v měřítku 2/3. [Specifikace Chromecastu](https://support.google.com/chromecast/answer/3046409) · [Podporovaná média Google Cast](https://developers.google.com/cast/docs/media)

Rozhodující je **CSS viewport receiveru** (`innerWidth` / `innerHeight`), nikoli fyzické rozlišení panelu, `screen.width`, DPR nebo velikost notebookového okna. Google uvádí pro Chromecast grafickou plochu 720p a u některých dalších platforem až 1080p. Aplikace tedy nemůže vynutit 4K rozhraní jen podle připojené 4K TV. Změna dostupné plochy přepočítá měřítko; odlišný poměr stran zachová celý obraz s volnými okraji. [Grafická plocha Web Receiveru](https://developers.google.com/cast/docs/android_tv_receiver/debugging)

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

## TV aktualizace 24. 11. 2026

Receiver přijímá také volitelnou žlutou přípravu `checkoutSetup` v kartách X01. Zobrazuje jen doporučené hody. Podmínky i vypnutí návrhu určuje aplikace; starší snapshot bez přípravy dál funguje. Po aktualizaci je potřeba TV odpojit a znovu připojit.

Televizní efekty používají odlehčené vykreslení bez CSS filtrů a masek bublinek. Radkovina zachovává obrázky 7, 19, 3 a plnění odspodu pomocí výšky ořezávajícího prvku. Podklady se předem načítají a dekódují při připojení. Ambrožovka používá plný barevný nápis, terč a méně konfet. Časování a protokol zůstávají stejné. Fyzický test na Chromecastu 3 je stále nutný.

### Revize velikostí a rozložení

Zelený dohoz i žlutá příprava používají TV písmo 28–38 px podle šířky karty v návrhové ploše. Nepřebírají již `vw` z fyzického viewportu, takže nedochází ke dvojímu zmenšení. Šipky mají společné TV rozestupy. Větší jsou také hody v kartách, jména a metriky Cricketu. Záhlaví zůstává ve třech sloupcích i při 720p; jeho prvky mají výslovně určené řádky a sloupce. Rozhoz má kompaktní avatary a celý seznam osmi účastníků se vejde bez posouvání. Lokální notebookové styly se touto změnou neupravují.

Pro revizi se používají umělé snapshoty X01 (zelená, žlutá, přehoz, vítěz; 2–8 hráčů, dlouhá jména, živý terč), Cricketu, rozhozu a výsledků i čekací obrazovky. Kontrolují se viewporty 1280 × 720, 1920 × 1080, 1024 × 768 a 3840 × 2160. To ověřuje rozložení v prohlížeči, nikoli výkon nebo firmware fyzického Chromecastu.
