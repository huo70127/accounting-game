import assert from 'node:assert/strict';
import {act,validate,migrate,balances,report,question} from './dist/demo/engine.js';
import {stockValue,quote} from './dist/demo/procurement.js';
import {ordinaryDemand} from './dist/demo/daily.js';
import {createTradingRunner} from './dist/demo/trading-runner.js';
import {lessonStatus} from './dist/demo/lesson-topics.js';
import {prepared,drain,scheduler} from './trading-test-helpers.mjs';

function check(s){validate(s);const r=report(s);assert.equal(r.assets,r.liabilities+r.equity);assert.equal(stockValue(s),r.b.inventory);assert.equal(r.openingCash+r.operatingFlow+r.investingFlow+r.financingFlow,r.b.cash);assert.deepEqual(migrate(JSON.parse(JSON.stringify(s))),s);}
const s=prepared(),before=balances(s),cost=quote(s.course.cart).cost,sales=s.tx.filter(t=>t.kind==='sale').length;
assert.ok(act(s,'daily-trade'));check(s);assert.equal(s.stage,'dailyTrading');assert.equal(s.pendingBook,null);assert.equal(balances(s).cash,before.cash-cost);assert.equal(s.tx.filter(t=>t.kind==='sale').length,sales,'starting the day does not pre-credit sales');
const start=structuredClone(s),shift=s.course.daily.shift;assert.ok(shift.events.length>=1);
assert.ok(act(s,'advance-day',shift.events[0].minute-1));assert.equal(s.tx.filter(t=>t.kind==='sale').length,sales);const preSale=balances(s);
assert.ok(act(s,'advance-day',shift.events[0].minute));check(s);const amount=shift.events[0].quantity;assert.equal(balances(s).cash,preSale.cash+amount*500);assert.equal(balances(s).profit,preSale.profit+amount*300);assert.equal(balances(s).inventory,preSale.inventory-amount*200);assert.equal(shift.next,1);assert.equal(s.pendingBook,null,'no ledger interrupts running sales');
const midway=structuredClone(s);assert.ok(act(s,'pause-day'));const paused=JSON.stringify(s);assert.equal(act(s,'advance-day',s.course.minute+1),false);assert.equal(JSON.stringify(s),paused);assert.ok(act(s,'pause-day'));
while(s.stage==='dailyTrading'){assert.ok(act(s,'advance-day',Math.min(shift.to,s.course.minute+1)));check(s);}
const fast=structuredClone(start);assert.ok(act(fast,'skip-day'));check(fast);assert.deepEqual(fast.tx,s.tx);assert.deepEqual(fast.stockLots,s.stockLots);assert.deepEqual(report(fast),report(s));assert.equal(s.pendingBook.preview,true);assert.equal(s.bookSuspended,true);assert.equal(s.pendingBook.automatic,true);assert.ok(s.pendingBook.fields.every(f=>f.value!==''));
const journal=JSON.stringify(s.tx);drain(s);assert.equal(JSON.stringify(s.tx),journal);assert.equal(s.stage,'dailySold');assert.ok(act(s,'daily-close'));assert.equal(s.day,5,'the next day still waits for the player');

// Stable scheduling, modal/background pauses and stale timer cancellation.
let running=structuredClone(start),blocked=false,advances=0;const queue=scheduler(),runner=createTradingRunner({getState:()=>running,blocked:()=>blocked,advance:minute=>{advances++;assert.ok(act(running,'advance-day',minute));},schedule:queue.schedule,cancel:queue.cancel});
runner.sync();runner.sync();assert.equal(queue.jobs.size,1);blocked=true;for(let i=0;i<5;i++)queue.tick();assert.equal(advances,0);blocked=false;queue.tick();assert.ok(advances>0);const stale=queue.jobs.values().next().value;runner.stop();const stopped=JSON.stringify(running);stale();assert.equal(JSON.stringify(running),stopped);assert.equal(queue.jobs.size,0);
const timed=structuredClone(start),timedQueue=scheduler(),timedRunner=createTradingRunner({getState:()=>timed,blocked:()=>false,advance:minute=>act(timed,'advance-day',minute),schedule:timedQueue.schedule,cancel:timedQueue.cancel});timedRunner.sync();let frames=0;while(timedQueue.jobs.size){timedQueue.tick();frames++;}assert.equal(frames*100,8000,'ordinary trading takes eight foreground seconds');assert.ok(timed.course.daily.shift.events.length>=4&&timed.course.daily.shift.events.length<=8);assert.ok(timed.course.daily.shift.events.every(v=>v.quantity<=2));assert.deepEqual(timed.tx,fast.tx);
const reduced=structuredClone(start),calmQueue=scheduler(),calm=createTradingRunner({getState:()=>reduced,blocked:()=>false,reduced:()=>true,advance:minute=>act(reduced,'advance-day',minute),schedule:calmQueue.schedule,cancel:calmQueue.cancel});calm.sync();calmQueue.tick();assert.equal(calmQueue.jobs.size,0);assert.deepEqual(reduced.tx,fast.tx);assert.equal(reduced.pendingBook.preview,true);

// Restoring halfway cannot replay already delivered cups or mint extra cash.
const resumed=migrate(midway),ids=resumed.tx.map(t=>t.id);assert.ok(act(resumed,'skip-day'));assert.deepEqual(resumed.tx,s.tx);assert.equal(new Set(resumed.tx.map(t=>t.id)).size,resumed.tx.length);assert.deepEqual(resumed.tx.slice(0,ids.length).map(t=>t.id),ids);
const interrupted=structuredClone(midway);assert.ok(act(interrupted,'liquidate'));const settlementCount=interrupted.tx.length;assert.equal(act(interrupted,'advance-day',shift.to),false);assert.equal(interrupted.tx.length,settlementCount);

// An empty street advances its clock but never shows fictitious takings.
const quietSeed=Array.from({length:1000},(_,seed)=>seed).find(seed=>ordinaryDemand({seed,day:4,course:{upgrade:false}})===0),quiet=prepared(quietSeed),quietBefore=balances(quiet);assert.ok(act(quiet,'daily-trade'));assert.equal(quiet.course.daily.shift.events.length,0);const quietCash=balances(quiet).cash,quietProfit=balances(quiet).profit;assert.ok(act(quiet,'skip-day'));assert.equal(balances(quiet).cash,quietCash);assert.equal(balances(quiet).profit,quietProfit);assert.equal(quiet.course.minute,1080);check(quiet);

// Up to six real customer groups; preparation time and their patience constrain sales.
const counts=new Set(),quantities=new Set();
for(let seed=0;seed<100;seed++){
 const sample=prepared(seed);assert.ok(act(sample,'daily-trade'));const x=sample.course.daily.shift,total=x.events.reduce((n,e)=>n+e.quantity,0);counts.add(x.events.length);quantities.add(total);
 assert.equal(total,Math.min(ordinaryDemand(sample)===1?1:ordinaryDemand(sample)/2,12));assert.ok(x.events.length<=8);if(total>=8)assert.ok(x.events.length>=4);if(total===1)assert.equal(x.events.length,1);if(total===0)assert.equal(x.events.length,0);
 const replay=prepared(seed);act(replay,'daily-trade');assert.deepEqual(replay.course.daily.shift.events,x.events);
}
assert.ok([...counts].some(n=>n>=4&&n<=6));assert.ok([...counts].every(n=>n<=6));assert.ok(quantities.has(1),'quiet days can sell just one cup');
// Previously saved 1–2-cup guest plans survive migration without regrouping.
const old=structuredClone(start),oldShift=old.course.daily.shift,total=oldShift.events.reduce((n,e)=>n+e.quantity,0);oldShift.events=Array.from({length:total},(_,i)=>({quantity:1,minute:Math.round(oldShift.from+(oldShift.to-oldShift.from)*(i+1)/(total+1))}));
const oldPlan=structuredClone(oldShift.events),continued=migrate(old);assert.deepEqual(continued.course.daily.shift.events,oldPlan);act(continued,'skip-day');assert.deepEqual(balances(continued),balances(fast));

// Context titles do not create extra accounting vocabulary.
const bulk=prepared();bulk.stage='course-bulk';bulk.course.facts['course-bulk']={quantity:4,revenue:1600,cost:800,cash:1600,receivable:0};const gross=question(bulk);assert.equal(gross.concept,'毛利');assert.deepEqual(lessonStatus(bulk,gross,question).newKeys,[]);assert.deepEqual(bulk.lessonTopics.margin.newKeys,['gross']);
bulk.course.facts['course-payable']={cost:2400,paid:0,credit:2400};bulk.lessonsSeen['course-payable']=true;bulk.stage='course-payment';bulk.course.facts['course-payment']={amount:2400};const payable=question(bulk);assert.equal(payable.concept,'应付账款');assert.deepEqual(lessonStatus(bulk,payable,question).newKeys,[]);
bulk.course.facts['course-receivable']={quantity:4,revenue:2000,cash:0,receivable:2000};bulk.lessonsSeen['course-receivable']=true;bulk.stage='course-collection';bulk.course.facts['course-collection']={collected:0,badDebt:800,delayed:0};const badDebt=question(bulk);assert.ok(badDebt.termKeys.includes('badDebt'));assert.deepEqual(lessonStatus(bulk,badDebt,question).newKeys,['badDebt']);
const receipt=prepared(0,'walkin');const cashBefore=balances(receipt).cash;assert.ok(act(receipt,'serve-cash'));assert.equal(receipt.pendingBook.preview,true);assert.equal(receipt.bookSuspended,true);const unchanged=JSON.stringify(receipt.tx);assert.ok(act(receipt,'receipt-review'));assert.equal(receipt.pendingBook.preview,false);assert.equal(JSON.stringify(receipt.tx),unchanged);assert.equal(balances(receipt).cash,cashBefore+1000);
console.log('Trading: cash and stock change only at actual guest beats; deterministic fast-forward, save/restore, no-sale days, pauses, stale callbacks, interrupted liquidation and reduced motion passed. Receipts precede reports, canonical terms distinguish new concepts from review.');
