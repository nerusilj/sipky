#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK="${1:-$(cat "$ROOT/outputs/linux/workdir.txt")}"
case "$WORK" in /tmp/darts-cz-linux.*|/var/tmp/darts-cz-linux.*) ;; *) echo 'Neplatna pracovni slozka.' >&2; exit 1;; esac
[ -f "$WORK/source/package.json" ] || { echo 'Chybi pripravena pracovni kopie.' >&2; exit 1; }
if [ "${DARTS_BUILD_LOGGED:-0}" != 1 ]; then
  exec > >(tee -a "$ROOT/outputs/linux/build.log") 2>&1
fi
trap 'echo "Pokracovani buildu selhalo na radku $LINENO (kod $?)."' ERR
TOOLS="$WORK/tools"
mkdir -p "$WORK/temp"
export TMPDIR="$WORK/temp"
export PATH="$TOOLS/node-v22.18.0-linux-x64/bin:$TOOLS/node-tools/node_modules/.bin:$HOME/.cargo/bin:$PATH"
export UV_PYTHON_INSTALL_DIR="$TOOLS/python"
cd "$WORK/source"
RUNTIME="$WORK/source/src-tauri/tts-runtime-linux"
"$TOOLS/uv/bin/uv" pip install --python "$RUNTIME/bin/python3" --target "$RUNTIME/lib/python3.12/site-packages" -r scripts/speech-requirements.txt
printf '%s\n' '{"name":"Radek","voice":"eliska"}' '{"name":"Martin","voice":"martin"}' | \
  "$RUNTIME/bin/python3" -I -u "$RUNTIME/worker.py" --models "$RUNTIME/assets" --cache "$WORK/speech-check" > "$WORK/speech-check.jsonl"
"$RUNTIME/bin/python3" -c 'import json,sys,wave; rows=[json.loads(s) for s in open(sys.argv[1])]; assert len(rows)==2; [(print("Hlasatel OK:",r["file"]),wave.open(r["file"]).getnframes()>0 or sys.exit(1)) for r in rows]' "$WORK/speech-check.jsonl"
pnpm install --frozen-lockfile
pnpm test
export APPIMAGE_EXTRACT_AND_RUN=1
export CARGO_BUILD_JOBS="${CARGO_BUILD_JOBS:-2}"
pnpm tauri build --bundles deb,appimage
OUT="$ROOT/outputs/linux"
mapfile -d '' PACKAGES < <(find src-tauri/target/release/bundle -type f \( -name '*.deb' -o -name '*.AppImage' \) -print0)
[ "${#PACKAGES[@]}" -ge 2 ] || { echo 'Chybi instalacni balicky.' >&2; exit 1; }
for package in "${PACKAGES[@]}"; do
  if [[ "$package" == *.deb ]]; then python3 "$ROOT/scripts/fix-linux-deb.py" "$package"; fi
  cp -- "$package" "$OUT/"
done
(cd "$OUT"; sha256sum -- *.deb *.AppImage > SHA256SUMS.txt)
{ uname -a; cat /etc/os-release; node --version; pnpm --version; cargo --version; } > "$OUT/build-system.txt"
echo "Hotovo: $OUT"
