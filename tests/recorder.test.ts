import test from 'node:test';
import assert from 'node:assert/strict';
import { Recorder, sessionName, MAX_PENDING_LINES } from '../src/inspector/recorder.ts';
import { captureMessage } from '../src/autodarts/envelope.ts';

function fakeDisk() {
  const writes: { session: string; lines: string }[] = [];
  let failing = false;
  const write = async (session: string, lines: string) => {
    if (failing) throw new Error('Disk je plný.');
    writes.push({ session, lines }); return `C:/zaznamy/${session}.jsonl`;
  };
  return { writes, write, fail: (value: boolean) => { failing = value; } };
}

test('název relace je místní časové razítko, které Rust přijme', () => {
  assert.equal(sessionName(new Date(2026, 9, 4, 8, 5, 3)), '2026-10-04_08-05-03');
  assert.match(sessionName(), /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/);
});

test('zprávy i meta události se zapíší v pořadí jako platné řádky JSONL', async () => {
  const disk = fakeDisk();
  const recorder = new Recorder(disk.write, '2026-10-04_18-30-00');
  recorder.meta('connect', { address: '127.0.0.1:3180' });
  recorder.message(captureMessage('{"type":"state","data":{"numThrows":1}}', 'in', 1));
  recorder.message(captureMessage('neplatný\nJSON', 'in', 2));
  assert.equal(recorder.get().pending, 3);
  await recorder.flush();
  assert.equal(disk.writes.length, 1);
  assert.equal(disk.writes[0].session, '2026-10-04_18-30-00');
  assert.ok(disk.writes[0].lines.endsWith('\n'));
  const lines = disk.writes[0].lines.trimEnd().split('\n').map(line => JSON.parse(line));
  assert.equal(lines[0].meta, 'connect');
  assert.equal(lines[0].address, '127.0.0.1:3180');
  assert.equal(lines[1].raw, '{"type":"state","data":{"numThrows":1}}');
  assert.equal(lines[2].raw, 'neplatný\nJSON');
  assert.deepEqual(recorder.get(), { enabled: true, session: '2026-10-04_18-30-00', path: 'C:/zaznamy/2026-10-04_18-30-00.jsonl', written: 3, pending: 0, lost: 0, error: undefined });
});

test('při chybě disku se nic neztratí a zápis se zopakuje ve stejném pořadí', async () => {
  const disk = fakeDisk();
  const recorder = new Recorder(disk.write, '2026-10-04_18-30-00');
  disk.fail(true);
  recorder.meta('a');
  await recorder.flush();
  assert.equal(recorder.get().error, 'Disk je plný.');
  assert.equal(recorder.get().pending, 1);
  recorder.meta('b');
  disk.fail(false);
  await recorder.flush();
  assert.deepEqual(disk.writes[0].lines.trimEnd().split('\n').map(line => JSON.parse(line).meta), ['a', 'b']);
  assert.equal(recorder.get().error, undefined);
  assert.equal(recorder.get().written, 2);
});

test('řádky přidané během zápisu počkají na další dávku', async () => {
  let release!: () => void;
  const batches: string[] = [];
  const recorder = new Recorder(async (_session, lines) => { batches.push(lines); await new Promise<void>(r => { release = r; }); return 'x'; }, '2026-10-04_18-30-00');
  recorder.meta('1');
  const first = recorder.flush();
  recorder.meta('2');
  await recorder.flush(); // souběžný zápis se nespustí
  assert.equal(batches.length, 1);
  release(); await first;
  const second = recorder.flush(); release(); await second;
  assert.deepEqual(batches.map(b => JSON.parse(b).meta), ['1', '2']);
  assert.equal(recorder.get().written, 2);
});

test('bez desktopové aplikace se nic nezapisuje ani nehromadí', async () => {
  const recorder = new Recorder(undefined);
  recorder.meta('connect');
  await recorder.flush();
  assert.equal(recorder.get().enabled, false);
  assert.equal(recorder.get().pending, 0);
});

test('plná fronta při dlouhé chybě disku přičítá ztracené řádky místo růstu paměti', async () => {
  const disk = fakeDisk();
  disk.fail(true);
  const recorder = new Recorder(disk.write, '2026-10-04_18-30-00');
  for (let i = 0; i < MAX_PENDING_LINES + 5; i++) recorder.meta('x');
  assert.equal(recorder.get().pending, MAX_PENDING_LINES);
  assert.equal(recorder.get().lost, 5);
});
