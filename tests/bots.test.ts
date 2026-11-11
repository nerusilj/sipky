import test from 'node:test';
import assert from 'node:assert/strict';
import { availableGamePlayers, BOT_LEVELS, BOT_PLAYERS, botThrow, cricketBotTarget, dartAtPoint, x01BotTarget } from '../src/game/bots.ts';
import { addDart, commitVisit, createGame, deriveState, makeDart } from '../src/game/x01.ts';
import { addCricketDart, commitCricketVisit, createCricket, deriveCricket } from '../src/game/cricket.ts';
import { BotRunner } from '../src/game/botRunner.ts';
import type { BotTurn } from '../src/game/botRunner.ts';
import { parseLastSetup } from '../src/game/lastSetup.ts';
const T = (n: number) => makeDart(n, 3), S = (n: number) => makeDart(n, 1);
function random(seed = 501) { return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }; }
const human = { id: 'human', name: 'Radek', color: '#ffffff' };

test('bod na terči určuje skutečný single, double, triple, bull a netrefu', () => {
  for (const [x,y,number,multiplier] of [[0,103,20,3],[0,166,20,2],[0,134,20,1],[103,0,6,3],[0,-103,3,3],[0,0,25,2],[10,0,25,1],[0,180,0,0]]) {
    const dart = dartAtPoint(x,y); assert.equal(dart.number,number); assert.equal(dart.multiplier,multiplier); assert.equal(dart.score,number*multiplier);
    assert.deepEqual(dart.coords,{x:x/170,y:y/170}); assert.equal(dart.distance,Math.hypot(x,y)/170);
  }
});
test('tři obtížnosti mají měřitelně jinou přesnost; chyby jsou skutečné sousední segmenty', () => {
  const averages: number[] = [], triples: number[] = [];
  for (const level of BOT_LEVELS) {
    const rng=random(), darts=Array.from({length:6000},()=>botThrow(T(20),level.id,rng));
    averages.push(darts.reduce((sum,d)=>sum+d.score,0)/darts.length*3);
    triples.push(darts.filter(d=>d.number===20&&d.multiplier===3).length);
    assert.ok(darts.some(d=>d.number!==20));
    for(const d of darts) { assert.equal(d.score,d.number*d.multiplier); assert.ok(d.coords); assert.equal(dartAtPoint(d.coords!.x*170,d.coords!.y*170).score,d.score); }
  }
  assert.ok(averages[1]>averages[0]+10); assert.ok(averages[2]>averages[1]+10);
  assert.ok(triples[0]<triples[1]&&triples[1]<triples[2]);
  assert.throws(()=>botThrow(T(20),'unknown' as never));
});
test('X01 bot využívá dohazování a přesný bot dokončí celý zápas včetně doublů', () => {
  let game=createGame({startScore:301,doubleOut:true,legsToWin:2},[BOT_PLAYERS[2]]);
  for(let visit=0;visit<20&&deriveState(game).winner===undefined;visit++) {
    while(!deriveState(game).visitResult.closed) game=addDart(game,botThrow(x01BotTarget(deriveState(game)),'hard',()=>0));
    game=commitVisit(game);
  }
  const state=deriveState(game); assert.equal(state.winner,0); assert.equal(state.legsWon[0],2);
  for(const visit of state.history.filter(v=>v.checkout)) assert.equal(visit.darts.at(-1)?.multiplier,2);
  const straight={...createGame({startScore:101,doubleOut:false,legsToWin:1},[BOT_PLAYERS[0]]),current:[T(20),S(20)]};
  assert.equal(x01BotTarget(deriveState(straight)).score,21);
  const bull={...state,bullOff:{round:1,contenders:[0],throws:[],previous:[]}};
  assert.equal(x01BotTarget(bull).score,50);
});
test('Cricket bot zavírá čísla a pokud zaostává, boduje na zavřeném čísle', () => {
  let game=createCricket({legsToWin:1},[BOT_PLAYERS[2]]);
  for(let visit=0;visit<12&&deriveCricket(game).winner===undefined;visit++) {
    while(!deriveCricket(game).visitResult.closed) game=addCricketDart(game,botThrow(cricketBotTarget(deriveCricket(game)),'hard',()=>0));
    game=commitCricketVisit(game);
  }
  assert.equal(deriveCricket(game).winner,0);
  const state=deriveCricket(createCricket({legsToWin:1},[BOT_PLAYERS[0],human]));
  state.marks[0][0]=3; state.points[1]=60; assert.equal(cricketBotTarget(state).name,'T20');
  state.points[0]=60; assert.equal(cricketBotTarget(state).name,'T19');
  state.marks[0].fill(3); state.marks[0][6]=2; assert.equal(cricketBotTarget(state).score,50);
});
test('bot je dočasný účastník, uloží se jen výběr a nepřepíše evidované hráče', () => {
  const source=[human], available=availableGamePlayers(source);
  assert.equal(source.length,1); assert.equal(available.length,4); assert.equal(BOT_PLAYERS.length,3);
  assert.equal(new Set(available.map(p=>p.id)).size,4);
  const setup=parseLastSetup(JSON.stringify({playerIds:['human','bot:hard']}));
  assert.deepEqual(setup.playerIds,['human','bot:hard']);
  assert.equal(available.find(p=>p.id===setup.playerIds[1])?.bot,'hard');
});
class Clock {
  now=0; id=0; timers=new Map<number,{at:number;run:()=>void}>();
  after(delay:number,run:()=>void){const id=++this.id;this.timers.set(id,{at:this.now+delay,run});return()=>{this.timers.delete(id);};}
  tick(ms:number){const end=this.now+ms;for(;;){const item=[...this.timers.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!item)break;this.now=item[1].at;this.timers.delete(item[0]);item[1].run();}this.now=end;}
}
test('plánovač: jeden hod v čase, čeká na jméno, Zpět pozastaví a reset zruší staré úkony', async () => {
  const clock=new Clock(); let turn:BotTurn|undefined={id:'a',darts:0,closed:false};let hits=0,finishes=0;
  const runner=new BotRunner(()=>turn,()=>{hits++;turn={...turn!,darts:turn!.darts+1,closed:turn!.darts===2};runner.sync();},()=>{finishes++;turn=undefined;runner.sync();},clock);
  let ready!:()=>void;const announcement=new Promise<void>(r=>{ready=r;});
  runner.sync();runner.waitFor(announcement);clock.tick(1500);assert.equal(hits,0);ready();await Promise.resolve();
  clock.tick(899);assert.equal(hits,0);clock.tick(1);assert.equal(hits,1);
  runner.sync();runner.pause();clock.tick(3000);assert.equal(hits,1);runner.resume();clock.tick(2000);assert.equal(hits,3);clock.tick(150);assert.equal(finishes,1);
  turn={id:'b',darts:0,closed:false};runner.sync();runner.reset();turn=undefined;clock.tick(5000);assert.equal(hits,3);
});
test('plánovač: po chybě nebo dlouhém generování hlášky bot nezůstane zablokovaný', async () => {
  const clock=new Clock();const turn={id:'a',darts:0,closed:false};let hits=0;
  const runner=new BotRunner(()=>turn,()=>{hits++;},()=>{},clock);
  runner.waitFor(new Promise(()=>{}));clock.tick(4900);assert.equal(hits,1);runner.reset();
  runner.waitFor(Promise.reject(new Error('voice')));await Promise.resolve();clock.tick(900);assert.equal(hits,2);runner.reset();
});
