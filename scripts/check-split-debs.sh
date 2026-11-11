#!/usr/bin/env bash
set -euo pipefail
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
for package in "$@"; do
  name=$(dpkg-deb -f "$package" Package)
  dpkg-deb -x "$package" "$work/$name"
  case "$name" in
    sipky)
      deps=$(dpkg-deb -f "$package" Depends)
      for dependency in libwebkit2gtk-4.1-0 sipky-zvuky sipky-hlasatel; do
        [[ "$deps" == *"$dependency"* ]]
      done
      file "$work/sipky/usr/bin/sipky" | grep -E 'ELF 64-bit.*x86-64'
      test "$(stat -c %s "$package")" -lt $((20 * 1024 * 1024))
      test -z "$(find "$work/sipky" -type d \( -name sounds -o -name tts -o -name sipky-assets \) -print)"
      ;;
    sipky-zvuky)
      test "$(dpkg-deb -f "$package" Architecture)" = all
      diff -qr public/sounds "$work/$name/usr/lib/sipky-assets/sounds"
      ;;
    sipky-hlasatel)
      test "$(dpkg-deb -f "$package" Architecture)" = amd64
      runtime="$work/$name/usr/lib/sipky-assets/tts"
      printf '%s\n' '{"name":"Radek","voice":"eliska"}' '{"name":"Martin","voice":"martin"}' | \
        "$runtime/bin/python3" -I -u "$runtime/worker.py" --models "$runtime/assets" --cache "$work/hlaseni" > "$work/voices.jsonl"
      python3 - "$work/voices.jsonl" <<'PY'
import json
import sys
import wave

with open(sys.argv[1]) as output:
    responses = [json.loads(line) for line in output]
assert len(responses) == 2, responses
for response in responses:
    with wave.open(response['file']) as audio:
        assert audio.getframerate() == 44100 and audio.getnframes() > 0
PY
      ;;
    *) echo "Neznámý balíček: $name" >&2; exit 1 ;;
  esac
  echo "Ověřeno: $(basename "$package")"
done
