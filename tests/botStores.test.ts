import test from 'node:test';
import assert from 'node:assert/strict';
import { setImmediate as turn } from 'node:timers/promises';
import * as x01 from '../src/game/gameStore.ts';
import * as cricket from '../src/game/cricketStore.ts';
import { BOT_PLAYERS } from '../src/game/bots.ts';
import { setSoundEnabled } from '../src/settings.ts';
import { makeDart } from '../src/game/x01.ts';
import { caller } from '../src/caller/caller.ts';
const human={id:'human',name:'Radek',color:'#ffffff'};
const frame=(number=0)=>({type:'state',data:{connected:true,running:true,numThrows:number?1:0,throws:number?[{segment:makeDart(number,1)}]:[]}});
const modes=[
 {name:'X01',start:()=>x01.startGame({startScore:301,doubleOut:true,legsToWin:1},[BOT_PLAYERS[2],human]),end:x01.endGame,get:x01.getGameSnapshot,hit:x01.enterDart,replace:x01.replaceCurrentDart,next:x01.nextPlayer,undo:x01.undoDart,feed:x01.feedGameFromBoard},
 {name:'Cricket',start:()=>cricket.startCricket({legsToWin:1},[BOT_PLAYERS[2],human]),end:cricket.endCricket,get:cricket.getCricketSnapshot,hit:cricket.enterCricketDart,replace:cricket.replaceCricketDart,next:cricket.nextCricketPlayer,undo:cricket.undoCricketDart,feed:cricket.feedCricketFromBoard},
];
for(const mode of modes) {
 test(`${mode.name}: bot hází automaticky, odfiltruje ruční i fyzický vstup a předá tah člověku`,async t=>{
  const random=Math.random;Math.random=()=>0;setSoundEnabled(false);t.mock.timers.enable({apis:['setTimeout']});mode.end();mode.feed(frame());mode.start();
  const tick=async(ms:number)=>{t.mock.timers.tick(ms);await turn();};
  try {
   await turn();mode.hit(makeDart(1,1));assert.equal(mode.get().game?.current.length,0);
   mode.feed(frame(1));await tick(900);assert.equal(mode.get().game?.current.length,1);
   assert.equal(mode.get().game?.current[0].score,60);mode.replace(0,makeDart(1,1));assert.equal(mode.get().game?.current[0].score,60);
   await tick(1000);assert.equal(mode.get().game?.current.length,2);await tick(1000);assert.equal(mode.get().game?.current.length,3);
   for(let i=0;i<8;i++)await tick(500);
   assert.equal(mode.get().state?.current,1);assert.equal(mode.get().state?.history.length,1);assert.equal(mode.get().game?.current.length,0);
   mode.feed(frame(20));assert.equal(mode.get().game?.current.length,0); // starý fyzický hod z doby bota
   mode.feed(frame());mode.feed(frame(19));assert.equal(mode.get().game?.current[0].number,19);
   mode.feed(frame());for(let i=0;i<5;i++)await tick(500);
   assert.equal(mode.get().state?.current,0);assert.equal(mode.get().state?.history.length,2);
  }finally{mode.end();t.mock.timers.reset();Math.random=random;caller.stop();}
 });
 test(`${mode.name}: Zpět zastaví bota, Další ho obnoví a ukončení zruší všechny čekající hody`,async t=>{
  const random=Math.random;Math.random=()=>0;setSoundEnabled(false);t.mock.timers.enable({apis:['setTimeout']});mode.end();mode.feed(frame());mode.start();
  const tick=async(ms:number)=>{t.mock.timers.tick(ms);await turn();};
  try {
   await turn();await tick(900);assert.equal(mode.get().game?.current.length,1);
   mode.undo();assert.equal(mode.get().botPaused,true);assert.equal(mode.get().game?.current.length,0);
   await tick(5000);assert.equal(mode.get().game?.current.length,0);
   mode.next();await tick(900);assert.equal(mode.get().game?.current.length,1);
   mode.end();await tick(10000);assert.equal(mode.get().game,undefined);
  }finally{mode.end();t.mock.timers.reset();Math.random=random;caller.stop();}
 });
}
test('X01 bot respektuje Double Out, vítězství i rozhoz po limitu kol',async t=>{
 const random=Math.random;Math.random=()=>0;setSoundEnabled(false);t.mock.timers.enable({apis:['setTimeout']});x01.endGame();x01.feedGameFromBoard(frame());
 const tick=async()=>{t.mock.timers.tick(1000);await turn();};
 try {
  x01.startGame({startScore:101,doubleOut:true,legsToWin:1},[BOT_PLAYERS[2]]);await turn();
  for(let i=0;i<20&&x01.getGameSnapshot().state?.winner===undefined;i++)await tick();
  assert.equal(x01.getGameSnapshot().state?.winner,0);assert.equal(x01.getGameSnapshot().state?.history.at(-1)?.darts.at(-1)?.multiplier,2);
  x01.endGame();x01.startGame({startScore:501,doubleOut:true,legsToWin:1,maxRounds:1},[BOT_PLAYERS[2],human]);await turn();
  for(let i=0;i<12&&x01.getGameSnapshot().state?.current===0;i++)await tick();
  x01.nextPlayer();for(let i=0;i<15;i++)await tick();
  const state=x01.getGameSnapshot().state!;assert.ok(state.bullOff);assert.equal(state.current,1);assert.equal(state.bullOff.throws.length,1);assert.equal(state.bullOff.throws[0].dart.score,50);
 }finally{x01.endGame();t.mock.timers.reset();Math.random=random;caller.stop();}
});
test('Cricket bot dokončí leg a po vítězství už neháže',async t=>{
 const random=Math.random;Math.random=()=>0;setSoundEnabled(false);t.mock.timers.enable({apis:['setTimeout']});cricket.endCricket();cricket.feedCricketFromBoard(frame());
 try {
  cricket.startCricket({legsToWin:1},[BOT_PLAYERS[2]]);await turn();
  for(let i=0;i<40&&cricket.getCricketSnapshot().state?.winner===undefined;i++){t.mock.timers.tick(1000);await turn();}
  const state=cricket.getCricketSnapshot().state!;assert.equal(state.winner,0);assert.equal(state.legsWon[0],1);
  const game=cricket.getCricketSnapshot().game;t.mock.timers.tick(10000);await turn();assert.equal(cricket.getCricketSnapshot().game,game);
 }finally{cricket.endCricket();t.mock.timers.reset();Math.random=random;caller.stop();}
});
