// Vygeneruje hlášení součtů kol 0–180 offline hlasem Piper do public/sounds/cs/<hlas>/score/<n>.wav
// a zábavné hlášky efektů do public/sounds/cs/<hlas>/fun/<id>.wav.
// Použití: node scripts/generate-voice.mjs --voice <jirka|kasandra> --piper <cesta k piper(.exe)> --model <cesta k .onnx> [--only score|fun]
// Piper je mírně náhodný: každý běh přepíše soubory jinými daty, proto přes --only generujte jen to, co se změnilo.
// Piper: https://github.com/rhasspy/piper (MIT). České hlasy: https://huggingface.co/rhasspy/piper-voices/tree/main/cs/cs_CZ
//   jirka    – cs_CZ-jirka-medium, data CC0
//   kasandra – cs_CZ-kasandra-medium, autor Ondřej Šimek, CC BY 4.0
// Nahrávky lze kdykoli nahradit vlastními se stejnými názvy souborů.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_VISIT_SCORE, scoreAnnouncement } from '../src/caller/czechNumbers.ts';
import { PHRASES } from '../src/caller/phrases.ts';
import { isVoiceId } from '../src/caller/voices.ts';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, arg, i, all) =>
  arg.startsWith('--') ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs, []));
if (!isVoiceId(args.voice) || !args.piper || !args.model || (args.only && !['score', 'fun'].includes(args.only))) {
  console.error('Použití: node scripts/generate-voice.mjs --voice <jirka|kasandra> --piper <piper> --model <model.onnx> [--only score|fun]');
  process.exit(2);
}

const voiceDir = resolve(dirname(fileURLToPath(import.meta.url)), `../public/sounds/cs/${args.voice}`);
const scoreDir = join(voiceDir, 'score'), funDir = join(voiceDir, 'fun');
mkdirSync(scoreDir, { recursive: true }); mkdirSync(funDir, { recursive: true });

// Jeden běh Piperu pro všechno: řádky JSON {text, output_file}, text v UTF-8.
const items = [
  ...(args.only === 'fun' ? [] : Array.from({ length: MAX_VISIT_SCORE + 1 }, (_, n) => ({ text: scoreAnnouncement(n), output_file: join(scoreDir, `${n}.wav`) }))),
  ...(args.only === 'score' ? [] : Object.entries(PHRASES).map(([id, text]) => ({ text, output_file: join(funDir, `${id}.wav`) }))),
];
const piper = spawn(args.piper, ['--model', args.model, '--json-input', '--sentence_silence', '0', '--quiet'], { stdio: ['pipe', 'ignore', 'inherit'] });
piper.stdin.end(Buffer.from(items.map(item => JSON.stringify(item)).join('\n') + '\n', 'utf8'));
piper.on('close', code => {
  if (code) { console.error(`Piper skončil s kódem ${code}.`); process.exit(code); }
  console.log(`Hotovo: ${items.length} nahrávek v ${voiceDir}`);
});
