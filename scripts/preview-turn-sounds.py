"""Tlumený zvuk chyby z dodané MP3; miniaudio je potřeba jen při --regenerate."""
import argparse
from pathlib import Path
import wave
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'outputs' / 'navrh-zvuky'
RATE = 44100

def write(path, samples):
    with wave.open(str(path), 'wb') as wav:
        wav.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        wav.writeframes((np.clip(samples, -1, 1) * 32767).astype('<i2').tobytes())

def read(path):
    with wave.open(str(path), 'rb') as wav:
        assert (wav.getnchannels(), wav.getsampwidth(), wav.getframerate()) == (1, 2, RATE)
        return np.frombuffer(wav.readframes(wav.getnframes()), dtype='<i2').astype(np.float32) / 32768

parser = argparse.ArgumentParser()
parser.add_argument('--regenerate', action='store_true')
args = parser.parse_args()
OUT.mkdir(parents=True, exist_ok=True)
game_sounds = ROOT / 'public' / 'sounds' / 'game'
if args.regenerate:
    import miniaudio
    source = ROOT / 'scripts' / 'audio' / 'error-source.mp3'
    busted = np.asarray(miniaudio.decode_file(str(source), output_format=miniaudio.SampleFormat.FLOAT32,
                                            nchannels=1, sample_rate=RATE).samples)[:round(.85 * RATE)].copy()
    busted[:220] *= np.linspace(0, 1, 220)
    busted[-round(.04 * RATE):] *= np.linspace(1, 0, round(.04 * RATE))
    busted *= min(10 ** (-27 / 20) / float(np.sqrt(np.mean(busted ** 2))), .25 / float(np.max(np.abs(busted))))
    write(game_sounds / 'bust.wav', busted)
    write(game_sounds / 'miss.wav', busted)
else:
    busted = read(game_sounds / 'bust.wav')
write(OUT / 'prehoz.wav', busted)
print('Pripraveny tlumeny zvuk prehozu bez mluvene hlasky.')
