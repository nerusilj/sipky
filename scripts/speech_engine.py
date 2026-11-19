"""Jediný místní generátor čísel, efektů i jmen: Supertonic 3, CPU, čeština."""
from pathlib import Path
import numpy as np
import onnxruntime as ort
import supertonic_backend as backend

VOICES = {'eliska': 'F1', 'martin': 'M1'}
MODEL_REVISION = 'aafc6e32416a594460b32413efc49d7fe4ce6d46'
STEPS = 16
SPEED = 1.05


class SpeechEngine:
    def __init__(self, assets):
        assets = Path(assets)
        ort.disable_telemetry_events()
        options = ort.SessionOptions()
        options.intra_op_num_threads = 2
        options.inter_op_num_threads = 1
        onnx = str(assets / 'onnx')
        self.tts = backend.TextToSpeech(backend.load_cfgs(onnx), backend.load_text_processor(onnx),
                                      *backend.load_onnx_all(onnx, options, ['CPUExecutionProvider']))
        self.styles = {voice: backend.load_voice_style([str(assets / 'voice_styles' / f'{style}.json')])
                       for voice, style in VOICES.items()}

    def synthesize_wav(self, text, voice, wav, seed=501, language='cs'):
        if voice not in VOICES:
            raise ValueError('Neznámý hlas.')
        np.random.seed(seed)
        audio, duration = self.tts(text, language, self.styles[voice], total_step=STEPS, speed=SPEED)
        samples = audio[0, :round(float(duration[0]) * self.tts.sample_rate)]
        if (not np.isfinite(samples).all() or len(samples) < self.tts.sample_rate * .1
                or len(samples) > self.tts.sample_rate * 15 or np.abs(samples).max() < .001):
            raise ValueError('Generátor nevrátil platnou řeč.')
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(self.tts.sample_rate)
        wav.writeframes((np.clip(samples, -1, 1) * 32767).astype('<i2').tobytes())
