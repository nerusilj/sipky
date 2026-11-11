# Sestavení pro Xubuntu x86_64

## Vydávání od 0.1.8

Na GitHubu vyvolá tag `vX.Y.Z` sestavení a publikaci linuxových DEB. Číslo tagu musí odpovídat `package.json`, konfiguraci Tauri a balíčku `sipky` v souborech Cargo. Vydání obsahuje nový DEB aplikace, kontrolní součty a odkazy na odpovídající zvuky a offline hlasatel. Nové verze doplňkových balíčků jsou přiložené jen při jejich vydání.

Pro běžnou opravu ponechte `scripts/linux-components.json` beze změny. Při změně WAV upravte verzi a tag položky `zvuky`. Při změně hlasového workeru, modelu nebo jeho závislostí upravte `hlasatel`. Tag u položky určuje vydání, ke kterému se daný DEB přiloží. Workflow ověřuje, že u převzatého balíčku existuje soubor v odkazovaném vydání a jeho zdrojové vstupy se nezměnily. Hlavní verze doplňku vymezuje kompatibilitu.

V prvním vydání po 0.1.8 s panelem **Verze aplikace** bude potřeba jednou nainstalovat nový DEB ručně. Panel potom kontroluje nejnovější stabilní vydání přímo v `nerusilj/sipky`. Tlačítko **Aktualizovat** je dostupné v nainstalované dělené verzi DEB pro x86_64. Vydání poskytuje `linux-components.json`, podle kterého aplikace dohledá chybějící nebo nekompatibilní zvuky a hlasatel. Stažené soubory ověří podle SHA-256 z GitHubu a předá je APT po potvrzení systémového dialogu. Po úspěšné instalaci aplikaci restartujte. Windows a AppImage zobrazují stav verze a odkaz na dostupné vydání.

Po odeslání commitu na GitHub označte stejný commit tagem a odešlete tag. Pro první vydání je postup následující.

```sh
git tag -a v0.1.8 -m 'Šipky 0.1.8'
git push origin v0.1.8
```

Na Xubuntu stáhněte při přechodu z 0.1.7 aplikaci i oba doplňky do stejné složky a spusťte `sudo apt install ./sipky_0.1.8_amd64.deb ./sipky-zvuky_1.0.0_all.deb ./sipky-hlasatel_1.0.0_amd64.deb`. Při běžné další aktualizaci nainstalujte nový DEB aplikace. Systémové závislosti řeší `apt`. Po instalaci funguje hlasatel offline.

Místní sestavení stejných DEB spustí `pnpm install --frozen-lockfile` a `bash scripts/release-linux.sh` na Linuxu s nástroji uvedenými níže, Node.js 24, pnpm, Cargo a `uv`. Výstup je v `outputs/linux/<verze>/`. Pro přenosnou kompletní AppImage použijte postup níže.

## Kompletní přenosný balíček a historie sestavení

Cíle: instalační `.deb` a přenositelný `.AppImage`, včetně lokálního hlasatele (celý linuxový Python, ONNX knihovny, společný model a profily F1/M1). Windows Python se do linuxového balíčku nepoužívá. Hotové nahrávky a zvuky jsou přibalené ve frontendu.

## Stav

Sestavení 21. 10. 2026 na Ubuntu 26.04 ve WSL vytvořilo oba balíčky: DEB 489,18 MiB a AppImage 529,44 MiB. Prošlo 102 testů, TypeScript i produkční sestavení frontendu. Oba linuxové hlasy skutečně vygenerovaly řeč. Kontrola výsledného DEB potvrdila Linux x86_64, kompletní Python, ONNX knihovny, modely, oba profily a licence; AppImage má správný formát typu 2 x86_64. Kontrolní součty SHA-256 obou zkopírovaných balíčků souhlasí. Závěrečný test scripts/check-linux-build.sh úspěšně ověřil syntézu obou hlasů z rozbaleného DEB a 12 sekund běhu AppImage bez okamžitého pádu ve WSL. Jde o test startu, nikoli úplnou vizuální a zvukovou kontrolu na cílovém počítači. Fyzický terč na cílovém Xubuntu nebyl ověřen.

## Příprava Ubuntu ve WSL

Aktuální cílový počítač uživatele: Xubuntu 26.04 x86_64; sestavovací prostředí Ubuntu 26.04 ve WSL. `scripts/build-linux.sh` chybějící systémové závislosti instaluje přes sudo a celý průběh zapisuje do `outputs/linux/build.log`.

Pro nejširší kompatibilitu sestavujte na Ubuntu 22.04. Sestavení na novějším Ubuntu může vyžadovat stejně nový systém i na cílovém PC. Tauri používá systémový WebKitGTK 4.1.

```bash
sudo apt-get update
sudo apt-get install -y build-essential pkg-config curl wget file patchelf libwebkit2gtk-4.1-dev libssl-dev librsvg2-dev libayatana-appindicator3-dev python3-venv
```

Po klonování projektu spusťte v Ubuntu následující příkazy z kořene repozitáře.

```bash
mkdir -p .tools
python3 scripts/prepare-supertonic-preview.py
DARTS_SPEECH_ASSETS="$PWD/.tools/supertonic-3/assets" bash scripts/build-linux.sh
```

Skript vytvoří samostatnou pracovní kopii v `/var/tmp`; Windows závislosti ani výsledný EXE nepřepisuje. Stáhne ověřený Node 22.18.0, pnpm 11.25.0, uv a přenositelný Python 3.12; chybějící Rust připraví přes rustup. Závislosti se stahují jen při sestavování. Model převezme z `src-tauri/tts-runtime/assets`, případně z adresáře nastaveného přes `DARTS_SPEECH_ASSETS`.

Před balením provede testy a skutečnou syntézu jména v izolovaném přibaleném Pythonu. Výsledky uloží do `outputs/linux/`: `.deb`, `.AppImage`, kontrolní součty SHA-256 a informace o systému, na kterém build proběhl. Pracovní kopii ponechá pro diagnostiku.

Po sestavení ověřte na cílovém Xubuntu spuštění, zvuk, generování nového jména, připojení terče a obnovení hry. Pro instalaci použijte `sudo apt install ./nazev-balicku.deb`; pro AppImage nastavte právo spuštění. Hraní a generování jmen potom nepotřebují internet.

Pokud apt hlásí `Release file ... is not valid yet`, zkontrolujte skutečný čas, nejen shodu Windows a WSL. Při chybných hodinách Windows kvůli dual bootu nepomůže samotný restart WSL. Volba `bash scripts/build-linux.sh --sync-clock` jednorázově nastaví hodiny Ubuntu podle čerstvé hlavičky Date ze zabezpečeného serveru Ubuntu a pokračuje sestavením; nemění nastavení Windows ani RTC. Sudo se případně zeptá na heslo v Ubuntu. Časové ověřování repozitářů zůstává zapnuté.

Podklady: [Tauri – Linux prerequisites](https://v2.tauri.app/start/prerequisites/#linux), [Debian balení](https://v2.tauri.app/distribute/debian/), [uv – managed Python](https://docs.astral.sh/uv/guides/install-python/).

Aktualizace 21. 10. 2026: desktop přehrává statické WAV přes načtený Blob stejně jako generovaná jména (oprava linuxového přehrávání čísel). Prošlo 105 testů při linuxovém sestavení. Metadata DEB se po balení automaticky opravují na ASCII Package: sipky; viditelný název Šipky zůstává. Kontrola nově odmítá neplatné technické názvy balíčků. Upravený archiv prošel kontrolou obsahu, skutečné přehrání čísel a instalaci aktualizace je třeba potvrdit na cílovém Linuxu.

Verze 0.1.1 (22. 10. 2026): úspěšně sestavena do outputs/linux/0.1.1. Statické zvuky používají příkaz static_audio a binární IPC stejně jako jména, nikoli fetch interní adresy. Prošlo 105 JS testů, 2 Rust testy (včetně všech 368 skutečných WAV), TypeScript, kontrola přibalených WAV a runtime v DEB, názvu Package: sipky a Version: 0.1.1, syntéza obou hlasů z rozbaleného DEB a 12sekundový test spuštění AppImage ve WSL. SHA-256 zkopírovaných souborů souhlasí. Skutečné slyšitelné přehrání čísel a efektů na cílovém Xubuntu zatím nepotvrzeno. Verze je vidět v Nastavení. DEB 516,10 MiB; AppImage 554,80 MiB.

Vývoj po verzi 0.1.1: sdílená aplikace při startu vždy otevírá Domů, neobnovuje hru mezi spuštěními a odstraňuje pouze starý klíč sipky.currentGame. Hra nyní existuje jen v paměti. Při zavření okna během zápasu je vyžadováno potvrzení, bez zápasu se okno zavře přímo. Nová hra během zápasu vyžaduje potvrzení zrušení. Data hráčů a nastavení se nemění. Prošlo 108 testů a TypeScript; nativní obsluha zavření zatím nebyla interaktivně ověřena v novém instalačním balíčku.


## Sestavení 0.1.5 (1. 11. 2026)

Aktuální zdroje zahrnují boty, hlášení „Hraje“, nové avatary a ikonu, jednotné přepínače, BUST, medaile a rozhoz na střed s automatickým vstupem Autodarts. Verze je sjednocená v package.json, Cargo.toml, Cargo.lock a konfiguraci Tauri.

Zdrojový archiv připraví `python scripts/prepare-linux-release.py`; obsahuje zdroje, testy, nahrávky a ikony, vynechává Windows runtime i buildové cache. Z Ubuntu 26.04 ve WSL se spouští:

```bash
bash scripts/build-linux-0.1.5.sh
```

Skript použije linuxový runtime a nástroje z existující pracovní složky, spustí testy, vytvoří DEB/AppImage a ověří verzi DEB, obsah, oba hlasy i start AppImage při dostupném grafickém prostředí. Výsledky a logy ukládá do `outputs/linux/0.1.5`. Připravený archiv ještě není hotový instalační balíček; dokončení potvrzuje teprve `build-status.txt` s hodnotou `COMPLETE` a úspěšný `verification.log`.


Dokončeno 1. 11. 2026: verze **0.1.5** byla úspěšně sestavena na Ubuntu 26.04.1 x86_64 ve WSL. Prošlo 177 JS testů, 7 Rust testů, TypeScript a produkční frontend. DEB má Package: sipky a Version: 0.1.5, obsahuje kompletní linuxový runtime a 370 platných statických WAV. Oba hlasy skutečně vygenerovaly řeč z rozbaleného DEB. AppImage prošel 12sekundovým startem bez okamžitého pádu. Nezávislá kontrola SHA-256 z Windows souhlasí u obou výsledků. DEB: 516,39 MiB; AppImage: 555,08 MiB. Výstupy, instalační návod, kontrolní součty a logy jsou v `outputs/linux/0.1.5`. Kontrola skutečného zvukového výstupu a fyzického terče zůstává na cílovém Xubuntu.


## Sestavení 0.1.6

Přehoz používá pouze krátký tlumený zvuk jako MIMO; hlasové nahrávky BUST jsou odstraněné. Verze je zvýšená na 0.1.6 a kontrola balíčků nově odmítá zbytky těchto dvou nahrávek. Očekává 368 ostatních WAV. Zdrojový archiv připravuje `scripts/prepare-linux-release.py`, sestavení v Ubuntu 26.04 spouští `scripts/build-linux-0.1.6.sh`. Hotové balíčky a logy jsou v `outputs/linux/0.1.6`; dokončení potvrzuje stav `COMPLETE`.

## Vydání 0.1.7 — 5. 11. 2026

Dokončeno v Ubuntu 26.04.1 x86_64 ve WSL skriptem `scripts/build-linux-0.1.7.sh`. Nové balíčky obsahují podporu zpráv Board Manageru 2.1, okamžité oslavy zavření, samostatný rozhoz na střed, jeho zrušení bez ukončení hry, ruční MIMO a sjednocené spodní ovládání. Sestavu hráčů lze měnit před zápasem.

Výsledky v `outputs/linux/0.1.7`: DEB **516,22 MiB** a AppImage **554,92 MiB**, zdrojový archiv a manifest, instalační návod, seznam změn, kontrolní součty a logy. `build-status.txt` obsahuje `COMPLETE`. Prošlo 197 Node testů, 7 Rust testů, TypeScript a produkční frontend. DEB má Package: sipky, Version: 0.1.7, kompletní linuxový runtime a 368 platných WAV. Oba hlasy vytvořily řeč z rozbaleného DEB. AppImage prošel 12sekundovým startem bez okamžitého pádu, bez chybového výstupu. SHA-256 obou zkopírovaných balíčků byl nezávisle ověřen ve Windows.

Přímé WSL v sandboxu vracelo E_ACCESSDENIED, mimo sandbox fungovalo. Build nepoužil automatizaci terminálu. Instalaci, slyšitelné přehrání a fyzický terč na cílovém Xubuntu je stále potřeba potvrdit při hře; start AppImage ve WSL tuto kontrolu nenahrazuje.
