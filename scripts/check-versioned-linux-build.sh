#!/usr/bin/env bash
set -euo pipefail
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="${1:?Zadejte slozku balicku}"
exec > >(tee "$OUT/verification.log") 2>&1
trap 'echo "Kontrola selhala na radku $LINENO (kod $?)."' ERR
python3 "$ROOT/scripts/verify-linux-packages.py" "$OUT"
mapfile -d '' DEBS < <(find "$OUT" -maxdepth 1 -name '*.deb' -print0)
[ "${#DEBS[@]}" -eq 1 ] || { echo 'Ocekavan prave jeden aktualni .deb.'; exit 1; }
CHECK=$(mktemp -d /var/tmp/darts-cz-check.XXXXXX)
mkdir -p "$CHECK/temp"
export TMPDIR="$CHECK/temp"
dpkg-deb --info "${DEBS[0]}"
dpkg-deb --extract "${DEBS[0]}" "$CHECK"
WORKER=$(find "$CHECK" -path '*/tts/worker.py' -print -quit)
[ -n "$WORKER" ] || { echo 'Chybi worker.'; exit 1; }
RUNTIME=$(dirname "$WORKER")
printf '%s\n' '{"name":"Radek","voice":"eliska"}' '{"name":"Martin","voice":"martin"}' | \
  "$RUNTIME/bin/python3" -I -u "$WORKER" --models "$RUNTIME/assets" --cache "$CHECK/speech" > "$CHECK/speech.jsonl"
"$RUNTIME/bin/python3" -c 'import json,sys,wave; rows=[json.loads(s) for s in open(sys.argv[1])]; assert len(rows)==2; [(print("Hlas OK:",r["file"]),wave.open(r["file"]).getnframes()>0 or sys.exit(1)) for r in rows]' "$CHECK/speech.jsonl"
if [ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ]; then
  mapfile -d '' IMAGES < <(find "$OUT" -maxdepth 1 -name '*.AppImage' -print0)
  [ "${#IMAGES[@]}" -eq 1 ] || exit 1
  chmod +x "${IMAGES[0]}"
  echo 'Kontrola spusteni AppImage (okno se muze na 12 sekund otevrit).'
  STATUS=0
  APPIMAGE_EXTRACT_AND_RUN=1 timeout 12 "${IMAGES[0]}" > "$OUT/appimage-startup.log" 2>&1 || STATUS=$?
  if [ "$STATUS" -ne 0 ] && [ "$STATUS" -ne 124 ]; then
    cat "$OUT/appimage-startup.log"
    exit "$STATUS"
  fi
  echo 'AppImage se spustil bez okamziteho padu.'
else
  echo 'Bez grafickeho prostredi: spusteni okna AppImage nebylo overeno.'
fi
echo 'OVERENI DOKONCENO. Docasne rozbaleny balik:' "$CHECK"
