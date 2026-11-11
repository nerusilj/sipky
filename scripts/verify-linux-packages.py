"""Kontrola výsledných balíčků bez instalace: ELF, desktop a kompletní linuxový hlasatel."""
import argparse
import json
import re
from pathlib import Path
import tarfile


def elf_x64(data):
    return data[:4] == b'\x7fELF' and data[4:6] == b'\x02\x01' and data[18:20] == b'\x3e\x00'


def verify_deb(path):
    files = set()
    binaries = {}
    wavs = set()
    package_name = None
    with path.open('rb') as package:
        if package.read(8) != b'!<arch>\n':
            raise ValueError('Neplatný Debian archiv.')
        while header := package.read(60):
            if len(header) != 60 or header[-2:] != b'`\n':
                raise ValueError('Poškozený Debian archiv.')
            name = header[:16].decode('ascii').strip().rstrip('/')
            size = int(header[48:58])
            offset = package.tell()
            if name.startswith('control.tar'):
                with tarfile.open(fileobj=package, mode='r|*') as control:
                    for entry in control:
                        if entry.name.removeprefix('./') == 'control':
                            metadata = control.extractfile(entry).read().decode('utf-8')
                            match = re.search(r'^Package:\s*(\S+)\s*$', metadata, re.MULTILINE)
                            package_name = match.group(1) if match else None
                package.seek(offset + size + size % 2)
                continue
            if name.startswith('data.tar'):
                with tarfile.open(fileobj=package, mode='r|*') as payload:
                    for item in payload:
                        key = item.name.removeprefix('./')
                        files.add(key)
                        if item.isfile() and '/sounds/' in key and key.endswith('.wav'):
                            header = payload.extractfile(item).read(44)
                            if len(header) < 44 or header[:4] != b'RIFF' or header[8:12] != b'WAVE':
                                raise ValueError('Neplatná přibalená nahrávka: ' + key)
                            wavs.add(key)
                        python_name = key.split('/tts/bin/')[-1]
                        is_python = '/tts/bin/' in key and (python_name == 'python3' or
                            python_name.startswith('python3.') and python_name[8:].isdigit())
                        if item.isfile() and (key.endswith('/bin/sipky') or is_python):
                            binaries[key] = elf_x64(payload.extractfile(item).read(64))
                break
            package.seek(offset + size + size % 2)
    expected = ['tts/worker.py', 'tts/speech_engine.py', 'tts/supertonic_backend.py', 'tts/bin/python3',
                'tts/lib/python3.12/os.py', 'tts/assets/voice_styles/F1.json', 'tts/assets/voice_styles/M1.json',
                'tts/SUPERTONIC-MODEL-LICENSE.txt', 'tts/SUPERTONIC-CODE-LICENSE.txt']
    expected += [f'tts/assets/onnx/{name}.onnx' for name in ('duration_predictor', 'text_encoder', 'vector_estimator', 'vocoder')]
    audio = [f'sounds/cs/{voice}/score/{n}.wav' for voice in ('eliska', 'martin') for n in range(181)]
    audio += [f'sounds/cs/{voice}/fun/{phrase}.wav' for voice in ('eliska', 'martin') for phrase in ('ambrozovina', 'gameon')]
    audio += ['sounds/game/bust.wav', 'sounds/game/miss.wav']
    for suffix in audio:
        if not any(name.endswith('/' + suffix) for name in wavs):
            raise ValueError('Chybí statická WAV nahrávka pro Rust: ' + suffix)
    if any(name.endswith(f'/sounds/cs/{voice}/fun/bust.wav') for name in files for voice in ('eliska', 'martin')):
        raise ValueError('V balíčku zůstala odstraněná hlasová hláška BUST.')
    if not package_name or not re.fullmatch(r'[a-z0-9][a-z0-9+.-]+', package_name):
        raise ValueError(f'Neplatný technický název Debian balíčku: {package_name!r}')
    missing = [suffix for suffix in expected if not any(name.endswith('/' + suffix) for name in files)]
    if missing:
        raise ValueError('V balíčku chybí: ' + ', '.join(missing))
    if not any(name.endswith('.desktop') for name in files):
        raise ValueError('Chybí zástupce do nabídky aplikací.')
    if not any(name.endswith('/bin/sipky') and valid for name, valid in binaries.items()) or not any(
            '/tts/bin/' in name and valid for name, valid in binaries.items()):
        raise ValueError('Aplikace nebo přibalený Python není linuxový ELF x86_64.')
    if not any('onnxruntime_pybind11_state' in name and name.endswith('.so') for name in files):
        raise ValueError('Chybí linuxový ONNX Runtime.')
    if any(name.endswith('.pyd') or name.endswith('/python.exe') for name in files):
        raise ValueError('Do linuxového balíčku se dostal Windows runtime.')
    return {'package': path.name, 'packageName': package_name, 'files': len(files), 'speech': 'complete', 'staticAudio': len(audio), 'architecture': 'ELF x86_64'}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('directory', type=Path)
    args = parser.parse_args()
    debs = list(args.directory.glob('*.deb'))
    images = list(args.directory.glob('*.AppImage'))
    if not debs or not images:
        raise SystemExit('Chybí .deb nebo .AppImage.')
    for path in debs:
        print(json.dumps(verify_deb(path), ensure_ascii=False))
    for path in images:
        with path.open('rb') as image:
            header = image.read(64)
        if not elf_x64(header) or header[8:11] != b'AI\x02':
            raise ValueError('Neplatný AppImage typu 2 x86_64.')
        print(json.dumps({'package': path.name, 'format': 'AppImage type 2 x86_64'}))


if __name__ == '__main__':
    main()
