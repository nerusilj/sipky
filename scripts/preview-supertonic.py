"""Lokální srovnávací ukázky českých hlasů Supertonic 3. Žádná síťová volání."""
import argparse
import importlib.util
import json
from pathlib import Path
import sys
import time
import wave

import numpy as np
import onnxruntime as ort

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = next(parent for parent in (ROOT, *ROOT.parents) if (parent / ".tools" / "supertonic-3").is_dir())
RUNTIME = WORKSPACE / ".tools" / "supertonic-3"
OUT = ROOT / "outputs" / "hlas-supertonic"
PHRASES = [(26, "Dvacet šest."), (60, "Šedesát."), (100, "Sto!"),
           (140, "Sto čtyřicet!"), (180, "Sto osmdesát!")]


def save(path, samples, sample_rate):
    assert np.isfinite(samples).all(), "Neplatné vzorky zvuku."
    assert len(samples) >= sample_rate * .1, "Příliš krátká nahrávka."
    assert np.abs(samples).max() > .01, "Nahrávka neobsahuje řeč."
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes((np.clip(samples, -1, 1) * 32767).astype("<i2").tobytes())


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    ort.disable_telemetry_events()
    parser = argparse.ArgumentParser()
    parser.add_argument("--voices", nargs="+", choices=[f"{gender}{number}" for gender in "MF" for number in range(1, 6)], default=["M1", "M3", "M5"])
    args = parser.parse_args()
    spec = importlib.util.spec_from_file_location("supertonic_helper", RUNTIME / "helper.py")
    helper = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helper)
    onnx = RUNTIME / "assets" / "onnx"
    opts = ort.SessionOptions()
    opts.intra_op_num_threads = 2
    opts.inter_op_num_threads = 1
    started = time.monotonic()
    tts = helper.TextToSpeech(helper.load_cfgs(str(onnx)), helper.load_text_processor(str(onnx)),
                             *helper.load_onnx_all(str(onnx), opts, ["CPUExecutionProvider"]))
    print(f"Model načten za {time.monotonic() - started:.1f} s; CPU, {tts.sample_rate} Hz.", flush=True)
    OUT.mkdir(parents=True, exist_ok=True)
    report = {"engine": "Supertonic 3", "language": "cs", "local_only": True,
              "provenance": json.loads((RUNTIME / "provenance.json").read_text(encoding="utf-8")),
              "steps": 16, "speed": 1.05, "samples": []}
    for voice in args.voices:
        style = helper.load_voice_style([str(RUNTIME / "assets" / "voice_styles" / f"{voice}.json")])
        combined = []
        for number, text in PHRASES:
            np.random.seed(number + 501)
            started = time.monotonic()
            audio, duration = tts(text, "cs", style, total_step=16, speed=1.05)
            samples = audio[0, :round(float(duration[0]) * tts.sample_rate)]
            target = OUT / f"{voice}-{number}.wav"
            save(target, samples, tts.sample_rate)
            elapsed = time.monotonic() - started
            report["samples"].append({"voice": voice, "score": number, "text": text,
                                      "seconds": len(samples) / tts.sample_rate, "generation_seconds": elapsed,
                                      "file": target.name, "peak": float(np.abs(samples).max())})
            combined.extend([samples, np.zeros(round(tts.sample_rate * .55), dtype=np.float32)])
            print(f"{voice}, {number}: {len(samples) / tts.sample_rate:.2f} s zvuku za {elapsed:.2f} s.", flush=True)
        save(OUT / f"{voice}-ukazka.wav", np.concatenate(combined), tts.sample_rate)
    (OUT / "overeni.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Ukázky: {OUT}", flush=True)


if __name__ == "__main__":
    main()
