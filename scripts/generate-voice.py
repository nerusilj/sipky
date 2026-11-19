"""Hromadná generace pevných hlášení stejným enginem jako u jmen hráčů."""
import argparse
import json
from pathlib import Path
import sys
import wave
from speech_engine import SpeechEngine, MODEL_REVISION, SPEED, STEPS

ROOT = Path(__file__).resolve().parent.parent


def complete(path):
    try:
        with wave.open(str(path), 'rb') as wav:
            count = wav.getnframes()
            return (wav.getnchannels() == 1 and wav.getsampwidth() == 2 and wav.getframerate() == 44100
                    and 0 < count <= 15 * 44100 and len(wav.readframes(count)) == count * 2)
    except (OSError, EOFError, wave.Error):
        return False


def main():
    sys.stdout.reconfigure(encoding='utf-8')
    parser = argparse.ArgumentParser()
    parser.add_argument('--assets', type=Path, required=True)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--force', action='store_true')
    args = parser.parse_args()
    items = json.loads(args.manifest.read_text(encoding='utf-8'))
    engine = SpeechEngine(args.assets)
    state_file = ROOT / 'public' / 'sounds' / 'generation.json'
    signature = {'revision': MODEL_REVISION, 'steps': STEPS, 'speed': SPEED}
    try:
        state = json.loads(state_file.read_text(encoding='utf-8'))
    except (OSError, ValueError):
        state = {}
    if state.get('engine') != signature:
        state = {'engine': signature, 'files': {}}
    count = 0
    for index, item in enumerate(items):
        path = (ROOT / item['output']).resolve()
        if not path.is_relative_to(ROOT / 'public' / 'sounds' / 'cs') or path.suffix != '.wav':
            raise ValueError('Neplatná cesta nahrávky.')
        if not args.force and state['files'].get(item['output']) == item and complete(path):
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix('.wav.tmp')
        try:
            with wave.open(str(tmp), 'wb') as wav:
                engine.synthesize_wav(item['text'], item['voice'], wav, seed=item['seed'], language=item.get('language', 'cs'))
            if not complete(tmp):
                raise ValueError('Nahrávka není kompletní.')
            tmp.replace(path)
        finally:
            tmp.unlink(missing_ok=True)
        state['files'][item['output']] = item
        state_file.write_text(json.dumps(state, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        count += 1
        if index % 10 == 0 or index == len(items) - 1:
            print(f'{index + 1}/{len(items)}: {item["voice"]}, {item["text"]}', flush=True)
    print(f'Hotovo: {len(items)} nahrávek ověřeno, {count} vytvořeno.', flush=True)


if __name__ == '__main__':
    main()
