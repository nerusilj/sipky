// Generování čísel a efektů stejným Supertonic enginem jako dynamická jména.
// node scripts/generate-voice.mjs [--voice eliska|martin] [--only score|fun] [--force]
// Volitelné cesty: --python <python.exe> --assets <supertonic-3/assets>
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MAX_VISIT_SCORE, scoreAnnouncement } from '../src/caller/czechNumbers.ts';
import { PHRASES } from '../src/caller/phrases.ts';
import { VOICES, isVoiceId } from '../src/caller/voices.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--force') { args.force = true; continue; }
  if (!['--voice', '--only', '--python', '--assets'].includes(arg) || !process.argv[i + 1]) throw Error(`Neznámý argument: ${arg}`);
  args[arg.slice(2)] = process.argv[++i];
}
if (args.voice && !isVoiceId(args.voice)) throw Error('Hlas musí být eliska nebo martin.');
if (args.only && !['score', 'fun'].includes(args.only)) throw Error('Použijte --only score nebo fun.');
let workspace = root;
while (!existsSync(join(workspace, '.tools', 'supertonic-3', 'assets')) && dirname(workspace) !== workspace) workspace = dirname(workspace);
const python = args.python || join(workspace, '.tools', 'supertonic-runtime', 'Scripts', 'python.exe');
const assets = args.assets || join(workspace, '.tools', 'supertonic-3', 'assets');
if (!existsSync(python) || !existsSync(assets)) throw Error('Chybí místní prostředí/model. Zadejte --python a --assets nebo spusťte přípravu dle docs/hlasatel.md.');
const items = (args.voice ? [args.voice] : Object.keys(VOICES)).flatMap(voice => [
  ...(args.only === 'fun' ? [] : Array.from({ length: MAX_VISIT_SCORE + 1 }, (_, n) => ({
    text: scoreAnnouncement(n), voice, seed: n + 501, output: `public/sounds/cs/${voice}/score/${n}.wav`,
  }))),
  ...(args.only === 'score' ? [] : Object.entries(PHRASES).map(([id, text]) => ({
    text, voice, seed: 501, output: `public/sounds/cs/${voice}/fun/${id}.wav`,
  }))),
]);
mkdirSync(join(root, '.test-tmp'), { recursive: true });
const manifest = join(root, '.test-tmp', 'voice-generation.json');
writeFileSync(manifest, JSON.stringify(items, null, 2));
const child = spawn(python, [join(root, 'scripts', 'generate-voice.py'), '--assets', assets, '--manifest', manifest, ...(args.force ? ['--force'] : [])], {
  stdio: 'inherit', windowsHide: true,
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
