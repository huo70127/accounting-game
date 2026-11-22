import {resaleQuote} from './dist/demo/summer-rules.js';
import assert from 'node:assert/strict';
import {start,act,balances,report,scores,settlementSteps,migrate} from './dist/demo/engine.js';
import {MATERIALS,quote,stockValue,possibleCups} from './dist/demo/procurement.js';
import {stockRisk,suggestedStock,receiveStock,forecastCups,rawCost} from './dist/demo/stock-policy.js';
import {businessDay,isRestDay,calendarLabel} from './dist/demo/calendar.js';
import {radar} from './dist/demo/art.js';
import {runCourse,settleBook} from './management-test-helpers.mjs';
import {readFileSync} from 'node:fs';
import {bookContext} from './dist/demo/book-context.js';

for(const upgrade of [false,true]){
 const s=runCourse(upgrade?0:22,{upgrade,payment:upgrade?'credit':'cash'}),r=report(s),days=s.course.daily.records;
 assert.equal(s.stage,'courseSummary');assert.equal(s.day,30);assert.equal(days.length,28);assert.equal(days.filter(v=>!v.rest).length,24);assert.deepEqual(days.filter(v=>v.rest).map(v=>v.day),[9,16,23,30]);
 for(let week=0;week<4;week++){const period=days.filter(v=>v.day>=3+week*7&&v.day<=9+week*7);assert.equal(period.filter(v=>!v.rest).length,6);assert.equal(period.filter(v=>v.rest).length,1);}
 assert.ok(s.tx.filter(t=>t.kind==='sale').every(t=>!isRestDay(s,t.storyAt.day)),'no tea is made or sold on rest days');assert.equal(r.assets,r.liabilities+r.equity);assert.equal(days.reduce((n,v)=>n+v.profitChange,0),r.profit);assert.equal(days.reduce((n,v)=>n+v.cashChange,0),r.b.cash-400);
 assert.ok(days.filter(v=>!v.rest&&!v.weatherClosed&&v.quantity===0).length<=2,'normal recommended play rarely has an empty trading day');
 if(upgrade){assert.ok(days.some(v=>v.quantity===24));assert.equal(s.course.loan.paid,true);}
 const losses=s.tx.filter(t=>t.kind==='spoilage');assert.equal(losses.length,1);assert.equal(losses[0].id,'w3-rain-spoilage');assert.equal(losses[0].loss%100,0);assert.deepEqual(days.filter(v=>v.weatherClosed).map(v=>v.day),[18,19,20]);assert.ok(!s.tx.some(t=>t.rawHandling));assert.equal(s.course.rain.settled,true);
}
const rest=runCourse(0,{stopAt:s=>s.stage==='weekRest'&&!s.pendingBook});assert.equal(businessDay(rest),7);assert.match(calendarLabel(rest),/周日/);const restBefore=JSON.stringify(rest);assert.equal(act(rest,'daily-trade'),false);assert.equal(JSON.stringify(rest),restBefore);assert.ok(act(rest,'week-rest-close'));assert.equal(rest.course.summaries.length,1);

for(let seed=0;seed<100;seed++){
 const s=start(seed);s.day=17;s.course.week=3;s.course.upgrade=true;s.stockLots=[];
 const cart=suggestedStock(s,24),expected=forecastCups(s,cart),loss=receiveStock(s,cart);
 assert.equal(possibleCups(s),expected);assert.equal(expected,24);assert.equal(loss.cost,0);assert.equal(stockRisk(s,cart).rate,0);assert.equal(stockValue(s),quote(cart).cost);assert.equal(s.stockLots.find(v=>v.material==='cup').quantity,24);assert.equal(s.stockLots.find(v=>v.material==='straw').quantity,24);
}

// Missing experience is displayed as 100; the chart always connects all six points.
const empty=start(0),items=scores(empty);assert.equal(items.length,6);assert.ok(items.every(v=>v.score===100&&v.unexperienced));const svg=radar(items);assert.equal((svg.match(/class="radar-point"/g)||[]).length,6);assert.match(svg,/class="radar-score" points="(?:[^" ]+ ){5}[^" ]+"/);

// Shared liquidation definitions govern both the prompt and the actual account changes.
const first=runCourse(0,{stopAt:s=>s.stage==='daySummary'&&!s.pendingBook});assert.deepEqual(settlementSteps(first).map(v=>v.kind),['inventory','equipment','loan']);
for(const initial of [first,migrate(JSON.parse(readFileSync('fixtures/course-v27.json','utf8'))[3])]){
 const a=structuredClone(initial),b=structuredClone(initial);act(a,'liquidate');act(b,'liquidate');if(a.pendingBook)settleBook(a);if(b.pendingBook)settleBook(b);
 while(a.stage==='liquidation'){const current=settlementSteps(a)[a.liquidation.step],before=balances(a),n=a.tx.length;assert.ok(act(a,'settle',a.liquidation.step));if(current.kind==='equipment'){assert.equal(balances(a).equipment,0);assert.equal(balances(a).loan,before.loan);const cash=resaleQuote({...a,tx:a.tx.slice(0,n)},'equipment'),context=bookContext(a),journal=JSON.stringify(a);assert.ok(context.includes(`设备账面 ${before.equipment/100} 元，卖出收款 ${cash/100} 元`));assert.ok(context.includes(`处置损失 ${(before.equipment-cash)/100} 元`));bookContext(a);assert.equal(JSON.stringify(a),journal,'reading entry facts never changes the ledger or draft');}if(current.kind==='loan')assert.equal(balances(a).equipment,before.equipment);if(current.kind==='interest')assert.equal(balances(a).profit,before.profit);if(a.pendingBook)settleBook(a);if(current.kind==='inventory'&&!before.inventory)assert.equal(a.tx.length,n,'empty steps still advance without posting');}
 act(b,'quick');if(b.pendingBook)settleBook(b);assert.deepEqual(a.tx,b.tx);assert.deepEqual(balances(a),balances(b));
}
console.log('Management: weekly stocking without routine loss, three rainy closures in week 3, one integer lemon write-off, 24-cup yield, complete radar and consistent liquidation passed.');
