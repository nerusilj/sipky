#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK=$(cat "$ROOT/outputs/linux/workdir.txt")
case "$WORK" in /var/tmp/darts-cz-linux.*) ;; *) echo 'Neocekavana pracovni slozka.'; exit 1;; esac
[ "$(realpath "$WORK")" = "$WORK" ] && [ -f "$WORK/source/package.json" ] || exit 1
for FILE in src/caller/caller.ts src/caller/audioSource.ts tests/audioSource.test.ts tests/sound.test.ts src-tauri/src/lib.rs src-tauri/src/static_audio.rs src-tauri/tauri.linux.conf.json src-tauri/tauri.windows.conf.json; do
  cp -- "$ROOT/$FILE" "$WORK/source/$FILE"
done
mkdir -p "$WORK/temp"
(cd "$WORK/source/src-tauri"; TMPDIR="$WORK/temp" CARGO_BUILD_JOBS=2 "$HOME/.cargo/bin/cargo" test --lib static_audio --offline)
bash "$ROOT/scripts/finish-linux-build.sh" "$WORK"
bash "$ROOT/scripts/check-linux-build.sh"
