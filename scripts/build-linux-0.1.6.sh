#!/usr/bin/env bash
set -euo pipefail
VERSION=0.1.6
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="$ROOT/outputs/linux/$VERSION"
mkdir -p "$OUT"
exec 9>"$OUT/build.lock"
flock -n 9 || { echo 'Toto sestaveni uz bezi v jinem terminalu.'; exit 1; }
exec > >(tee "$OUT/build.log") 2>&1
printf 'RUNNING\n' > "$OUT/build-status.txt"
trap 'STATUS=$?; printf "FAILED (kod %s, radek %s)\n" "$STATUS" "$LINENO" > "$OUT/build-status.txt"; echo "Sestaveni selhalo. Podrobnosti: $OUT/build.log"; exit "$STATUS"' ERR
[ "$(uname -s)" = Linux ] && [ "$(uname -m)" = x86_64 ] || { echo 'Spustit v Ubuntu/WSL x86_64.'; false; }
[ "$(. /etc/os-release; printf '%s' "$VERSION_ID")" = '26.04' ] || { echo 'Toto sestaveni je urcene pro Xubuntu 26.04; pouzijte Ubuntu 26.04.'; false; }
CACHE=$(cat "$ROOT/outputs/linux/workdir.txt")
case "$CACHE" in /var/tmp/darts-cz-linux.*) ;; *) echo 'Neocekavana pracovni slozka.'; false;; esac
[ "$(realpath "$CACHE")" = "$CACHE" ]
[ -f "$CACHE/source/package.json" ]
[ -x "$CACHE/tools/node-v22.18.0-linux-x64/bin/node" ]
[ -x "$CACHE/source/src-tauri/tts-runtime-linux/bin/python3" ]
# Zachovani puvodni cesty pro uz zkompilovane zavislosti po restartu WSL.
OLD="/tmp/$(basename "$CACHE")"
if [ -L "$OLD" ]; then
  [ "$(readlink "$OLD")" = "$CACHE" ]
elif [ -e "$OLD" ]; then
  echo 'Puvodni cesta je obsazena; nic neprepisuji.'; false
else
  ln -s -- "$CACHE" "$OLD"
fi
(cd "$OUT"; sha256sum --check source-0.1.6.sha256)
HASH=$(cut -d ' ' -f 1 "$OUT/source-0.1.6.sha256")
WORK="$CACHE/releases/$VERSION-$HASH"
SOURCE="$WORK/source"
mkdir -p "$SOURCE" "$WORK/temp"
tar -xzf "$OUT/source-0.1.6.tar.gz" -C "$SOURCE"
export TMPDIR="$WORK/temp"
export PATH="$CACHE/tools/node-v22.18.0-linux-x64/bin:$CACHE/tools/node-tools/node_modules/.bin:$HOME/.cargo/bin:$PATH"
export CARGO_TARGET_DIR="$CACHE/source/src-tauri/target"
export CARGO_BUILD_JOBS="${CARGO_BUILD_JOBS:-2}"
export APPIMAGE_EXTRACT_AND_RUN=1
RUNTIME="$SOURCE/src-tauri/tts-runtime-linux"
if [ ! -d "$RUNTIME" ]; then
  cp -a --reflink=auto "$CACHE/source/src-tauri/tts-runtime-linux" "$RUNTIME"
fi
# Aktualni hlasovy worker, linuxovy Python a modely zustavaji z overeneho runtime.
for FILE in player-speech-worker.py speech_engine.py supertonic_backend.py; do
  DEST="$FILE"; [ "$FILE" != player-speech-worker.py ] || DEST=worker.py
  cp -- "$SOURCE/scripts/$FILE" "$RUNTIME/$DEST"
done
cd "$SOURCE"
[ "$(node -p 'JSON.parse(require("fs").readFileSync("package.json", "utf8")).version')" = "$VERSION" ]
echo "Sestavuji Sipky $VERSION pro Xubuntu 26.04 x86_64."
pnpm install --frozen-lockfile
pnpm test
cargo test --release --locked --manifest-path src-tauri/Cargo.toml --lib
pnpm tauri build --bundles deb,appimage
for EXT in deb AppImage; do
  BUNDLE=deb; [ "$EXT" != AppImage ] || BUNDLE=appimage
  mapfile -d '' PACKAGES < <(find "$CARGO_TARGET_DIR/release/bundle/$BUNDLE" -maxdepth 1 -name "*_${VERSION}_amd64.$EXT" -type f -print0)
  [ "${#PACKAGES[@]}" -eq 1 ]
  cp -- "${PACKAGES[0]}" "$OUT/"
done
python3 scripts/fix-linux-deb.py "$OUT/Šipky_${VERSION}_amd64.deb"
(cd "$OUT"; sha256sum -- *.deb *.AppImage > SHA256SUMS.txt)
{ uname -a; cat /etc/os-release; node --version; pnpm --version; cargo --version; } > "$OUT/build-system.txt"
[ "$(dpkg-deb -f "$OUT/Šipky_${VERSION}_amd64.deb" Version)" = "$VERSION" ]
bash scripts/check-versioned-linux-build.sh "$OUT"
printf 'COMPLETE\n' > "$OUT/build-status.txt"
echo "HOTOVO: $OUT"
