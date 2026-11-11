#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OLD=/tmp/darts-cz-linux.S4618h
WORK=/var/tmp/darts-cz-linux.S4618h
[ -d "$WORK/source/src-tauri/target" ] && [ ! -L "$WORK" ] || exit 1
if [ -L "$OLD" ]; then
  [ "$(readlink "$OLD")" = "$WORK" ] || { echo 'Neocekavany cil odkazu.'; exit 1; }
elif [ -e "$OLD" ]; then
  echo 'Puvodni cesta je obsazena; nic neprepisuji.'
  exit 1
else
  ln -s -- "$WORK" "$OLD"
fi
echo 'Puvodni cesta ted odkazuje na pracovni kopii na linuxovem disku.'
bash "$ROOT/scripts/finish-linux-build.sh" "$WORK"
