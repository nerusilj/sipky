import test from 'node:test';
import assert from 'node:assert/strict';
import { VisitCompletion } from '../src/game/visitCompletion.ts';
import type { CompletionClock } from '../src/game/visitCompletion.ts';

class Clock implements CompletionClock {
  time = 0;
  timers = new Set<{ at: number; run: () => void }>();
  now = () => this.time;
  after(delay: number, run: () => void) {
    const task = { at: this.time + delay, run }; this.timers.add(task);
    return () => { this.timers.delete(task); };
  }
  tick(ms: number) {
    const end = this.time + ms;
    for (;;) {
      const task = [...this.timers].sort((a, b) => a.at - b.at)[0];
      if (!task || task.at > end) break;
      this.time = task.at; this.timers.delete(task); task.run();
    }
    this.time = end;
  }
}
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

test('nejdřív vykreslit šipku, pak hlásit, přepnout až po skončení hlasu', async () => {
  const clock = new Clock(), completion = new VisitCompletion(clock), events: string[] = [];
  let endVoice!: () => void;
  completion.run(() => { events.push('voice'); return new Promise(resolve => { endVoice = resolve; }); },
    () => events.push('switch'), stage => events.push(stage));
  clock.tick(449); await flush(); assert.deepEqual(events, ['showing']);
  clock.tick(1); await flush(); assert.deepEqual(events, ['showing', 'announcing', 'voice']);
  clock.tick(3000); assert.equal(completion.active, true);
  endVoice(); await flush(); clock.tick(199); assert.equal(events.includes('switch'), false);
  clock.tick(1); assert.equal(events.at(-1), 'switch'); assert.equal(completion.active, false);
});

test('bez zvuku zůstane dokončené kolo vidět alespoň sekundu', async () => {
  const clock = new Clock(), completion = new VisitCompletion(clock); let switched = false;
  completion.run(() => Promise.resolve(), () => { switched = true; }, () => {});
  clock.tick(450); await flush(); clock.tick(549); assert.equal(switched, false);
  clock.tick(1); assert.equal(switched, true);
});

test('Zpět zruší hlášení před startem i přepnutí během přehrávání', async () => {
  for (const duringVoice of [false, true]) {
    const clock = new Clock(), completion = new VisitCompletion(clock); let switches = 0, announcements = 0;
    let endVoice!: () => void;
    completion.run(() => { announcements++; return new Promise(resolve => { endVoice = resolve; }); }, () => { switches++; }, () => {});
    if (duringVoice) { clock.tick(450); await flush(); }
    completion.cancel(); if (duringVoice) endVoice(); await flush(); clock.tick(10000);
    assert.equal(switches, 0); assert.equal(announcements, duringVoice ? 1 : 0);
  }
});

test('chyba zvuku nezablokuje hru', async () => {
  const clock = new Clock(), completion = new VisitCompletion(clock); let switched = false;
  completion.run(() => Promise.reject(new Error('audio')), () => { switched = true; }, () => {});
  clock.tick(450); await flush(); clock.tick(550); assert.equal(switched, true);
});
