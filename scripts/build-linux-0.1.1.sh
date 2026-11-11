#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
exec > >(tee "$ROOT/outputs/linux/native-audio-build.log") 2>&1
WORK=$(cat "$ROOT/outputs/linux/workdir.txt")
case "$WORK" in /var/tmp/darts-cz-linux.*) ;; *) echo 'Neocekavana pracovni slozka.'; exit 1;; esac
[ "$(realpath "$WORK")" = "$WORK" ] && [ -f "$WORK/source/package.json" ] || exit 1
OLD="/tmp/$(basename "$WORK")"
if [ -L "$OLD" ]; then
  [ "$(readlink "$OLD")" = "$WORK" ] || { echo 'Puvodni cesta odkazuje jinam; nic nemenim.'; exit 1; }
elif [ -e "$OLD" ]; then
  echo 'Puvodni cesta je obsazena; nic neprepisuji.'
  exit 1
else
  ln -s -- "$WORK" "$OLD"
fi
echo 'Pripravuji Sipky 0.1.1: Rust IPC pro vsechny zvuky.'
for FILE in package.json tsconfig.json src/pages/SettingsPage.tsx src/caller/caller.ts src/caller/audioSource.ts tests/audioSource.test.ts tests/sound.test.ts src-tauri/src/lib.rs src-tauri/src/static_audio.rs src-tauri/tauri.conf.json src-tauri/tauri.linux.conf.json src-tauri/tauri.windows.conf.json src-tauri/Cargo.toml src-tauri/Cargo.lock; do
  cp -- "$ROOT/$FILE" "$WORK/source/$FILE"
done
mkdir -p "$WORK/temp"
(cd "$WORK/source/src-tauri"; TMPDIR="$WORK/temp" CARGO_BUILD_JOBS=2 "$HOME/.cargo/bin/cargo" test --release --lib static_audio --offline)
bash "$ROOT/scripts/finish-versioned-linux-build.sh" "$WORK"
bash "$ROOT/scripts/check-versioned-linux-build.sh" "$ROOT/outputs/linux/0.1.1"
