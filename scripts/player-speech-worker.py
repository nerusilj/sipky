"""Lokální worker: jeden JSON požadavek/odpověď na řádek, WAV cache podle textu a hlasu."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import unicodedata
import wave

# Izolovaný přibalený Python (-I) jinak na Linuxu vynechá adresář workeru.
sys.path.insert(0, str(Path(__file__).resolve().parent))

VERSION = 'supertonic3-turn-v2-hraje'
VOICES = ('eliska', 'martin')


def normalize_name(name):
    if not isinstance(name, str):
        raise ValueError('Neplatné jméno hráče.')
    value = unicodedata.normalize('NFC', ' '.join(name.split()))
    if not value or len(value) > 24 or any(ord(c) < 32 for c in value):
        raise ValueError('Jméno musí mít 1 až 24 znaků.')
    return value


def cache_key(name, voice):
    if voice not in VOICES:
        raise ValueError('Neznámý hlas.')
    return hashlib.sha256(f'{VERSION}\0{voice}\0{normalize_name(name)}'.encode('utf-8')).hexdigest()


def valid_wav(path):
    try:
        with wave.open(str(path), 'rb') as wav:
            frames = wav.getnframes()
            return (wav.getnchannels() == 1 and wav.getsampwidth() == 2 and wav.getframerate() == 44100
                    and 0 < frames <= 15 * 44100 and len(wav.readframes(frames)) == frames * 2)
    except (OSError, EOFError, wave.Error):
        return False


class SpeechWorker:
    def __init__(self, models, cache, engine=None):
        self.models, self.cache = Path(models), Path(cache)
        self.engine = engine

    def generate(self, name, voice):
        name = normalize_name(name)
        key = cache_key(name, voice)
        path = self.cache / voice / f'{key}.wav'
        if valid_wav(path):
            return path
        # Oba hlasy sdílejí jediné načtení modelu. Cache funguje i bez importu ONNX.
        if self.engine is None:
            from speech_engine import SpeechEngine
            self.engine = SpeechEngine(self.models)
        path.parent.mkdir(parents=True, exist_ok=True)
        tmp = path.with_suffix('.wav.tmp')
        try:
            with wave.open(str(tmp), 'wb') as wav:
                # Jméno není instrukce pro výrazové tagy modelu.
                spoken_name = name.replace('<', ' ').replace('>', ' ')
                self.engine.synthesize_wav(f'Hraje {spoken_name}.', voice, wav, seed=int(key[:8], 16))
            if not valid_wav(tmp):
                raise ValueError('Hlášení jména se nepodařilo vytvořit.')
            os.replace(tmp, path)
        finally:
            tmp.unlink(missing_ok=True)
        return path


def main():
    sys.stdin.reconfigure(encoding='utf-8')
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    parser = argparse.ArgumentParser()
    parser.add_argument('--models', required=True)
    parser.add_argument('--cache', required=True)
    args = parser.parse_args()
    worker = SpeechWorker(args.models, args.cache)
    for line in sys.stdin:
        try:
            request = json.loads(line)
            path = worker.generate(request.get('name'), request.get('voice'))
            response = {'file': str(path)}
        except Exception as error:
            print(str(error), file=sys.stderr, flush=True)
            response = {'error': 'Hlášení jména se nepodařilo připravit.'}
        print(json.dumps(response, ensure_ascii=True), flush=True)


if __name__ == '__main__':
    main()
