// Vygeneruje hlášení součtů kol 0–180 offline hlasem Piper do public/sounds/cs/<hlas>/score/<n>.wav.
// Použití: node scripts/generate-voice.mjs --voice <jirka|kasandra> --piper <cesta k piper(.exe)> --model <cesta k .onnx>
// Piper: https://github.com/rhasspy/piper (MIT). České hlasy: https://huggingface.co/rhasspy/piper-voices/tree/main/cs/cs_CZ
//   jirka    – cs_CZ-jirka-medium, data CC0
//   kasandra – cs_CZ-kasandra-medium, autor Ondřej Šimek, CC BY 4.0
// Nahrávky lze kdykoli nahradit vlastními se stejnými názvy souborů.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_VISIT_SCORE, scoreAnnouncement } from '../src/caller/czechNumbers.ts';
import { isVoiceId } from '../src/caller/voices.ts';

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, arg, i, all) =>
  arg.startsWith('--') ? [...pairs, [arg.slice(2), all[i + 1]]] : pairs, []));
if (!isVoiceId(args.voice) || !args.piper || !args.model) {
  console.error('Použití: node scripts/generate-voice.mjs --voice <jirka|kasandra> --piper <piper> --model <model.onnx>');
  process.exit(2);
}

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), `../public/sounds/cs/${args.voice}/score`);
mkdirSync(outDir, { recursive: true });

// Jeden běh Piperu pro všechna čísla: řádky JSON {text, output_file}, text v UTF-8.
const lines = Array.from({ length: MAX_VISIT_SCORE + 1 }, (_, n) =>
  JSON.stringify({ text: scoreAnnouncement(n), output_file: join(outDir, `${n}.wav`) })).join('\n') + '\n';
const piper = spawn(args.piper, ['--model', args.model, '--json-input', '--sentence_silence', '0', '--quiet'], { stdio: ['pipe', 'ignore', 'inherit'] });
piper.stdin.end(Buffer.from(lines, 'utf8'));
piper.on('close', code => {
  if (code) { console.error(`Piper skončil s kódem ${code}.`); process.exit(code); }
  console.log(`Hotovo: ${MAX_VISIT_SCORE + 1} nahrávek v ${outDir}`);
});
