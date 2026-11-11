import importlib.util
import hashlib
from pathlib import Path
import tempfile
import unittest
import wave

spec = importlib.util.spec_from_file_location('worker', Path(__file__).resolve().parents[1] / 'scripts' / 'player-speech-worker.py')
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class Engine:
    def __init__(self):
        self.calls = []
    def synthesize_wav(self, text, voice, wav, seed):
        self.calls.append((text, voice))
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(44100)
        wav.writeframes(b'\0\0' * 44100)


class SpeechTests(unittest.TestCase):
    def test_changes_cache_and_corrupt_file(self):
        root = Path(__file__).resolve().parents[1]
        temporary = root / '.test-tmp'
        temporary.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=temporary) as tmp:
            self.assertTrue(Path(tmp).resolve().is_relative_to(root))
            engine = Engine()
            speech = worker.SpeechWorker(tmp, tmp, engine=engine)
            path = speech.generate(' Radek ', 'eliska')
            modified = path.stat().st_mtime_ns
            self.assertEqual(speech.generate('Radek', 'eliska'), path)
            self.assertEqual(path.stat().st_mtime_ns, modified)
            self.assertNotEqual(speech.generate('Pepa', 'eliska'), path)
            self.assertNotEqual(speech.generate('Radek', 'martin'), path)
            self.assertEqual(engine.calls, [('Hraje Radek.', 'eliska'), ('Hraje Pepa.', 'eliska'), ('Hraje Radek.', 'martin')])
            # Již hotové jméno nepotřebuje načíst model a nevytvoří novou nahrávku.
            cached_worker = worker.SpeechWorker(tmp, tmp)
            self.assertEqual(cached_worker.generate('Radek', 'eliska'), path)
            self.assertIsNone(cached_worker.engine)
            path.write_bytes(b'broken')
            speech.generate('Radek', 'eliska')
            self.assertTrue(worker.valid_wav(path))
            self.assertEqual(len(engine.calls), 4)

    def test_old_turn_recording_is_not_reused(self):
        root = Path(__file__).resolve().parents[1] / '.test-tmp'
        root.mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(dir=root) as tmp:
            engine = Engine()
            speech = worker.SpeechWorker(tmp, tmp, engine=engine)
            for voice in worker.VOICES:
                old_key = hashlib.sha256(f'supertonic3-turn-v1\0{voice}\0Radek'.encode('utf-8')).hexdigest()
                old_path = Path(tmp) / voice / f'{old_key}.wav'
                old_path.parent.mkdir(parents=True, exist_ok=True)
                with wave.open(str(old_path), 'wb') as wav:
                    Engine().synthesize_wav('Na řadě je Radek.', voice, wav, seed=501)
                self.assertTrue(worker.valid_wav(old_path))
                new_path = speech.generate('Radek', voice)
                self.assertNotEqual(new_path, old_path)
                self.assertTrue(worker.valid_wav(new_path))
            self.assertEqual(engine.calls, [('Hraje Radek.', 'eliska'), ('Hraje Radek.', 'martin')])

    def test_validation_and_file_names(self):
        for bad in ['', ' ', 'a' * 25, 'jméno\0', None]:
            with self.assertRaises(ValueError):
                worker.normalize_name(bad)
        with self.assertRaises(ValueError):
            worker.cache_key('Radek', '../bad')
        self.assertRegex(worker.cache_key('../hráč', 'eliska'), r'^[0-9a-f]{64}$')
        self.assertEqual(worker.cache_key('Ja\u0301', 'eliska'), worker.cache_key('Já', 'eliska'))


if __name__ == '__main__':
    unittest.main()
