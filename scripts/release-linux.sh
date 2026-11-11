#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
version=$(node -p "require('./package.json').version")
tag="v$version"
[[ "${GITHUB_REF_NAME:-$tag}" == "$tag" && "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]
node -e 'if (require("./src-tauri/tauri.conf.json").version !== process.argv[1]) process.exit(1)' "$version"
grep -Fx "version = \"$version\"" src-tauri/Cargo.toml
TAURI_CONFIG='{"bundle":{"resources":[]}}' cargo test --locked --manifest-path src-tauri/Cargo.toml
pnpm test

out="$PWD/outputs/linux/$version"
mkdir -p "$out"
work=$(mktemp -d)
trap 'rm -rf -- "$work"' EXIT
deps=()
packages=()
printf '## Instalace a aktualizace na Xubuntu x86_64\n\n' > "$out/INSTALACE.md"
printf 'Při prvním přechodu z 0.1.7 stáhni všechny tři uvedené balíčky. Při dalších aktualizacích stačí nový balíček aplikace a případné chybějící nebo novější závislosti.\n\n' >> "$out/INSTALACE.md"

for component in zvuky hlasatel; do
  read -r asset_version asset_tag < <(node -e 'const c = require("./scripts/linux-components.json")[process.argv[1]]; console.log(c.version, c.release)' "$component")
  [[ "$asset_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ && "$asset_tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]
  name="sipky-$component"
  deps+=("$name (>= $asset_version)" "$name (<< $(( ${asset_version%%.*} + 1 )).0.0)")
  if [[ "$component" == zvuky ]]; then
    arch=all
    inputs=(public/sounds)
  else
    arch=amd64
    inputs=(scripts/prepare-linux-speech-runtime.py scripts/prepare-supertonic-preview.py scripts/speech-requirements.txt scripts/player-speech-worker.py scripts/speech_engine.py scripts/supertonic_backend.py scripts/SUPERTONIC-CODE-LICENSE.txt)
  fi
  file="${name}_${asset_version}_${arch}.deb"
  printf -- '- [%s](https://github.com/nerusilj/sipky/releases/download/%s/%s)\n' "$file" "$asset_tag" "$file" >> "$out/INSTALACE.md"
  if [[ "$asset_tag" != "$tag" ]]; then
    git diff --exit-code "$asset_tag" HEAD -- "${inputs[@]}"
    if [[ -n "${GITHUB_ACTIONS:-}" ]]; then
      gh release view "$asset_tag" --json assets --jq '.assets[].name' > "$work/asset-names"
      grep -Fx "$file" "$work/asset-names"
    fi
    continue
  fi

  stage="$work/$name"
  mkdir -p "$stage/DEBIAN" "$stage/usr/lib/sipky-assets"
  if [[ "$component" == zvuky ]]; then
    cp -a public/sounds "$stage/usr/lib/sipky-assets/"
    test -s "$stage/usr/lib/sipky-assets/sounds/game/applause.wav"
  else
    if [[ -z "${DARTS_SPEECH_ASSETS:-}" ]]; then
      mkdir -p .tools
      python3 scripts/prepare-supertonic-preview.py
      DARTS_SPEECH_ASSETS="$PWD/.tools/supertonic-3/assets"
    fi
    uv python install 3.12
    python_exe=$(uv python find --managed-python 3.12)
    python3 scripts/prepare-linux-speech-runtime.py --python-root "$(dirname "$(dirname "$python_exe")")" --assets "$DARTS_SPEECH_ASSETS"
    runtime="$PWD/src-tauri/tts-runtime-linux"
    uv pip install --python "$runtime/bin/python3" --target "$runtime/lib/python3.12/site-packages" -r scripts/speech-requirements.txt
    mv "$runtime" "$stage/usr/lib/sipky-assets/tts"
  fi
  cat > "$stage/DEBIAN/control" <<EOF
Package: $name
Version: $asset_version
Architecture: $arch
Maintainer: Sipky <nerusilj@users.noreply.github.com>
Section: games
Priority: optional
Description: $name assets for Sipky
EOF
  dpkg-deb --root-owner-group -Zzstd -z9 --build "$stage" "$out/$file"
  packages+=("$out/$file")
done

# Linuxový config přibaluje prostředky do AppImage. Pro tento DEB je přepíšeme
# a také vyřadíme kopii WAV z frontendu před vložením do binárky Rustu.
config=$(node -e 'console.log(JSON.stringify({build: {beforeBuildCommand: "pnpm build && rm -rf -- dist/sounds"}, bundle: {resources: [], linux: {deb: {depends: process.argv.slice(1)}}}}))' "${deps[@]}")
SIPKY_SPLIT_PACKAGE=1 pnpm tauri build --bundles deb --config "$config"
test ! -e dist/sounds
bundle_dir="src-tauri/target/release/bundle/deb"
bundles=("$bundle_dir"/*_"$version"_amd64.deb)
[[ "${#bundles[@]}" == 1 && -f "${bundles[0]}" ]]
app="$out/sipky_${version}_amd64.deb"
cp "${bundles[0]}" "$app"
python3 scripts/fix-linux-deb.py "$app"
packages+=("$app")
printf '\nPrvní instalace / přechod z 0.1.7:\n\n```bash\nsudo apt install ./sipky_%s_amd64.deb ./sipky-zvuky_*.deb ./sipky-hlasatel_*.deb\n```\n' "$version" >> "$out/INSTALACE.md"
printf '\nDalší aktualizace aplikace s kompatibilními závislostmi:\n\n```bash\nsudo apt install ./sipky_%s_amd64.deb\n```\n' "$version" >> "$out/INSTALACE.md"
bash scripts/check-split-debs.sh "${packages[@]}"
(
  cd "$out"
  sha256sum -- "${packages[@]##*/}" > SHA256SUMS.txt
)
