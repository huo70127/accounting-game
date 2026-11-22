import assert from 'node:assert/strict';
import {start as engineStart,act,question,validate,migrate,balances,report,liquidationSteps,statementRows,parseAmount} from './dist/demo/engine.js';
const start=seed=>engineStart(seed,4);
import {stockValue,possibleCups,quote,suggestedCart,MATERIALS,quantities} from './dist/demo/procurement.js';
import {storyMoment} from './dist/demo/timeline.js';
import {dueAmount,courseEnding} from './dist/demo/course.js';

let transitions=0;
function check(s){validate(s);const r=report(s);assert.equal(r.assets,r.liabilities+r.equity);assert.equal(r.profit,r.operatingProfit-r.loss);assert.equal(r.openingCash+r.operatingFlow+r.investingFlow+r.financingFlow,r.b.cash);assert.equal(stockValue(s),r.b.inventory);assert.deepEqual(migrate(JSON.parse(JSON.stringify(s))),s);}
function step(s,action,value){const time=storyMoment(s),absolute=time.day*1440+time.minute,revision=s.revision;assert.ok(act(s,action,value),`${s.stage}: ${action}`);transitions++;check(s);const afterTime=storyMoment(s);assert.ok(afterTime.day*1440+afterTime.minute>=absolute,`${action} moves story time backward`);const after=JSON.stringify(s);assert.equal(act(s,action,value,revision),false);assert.equal(JSON.stringify(s),after);}
function book(s){const p=s.pendingBook;if(!p)return;for(const field of p.fields)field.value=String(field.target/100);if(p.fields.length&&!p.checked)step(s,'book-check');p.seenPages=[...p.pages];step(s,'book-done');}
function answer(s){const q=question(s);step(s,'learn');step(s,'pick',q.correct);step(s,'answer',q.correct);step(s,'next');}
export function play(seed,{equipment='keep',payment='cash',customer=100,offer='cash',rescue=true,clear=true,routine=true,overstock=0,stopAt}={}){
 const s=start(seed);check(s);
 for(let guard=0;guard<420;guard++){
  if(stopAt?.(s))return s;
  if(s.pendingBook){book(s);continue;}
  if(s.stage==='courseSummary'||s.stage==='results')return s;
  if(question(s)){answer(s);continue;}
  if(s.stage==='weekPurchase'){step(s,'purchase-payment',payment);if(s.course.week===3&&overstock)s.course.cart=Object.fromEntries(Object.entries(MATERIALS).map(([key,m])=>[key,overstock*m.recipe]));}
  if(s.stage==='dailyOpen'&&!routine)s.course.cart=Object.fromEntries(Object.keys(MATERIALS).map(key=>[key,0]));
  if(s.stage==='weekOrder')step(s,'course-order-select',customer);
  if(['weekBills','weekLoan'].includes(s.stage)&&balances(s).cash<dueAmount(s)){
   if(rescue&&s.course.contracts.some(v=>v.balance&&!v.advanceTried)){step(s,'course-advance');continue;}
   if(clear&&balances(s).inventory){step(s,'course-clear');continue;}
   step(s,'liquidate','failure');continue;
  }
  const actions={rainDay:'rain-close',weekRest:'week-rest-close',dailyTrading:'skip-day',dailyOpen:'daily-trade',dailyReady:'daily-trade',dailySold:'daily-close',welcome:'next',budget:'next',pocket:'invest',parents:'borrow',stall:'buy-stall',stallbought:'next',supply:'buy-stock',idle:'skip-wait',walkin:'serve-cash',delivery:'next',betweenCustomers:'next',cashReceipt:'next',dayEnd:'next',stockout:'next',review:'keep-stall',daySummary:'next-week',weekStart:'week-open',weekPurchase:'buy-stock',weekOrder:'course-sell',weekRejected:'course-wait',weekEquipment:'course-equipment',weekOffer:'course-offer',weekSale:'course-close',weekBills:'course-pay-supplier',weekLoan:'course-pay-loan',weekCollect:'course-collect',weekSummary:s.course.week<4?'next-week':'keep-course',liquidation:'settle'};
  const value=s.stage==='weekEquipment'?equipment:s.stage==='weekOffer'?offer:s.stage==='liquidation'?s.liquidation.step:undefined;
  step(s,actions[s.stage],value);
 }throw Error('course did not terminate');
}

const steady=play(22);assert.equal(steady.stage,'courseSummary');assert.equal(steady.course.week,4);assert.equal(steady.course.summaries.length,4);assert.equal(steady.course.upgrade,false);assert.equal(balances(steady).payable,0);assert.equal(steady.course.completed,true);assert.equal(courseEnding(steady),'小摊续营');
const expansion=play(0,{equipment:'loan',payment:'credit',customer:100,offer:'bulk'});assert.equal(expansion.stage,'courseSummary');assert.equal(expansion.course.upgrade,true);assert.ok(expansion.tx.some(t=>t.kind==='sale'&&t.id==='w3-sale'&&t.quantity>12));assert.equal(expansion.course.loan.paid,true);assert.equal(balances(expansion).loan,3200);assert.equal(balances(expansion).interestPayable,0);assert.equal(expansion.tx.filter(t=>t.kind==='depreciation').reduce((n,t)=>n+t.cost,0),200);assert.equal(report(expansion).financeExpense,200);assert.equal(courseEnding(expansion),'扩张成功');assert.equal(statementRows(expansion,2).find(row=>row.key==='expenses').value,200);assert.equal(statementRows(expansion,2).find(row=>row.key==='principal').value,3200);assert.equal(expansion.tx.filter(t=>t.kind==='interest-payment').reduce((n,t)=>n-(t.delta.cash||0),0),200);
const rescued=play(0,{equipment:'loan',payment:'credit',customer:0,offer:'bulk',routine:false,overstock:290});assert.equal(rescued.stage,'courseSummary');assert.ok(rescued.tx.some(t=>t.id.endsWith('-advance')));assert.ok(report(rescued).financeExpense>200);
const failed=play(16,{equipment:'loan',payment:'credit',customer:0,offer:'bulk',routine:false,overstock:300,rescue:false,clear:false});assert.equal(failed.stage,'results');assert.equal(failed.liquidation.reason,'failure');assert.equal(liquidationSteps(failed),6);

for(const [seed,kind] of [[0,'ontime'],[21,'late'],[16,'default']]){
 const s=play(seed,{customer:50});assert.equal(s.stage,'courseSummary');const contract=s.course.contracts.find(v=>v.week===2);assert.equal(contract.outcome,kind);assert.equal(contract.revealed,true);
 if(kind==='late'){assert.ok(contract.balance>0);assert.equal(balances(s).receivable,contract.balance);}
 if(kind==='default'){assert.ok(s.tx.some(t=>t.id==='w2-sale-bad-debt'));assert.equal(contract.balance,0);}
 const sales=s.tx.filter(t=>t.kind==='sale').reduce((n,t)=>n+t.revenue,0);assert.equal(report(s).revenue,sales,'collections do not create revenue again');
}


// Fresh games sell every operating day, with no hidden week/day jumps.
for(const s of [steady,expansion,rescued]){
 assert.deepEqual(s.course.daily.records.map(v=>v.day),Array.from({length:28},(_,i)=>i+3));
 assert.equal(s.course.daily.records.reduce((n,v)=>n+v.profitChange,0),report(s).profit);
 assert.equal(s.course.daily.records.reduce((n,v)=>n+v.cashChange,0),balances(s).cash-400);
 assert.equal(s.day,30);assert.equal(s.course.summaries.length,4);
}
const bulk=expansion.tx.find(t=>t.id==='w3-sale');assert.equal(bulk.revenue,bulk.quantity*400);assert.equal(bulk.delta.cash,bulk.revenue);assert.equal(bulk.delta.receivable,0);assert.ok(!expansion.course.contracts.some(v=>v.week===3&&v.balance));
const auto=play(0,{stopAt:s=>s.pendingBook?.automatic});assert.equal(auto.day,4);assert.ok(auto.pendingBook.checked);assert.ok(auto.pendingBook.fields.every(f=>parseAmount(f.value).cents===f.target));assert.deepEqual(auto.pendingBook.seenPages,auto.pendingBook.pages);assert.ok(auto.pendingBook.changes.length);const stable=JSON.stringify(auto.tx);book(auto);assert.equal(JSON.stringify(auto.tx),stable,'viewing auto-filled reports never posts money again');
const prepared=play(0,{stopAt:s=>s.stage==='dailyOpen'&&s.day===4});const repeatA=structuredClone(prepared),repeatB=structuredClone(prepared);step(repeatA,'daily-trade');step(repeatB,'daily-trade');assert.deepEqual(repeatA,repeatB,'same day and seed keep the same sales, prices and journal');
const early=play(22,{stopAt:s=>s.stage==='daySummary'});assert.ok(storyMoment(early).minute<1080,'sold-out opening closes before 18:00');assert.equal(early.tx.filter(t=>t.kind==='sale').reduce((n,t)=>n+t.quantity,0),12);

// Recipe choices change the actual lot ledger, never just a headline bundle.
const supply=play(2,{stopAt:s=>s.stage==='supply'&&!s.pendingBook});
const zero=Object.fromEntries(Object.keys(MATERIALS).map(key=>[key,0]));assert.equal(act(supply,'buy-stock',zero),false);
const imbalanced={lemon:100,tea:6,sugar:30,cup:1,straw:1};assert.equal(quote(imbalanced).cost,375);step(supply,'buy-stock',imbalanced);assert.equal(possibleCups(supply),1);assert.equal(balances(supply).inventory,375);book(supply);answer(supply);step(supply,'skip-wait');step(supply,'serve-cash');book(supply);assert.equal(supply.tx.find(t=>t.kind==='sale').quantity,1);assert.equal(balances(supply).inventory,175);assert.equal(stockValue(supply),175);
const short=start(2);short.stage='supply';short.day=2;short.tx.push({id:'test-cash',label:'fixture funds',delta:{cash:2800,capital:2800},flow:'financing',kind:'owner-investment',phase:'business',revenue:0,cost:0,loss:0});const before=JSON.stringify(short);assert.equal(act(short,'buy-stock',{...suggestedCart(short,12),lemon:100000}),false);assert.equal(JSON.stringify(short),before,'unaffordable procurement is atomic');

// Filled wrong values are caught on this click even when other fields remain blank.
const wrong=start(3);step(wrong,'next');step(wrong,'next');step(wrong,'invest');const p=wrong.pendingBook;p.fields[0].value='11';const facts=JSON.stringify(wrong.tx);step(wrong,'book-check');assert.equal(p.attempts,1);assert.equal(p.reminder,null);assert.equal(p.errorCounts['0:cash'],1);assert.equal(p.fields[1].value,'');step(wrong,'book-check');assert.equal(p.errorCounts['0:cash'],2);p.fields[0].value='12';step(wrong,'book-check');assert.ok(p.reminder);assert.equal(p.attempts,2);assert.deepEqual(p.errorCounts,{});assert.equal(JSON.stringify(wrong.tx),facts);

// A saved course can resume at any reached week, and all posted money remains stable.
for(const snapshot of [steady,expansion,rescued,failed,supply])assert.deepEqual(migrate(JSON.parse(JSON.stringify(snapshot))),snapshot);
// v25/v26 opening saves have no course or material-lot fields yet.
for(const stage of ['supply','inventory','daySummary']){
 const original=play(7,{stopAt:s=>s.stage===stage}),old=structuredClone(original),journal=JSON.stringify(old.tx);delete old.course;delete old.stockLots;
 const restored=migrate(old);assert.ok(restored.course);assert.equal(restored.course.week,1);assert.equal(JSON.stringify(restored.tx),journal);assert.deepEqual(restored.pendingBook,original.pendingBook);check(restored);
 if(stage==='daySummary'){step(restored,'next-week');assert.equal(restored.course.week,1);assert.equal(restored.stage,'dailyOpen');assert.equal(restored.day,4);}
}
for(const state of [steady,expansion,rescued]){const s=structuredClone(state);step(s,'liquidate');while(s.stage!=='results'||s.pendingBook){if(s.pendingBook)book(s);else step(s,'settle',s.liquidation.step);}assert.equal(balances(s).inventory,0);assert.equal(balances(s).receivable,0);assert.equal(stockValue(s),0);check(s);}
console.log(`Four-week course: ${transitions} transitions; 24 scheduled days including 3 rainy closures, and 4 accounting rest days, 4-yuan cash bulk orders, auto-filled reports; steady, actual expansion, deadline failure and early-receipt rescue; on-time / late / default seeds; weekly procurement, isolated lemons and one integer rain write-off; depreciation / interest / debt classification; collection without repeated income; immediate wrong-value checks, replay-safe actions, save/restore and liquidation passed.`);
