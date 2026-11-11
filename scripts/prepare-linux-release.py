"""Připraví zdrojový archiv pro verzované sestavení ve WSL bez Windows runtime."""
import hashlib
import json
from pathlib import Path
import re
import tarfile
import tomllib

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
assert re.fullmatch(r'\d+\.\d+\.\d+', version), 'Neplatná verze.'
assert json.loads((root / 'src-tauri/tauri.conf.json').read_text(encoding='utf-8'))['version'] == version
assert tomllib.loads((root / 'src-tauri/Cargo.toml').read_text(encoding='utf-8'))['package']['version'] == version
assert f'name = "sipky"\nversion = "{version}"' in (root / 'src-tauri/Cargo.lock').read_text(encoding='utf-8')
assert (root / f'scripts/build-linux-{version}.sh').is_file()

files = {root / name for name in ('package.json', 'pnpm-lock.yaml', 'index.html', 'tsconfig.json', 'vite.config.ts', 'README.md')}
for name in ('src', 'public', 'scripts', 'tests', 'docs', 'src-tauri/src', 'src-tauri/icons', 'src-tauri/capabilities'):
    files.update(path for path in (root / name).rglob('*') if path.is_file() and not path.is_symlink()
                 and '__pycache__' not in path.parts and path.suffix != '.pyc'
                 and path.relative_to(root).as_posix() != 'scripts/audio/error-source.mp3')
files.update(path for path in (root / 'src-tauri').iterdir() if path.is_file())
ordered = sorted(files, key=lambda path: path.relative_to(root).as_posix())
out = root / 'outputs/linux' / version
out.mkdir(parents=True, exist_ok=True)
archive = out / f'source-{version}.tar.gz'
with tarfile.open(archive, 'w:gz', compresslevel=6) as bundle:
    for path in ordered:
        bundle.add(path, arcname=path.relative_to(root).as_posix(), recursive=False)
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
(out / f'source-{version}.sha256').write_text(f'{digest}  {archive.name}\n', encoding='utf-8', newline='\n')
manifest = {'version': version, 'target': 'Xubuntu 26.04 x86_64', 'archive': archive.name, 'sha256': digest,
            'files': [{'path': path.relative_to(root).as_posix(), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()} for path in ordered]}
(out / 'source-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')
print(f'Zdrojový archiv {version}: {len(ordered)} souborů, {archive.stat().st_size / 1024**2:.2f} MiB.')
print(f'SHA-256: {digest}')
