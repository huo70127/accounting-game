import assert from 'node:assert/strict';
import {act,balances,migrate,question,report,start,validate} from './dist/demo/engine.js';
import {possibleCups,quantities,stockValue,consume} from './dist/demo/procurement.js';
import {suggestedStock,receiveStock} from './dist/demo/stock-policy.js';
import {quarantineRainStock,settleRainStock} from './dist/demo/rain.js';
import {runCourse,settleBook} from './management-test-helpers.mjs';

const rain=runCourse(0,{stopAt:s=>s.stage==='rainDay'}),before=balances(rain),journal=JSON.stringify(rain.tx);
assert.equal(rain.day,18);assert.equal(act(rain,'daily-trade'),false);assert.equal(act(rain,'buy-stock'),false);
for(let i=0;i<3;i++){
 const restored=migrate(JSON.parse(JSON.stringify(rain)));assert.deepEqual(restored,rain);
 const revision=rain.revision;assert.ok(act(rain,'rain-close'));assert.equal(act(rain,'rain-close',undefined,revision),false);
 assert.equal(JSON.stringify(rain.tx),journal,'closures post neither purchases nor invented sales/losses');
}
assert.equal(rain.day,21);assert.equal(rain.stage,'dailyOpen');assert.deepEqual(rain.course.rain.closedDays,[18,19,20]);
const held=rain.stockLots.filter(l=>l.quarantined),grams=held.reduce((n,l)=>n+l.quantity,0);
assert.ok(grams>0);assert.equal(grams*2%100,0);assert.equal(grams,rain.course.rain.beforeQuantity/2);
assert.equal(stockValue(rain),before.inventory,'suspect lemons remain in the book pending the physical stocktake');
const quantitiesBefore=quantities(rain),heldCopy=structuredClone(held),cups=possibleCups(rain);
assert.ok(consume(rain,Math.min(1,cups)));assert.deepEqual(rain.stockLots.filter(l=>l.quarantined),heldCopy,'suspect lemons never go into tea');
assert.equal(quantities(rain).lemon,quantitiesBefore.lemon-50);

// A real Sunday stocktake posts one integer loss, without paying cash twice.
const sunday=runCourse(0,{stopAt:s=>s.course.week===3&&s.stage==='weekRest'&&!s.pendingBook}),b=balances(sunday),expected=sunday.stockLots.filter(l=>l.quarantined).reduce((n,l)=>n+l.quantity*2,0),packaging=sunday.stockLots.filter(l=>['cup','straw'].includes(l.material));
assert.ok(act(sunday,'week-rest-close'));validate(sunday);const loss=sunday.tx.find(t=>t.id==='w3-rain-spoilage');
assert.equal(loss.loss,expected);assert.equal(loss.loss%100,0);assert.equal(balances(sunday).cash,b.cash);assert.equal(balances(sunday).inventory,b.inventory-expected);assert.deepEqual(sunday.stockLots.filter(l=>['cup','straw'].includes(l.material)),packaging);
assert.equal(report(sunday).assets,report(sunday).liabilities+report(sunday).equity);assert.deepEqual(migrate(JSON.parse(JSON.stringify(sunday))),sunday);
const after=JSON.stringify(sunday.tx);assert.equal(act(sunday,'week-rest-close'),false);assert.equal(JSON.stringify(sunday.tx),after);assert.equal(settleRainStock(sunday),null);
settleBook(sunday);assert.equal(question(sunday).concept,'存货报损');assert.ok(question(sunday).lead.includes(String(grams)));

// Ending the game before Sunday also writes off the isolated batch once.
const early=runCourse(0,{stopAt:s=>s.day===21&&s.stage==='dailyOpen'&&!s.pendingBook}),earlyCash=balances(early).cash;assert.ok(act(early,'liquidate'));assert.equal(balances(early).cash,earlyCash);assert.ok(!early.stockLots.some(l=>l.quarantined));assert.equal(early.tx.filter(t=>t.kind==='spoilage').length,1);

// Without any lemons remaining there is no fabricated percentage loss.
const empty=start(0);empty.course.week=3;empty.day=23;empty.course.rain.closedDays=[18,19,20];quarantineRainStock(empty);const zero=settleRainStock(empty);assert.equal(zero.cost,0);assert.equal(zero.quantity,0);assert.equal(stockValue(empty),0);empty.stage='course-spoil-close-3';empty.course.facts[empty.stage]=zero;assert.equal(question(empty).concept,'存货报损');assert.match(question(empty).explain,/没有确认损失/);
// Procurement itself has no hidden shrinkage, even when the player buys a lot.
const stock=start(1);stock.day=10;const cart=suggestedStock(stock,72);assert.equal(receiveStock(stock,cart).cost,0);assert.equal(possibleCups(stock),72);
console.log('Rain lesson: three saved/idempotent closures, no routine loss, isolated lemons excluded from tea, one whole-yuan Sunday write-off, unchanged packaging/cash, early liquidation and zero-loss edge passed.');
