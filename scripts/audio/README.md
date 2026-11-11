# Zdroj zvuku chyby

Pokud chcete efekt připravit znovu, uložte původní nahrávku [Error / Mistake Sound Effect od Lesiakowera](https://pixabay.com/sound-effects/error-mistake-sound-effect-incorrect-answer-437420/) sem jako `error-source.mp3`. Pro běžné spuštění jsou upravené WAV součástí projektu.

Příprava: `scripts/preview-turn-sounds.py --regenerate`. Výstup: mono 44,1 kHz, 850 ms, plynulý náběh/doznění, RMS −27 dBFS, špička nejvýše −12 dBFS. Výsledek je v `public/sounds/game/bust.wav` a `miss.wav`. Vývojový dekodér `miniaudio` a NumPy jsou potřeba pouze pro přípravu, ne pro přehrávání v aplikaci.
