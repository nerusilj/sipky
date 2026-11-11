#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
SOURCE=/tmp/darts-cz-linux.S4618h
DEST=/var/tmp/darts-cz-linux.S4618h
[ ! -L "$SOURCE" ] && [ ! -L "$DEST" ] || { echo 'Neocekavany symbolicky odkaz.'; exit 1; }
if [ -d "$SOURCE" ]; then
  [ ! -e "$DEST" ] || { echo 'Cil uz existuje; nic neprepisuji.'; exit 1; }
  [ "$(realpath "$SOURCE")" = "$SOURCE" ] || exit 1
  [ "$(realpath /var/tmp)" = /var/tmp ] || exit 1
  [ -f "$SOURCE/source/package.json" ] || exit 1
  echo 'Presouvam rozpracovany build z tmpfs na linuxovy disk.'
  mv -- "$SOURCE" "$DEST"
fi
[ -f "$DEST/source/package.json" ] || { echo 'Chybi pracovni kopie.'; exit 1; }
printf '%s\n' "$DEST" > "$ROOT/outputs/linux/workdir.txt"
df -h "$DEST"
bash "$ROOT/scripts/finish-linux-build.sh" "$DEST"
