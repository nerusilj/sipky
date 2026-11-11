#!/usr/bin/env bash
set -euo pipefail
[ "$(uname -s)" = Linux ] && [ "$(uname -m)" = x86_64 ] || { echo 'Spustit v Linuxu/WSL x86_64.' >&2; exit 1; }
ROOT=$(cd "$(dirname "$0")/.." && pwd)
mkdir -p "$ROOT/outputs/linux"
exec > >(tee "$ROOT/outputs/linux/build.log") 2>&1
export DARTS_BUILD_LOGGED=1
trap 'echo "Build selhal na radku $LINENO (kod $?). Podrobnosti: outputs/linux/build.log"' ERR
if [ "${1:-}" = --sync-clock ]; then
  python3 "$ROOT/scripts/sync-linux-clock.py"
fi
if ! command -v pkg-config >/dev/null || ! pkg-config --exists webkit2gtk-4.1 gtk+-3.0 openssl; then
  echo 'Instalace závislostí Ubuntu/Xubuntu (sudo může požádat o heslo uživatele Ubuntu).'
  sudo apt-get update
  sudo apt-get install -y build-essential pkg-config curl wget file patchelf libwebkit2gtk-4.1-dev libssl-dev librsvg2-dev libayatana-appindicator3-dev python3-venv
fi
ASSETS="${DARTS_SPEECH_ASSETS:-$ROOT/src-tauri/tts-runtime/assets}"
[ -d "$ASSETS/onnx" ] || { echo 'Chybí modely. Nastavte DARTS_SPEECH_ASSETS.' >&2; exit 2; }
# Oddělená linuxová kopie: nepřepíše Windows node_modules ani Rust target.
WORK="$(mktemp -d /var/tmp/darts-cz-linux.XXXXXX)"
echo "Pracovní složka (zůstane pro případ diagnostiky): $WORK"
printf '%s\n' "$WORK" > "$ROOT/outputs/linux/workdir.txt"
mkdir -p "$WORK/source" "$WORK/tools"
tar -C "$ROOT" --exclude='./.git' --exclude='./node_modules' --exclude='./.test-tmp' --exclude='./.tools' --exclude='./.claude' \
  --exclude='./dist' --exclude='./outputs' --exclude='./src-tauri/target' \
  --exclude='./src-tauri/tts-runtime*' --exclude='./src-tauri/gen' -cf - . | tar -C "$WORK/source" -xf -
cd "$WORK/source"
TOOLS="$WORK/tools"
NODE_VERSION=22.18.0
curl --fail --location "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-x64.tar.xz" -o "$TOOLS/node.tar.xz"
curl --fail --location "https://nodejs.org/dist/v$NODE_VERSION/SHASUMS256.txt" -o "$TOOLS/SHASUMS256.txt"
(cd "$TOOLS"; grep " node-v$NODE_VERSION-linux-x64.tar.xz$" SHASUMS256.txt | sed 's@node-v[^ ]*-linux-x64.tar.xz@node.tar.xz@' | sha256sum --check -)
tar -C "$TOOLS" -xf "$TOOLS/node.tar.xz"
export PATH="$TOOLS/node-v$NODE_VERSION-linux-x64/bin:$TOOLS/node-tools/node_modules/.bin:$PATH"
npm install --prefix "$TOOLS/node-tools" pnpm@11.25.0
if ! command -v cargo >/dev/null; then
  curl --fail --location https://sh.rustup.rs -o "$TOOLS/rustup.sh"
  sh "$TOOLS/rustup.sh" -y --profile minimal
  export PATH="$HOME/.cargo/bin:$PATH"
fi
python3 -m venv "$TOOLS/uv"
"$TOOLS/uv/bin/pip" install uv
UV="$TOOLS/uv/bin/uv"
export UV_PYTHON_INSTALL_DIR="$TOOLS/python"
"$UV" python install 3.12
PYTHON_EXE="$("$UV" python find --managed-python 3.12)"
PYTHON_ROOT="$(dirname "$(dirname "$PYTHON_EXE")")"
python3 scripts/prepare-linux-speech-runtime.py --python-root "$PYTHON_ROOT" --assets "$ASSETS"
bash "$ROOT/scripts/finish-linux-build.sh" "$WORK"
