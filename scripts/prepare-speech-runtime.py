"""Připraví přenositelný Python + jediný Supertonic engine z místních souborů."""
import argparse
import json
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parent.parent


def copy_dir(source, destination):
    shutil.copytree(source, destination, dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns('__pycache__', '*.pyc', 'site-packages', 'test', 'tests'))


def clear_generated(path):
    # Mazat lze jen dva vlastní generované adresáře přímo ve složce src-tauri.
    resolved = path.resolve()
    if resolved.parent != (ROOT / 'src-tauri').resolve() or resolved.name not in ('tts-runtime', 'tts-runtime.next'):
        raise ValueError('Neplatná cesta generovaného runtime.')
    if path.exists():
        shutil.rmtree(path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--speech-env', type=Path)
    parser.add_argument('--assets', type=Path)
    args = parser.parse_args()
    workspace = next((p for p in (ROOT, *ROOT.parents) if (p / '.tools' / 'supertonic-runtime' / 'pyvenv.cfg').is_file()), None)
    env = args.speech_env or (workspace / '.tools' / 'supertonic-runtime' if workspace else None)
    assets = args.assets or (workspace / '.tools' / 'supertonic-3' / 'assets' if workspace else None)
    if not env or not assets:
        raise SystemExit('Zadejte --speech-env a --assets podle docs/hlasatel.md.')
    config = dict(line.split(' = ', 1) for line in (env / 'pyvenv.cfg').read_text().splitlines() if ' = ' in line)
    python = Path(config['home'])
    target = ROOT / 'src-tauri' / 'tts-runtime'
    staging = ROOT / 'src-tauri' / 'tts-runtime.next'
    clear_generated(staging)
    staging.mkdir(parents=True)
    for file in python.iterdir():
        if file.suffix.lower() in ('.exe', '.dll', '.txt'):
            shutil.copy2(file, staging / file.name)
    copy_dir(python / 'Lib', staging / 'Lib')
    copy_dir(python / 'DLLs', staging / 'DLLs')
    packages = env / 'Lib' / 'site-packages'
    for package in packages.iterdir():
        if package.name in ('pip', '__pycache__') or package.name.startswith('pip-'):
            continue
        if package.is_dir():
            copy_dir(package, staging / 'site-packages' / package.name)
        else:
            (staging / 'site-packages').mkdir(exist_ok=True)
            shutil.copy2(package, staging / 'site-packages' / package.name)
    copy_dir(assets / 'onnx', staging / 'assets' / 'onnx')
    (staging / 'assets' / 'voice_styles').mkdir(parents=True)
    for voice in ('F1', 'M1'):
        shutil.copy2(assets / 'voice_styles' / f'{voice}.json', staging / 'assets' / 'voice_styles' / f'{voice}.json')
    shutil.copy2(assets / 'LICENSE', staging / 'SUPERTONIC-MODEL-LICENSE.txt')
    for source, destination in (('player-speech-worker.py', 'worker.py'), ('speech_engine.py', 'speech_engine.py'),
                                ('supertonic_backend.py', 'supertonic_backend.py'), ('SUPERTONIC-CODE-LICENSE.txt', 'SUPERTONIC-CODE-LICENSE.txt')):
        shutil.copy2(ROOT / 'scripts' / source, staging / destination)
    # Izolace od nainstalovaného Pythonu a knihoven uživatelského počítače.
    version = config.get('version', f'{sys.version_info.major}.{sys.version_info.minor}').split('.')
    (staging / f'python{version[0]}{version[1]}._pth').write_text('.\nLib\nDLLs\nsite-packages\n', encoding='utf-8')
    (staging / 'CREDITS.txt').write_text(
        'Supertonic 3: Supertone Inc., model OpenRAIL-M; kód MIT.\n'
        'Eliška = F1, Martin = M1. Model je sdílený pro oba hlasy.\n'
        'Model: supertone-oss-archive/supertonic-3 @ aafc6e32416a594460b32413efc49d7fe4ce6d46\n'
        'https://huggingface.co/supertone-oss-archive/supertonic-3\n'
        'Kód: https://github.com/supertone-oss-archive/supertonic @ 1e9799e964ea4c0dad7cde993b65c3c813a7b373\n'
        'Licence: SUPERTONIC-MODEL-LICENSE.txt, SUPERTONIC-CODE-LICENSE.txt\n'
        'Python: LICENSE.txt; NumPy/ONNX Runtime a závislosti: site-packages/*dist-info/\n', encoding='utf-8')
    clear_generated(target)
    staging.rename(target)
    print(json.dumps({'runtime': str(target), 'bytes': sum(p.stat().st_size for p in target.rglob('*') if p.is_file())}))


if __name__ == '__main__':
    main()
