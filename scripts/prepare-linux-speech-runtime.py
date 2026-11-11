"""Přibalí celý přenositelný linuxový Python (z uv) a společný model hlasatele."""
import argparse
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parent.parent


def main():
    if sys.platform != 'linux':
        raise SystemExit('Linuxový runtime se připravuje v Linuxu nebo WSL.')
    parser = argparse.ArgumentParser()
    parser.add_argument('--python-root', type=Path, required=True)
    parser.add_argument('--assets', type=Path, required=True)
    args = parser.parse_args()
    source = args.python_root.resolve()
    assets = args.assets.resolve()
    python_exe = source / 'bin' / 'python3'
    if not python_exe.is_file():
        candidates = [p for p in (source / 'bin').glob('python3.*') if p.name[8:].isdigit() and p.is_file()]
        if candidates:
            python_exe = candidates[0]
    if not python_exe.is_file() or not (source / 'lib').is_dir():
        raise SystemExit('Chybí kompletní linuxová distribuce Pythonu.')
    if not (assets / 'onnx').is_dir():
        raise SystemExit('Chybí modely hlasatele.')
    target = ROOT / 'src-tauri' / 'tts-runtime-linux'
    # Jen vlastní generovaný adresář uvnitř projektu.
    if target.resolve().parent != (ROOT / 'src-tauri').resolve():
        raise SystemExit('Neplatný cílový adresář.')
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(source, target, symlinks=True)
    if not (target / 'bin' / 'python3').exists():
        (target / 'bin' / 'python3').symlink_to(python_exe.name)
    shutil.copytree(assets / 'onnx', target / 'assets' / 'onnx')
    (target / 'assets' / 'voice_styles').mkdir(parents=True)
    for voice in ('F1', 'M1'):
        shutil.copy2(assets / 'voice_styles' / f'{voice}.json', target / 'assets' / 'voice_styles' / f'{voice}.json')
    license_file = assets / 'LICENSE'
    if not license_file.exists():
        license_file = assets.parent / 'SUPERTONIC-MODEL-LICENSE.txt'
    shutil.copy2(license_file, target / 'SUPERTONIC-MODEL-LICENSE.txt')
    for source_name, destination in [('player-speech-worker.py', 'worker.py'), ('speech_engine.py', 'speech_engine.py'),
                                     ('supertonic_backend.py', 'supertonic_backend.py'),
                                     ('SUPERTONIC-CODE-LICENSE.txt', 'SUPERTONIC-CODE-LICENSE.txt')]:
        shutil.copy2(ROOT / 'scripts' / source_name, target / destination)
    (target / 'CREDITS.txt').write_text('Python: přenositelná distribuce python-build-standalone přes uv.\n'
        'Supertonic 3, Supertone Inc.: model OpenRAIL-M, kód MIT. Hlasy F1/M1, jeden sdílený model.\n'
        'Licence Pythonu a knihoven jsou součástí přibalené distribuce a *.dist-info.\n', encoding='utf-8')
    print(target)


if __name__ == '__main__':
    main()
