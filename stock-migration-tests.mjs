import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act,balances,migrate,question,report,validate} from './dist/demo/engine.js';
import {dueAmount} from './dist/demo/course.js';
import {stockValue} from './dist/demo/procurement.js';
import {storyMoment} from './dist/demo/timeline.js';

// Deterministic fixtures from published v32, b18c319bbea164cb09ac15d7e6d111b9a78aa5c1.
// They contain no player data, and include an active old purchase/guest plan.
for(const old of JSON.parse(readFileSync('fixtures/course-v32.json','utf8'))){
 const s=migrate({...old,course:{...old.course,totalWeeks:4}}),known=new Map(old.tx.map(t=>[t.id,JSON.stringify(t)]));
 assert.equal(JSON.stringify(s.tx),JSON.stringify(old.tx));assert.deepEqual(s.pendingBook,old.pendingBook);
 assert.deepEqual(s.course.contracts,old.course.contracts);assert.equal(stockValue(s),stockValue(old));assert.equal(s.course.stockPolicyVersion,3);
 if(old.course.daily.shift)assert.deepEqual(s.course.daily.shift,old.course.daily.shift,'never regroup a day already in progress');
 let finished=false;
 for(let i=0;i<500;i++){
  validate(s);assert.deepEqual(migrate(JSON.parse(JSON.stringify(s))),s);
  if(['courseSummary','results'].includes(s.stage)&&!s.pendingBook){finished=true;break;}
  const time=storyMoment(s),p=s.pendingBook,q=question(s);let action,value;
  if(p){if(!p.checked){p.fields.forEach(f=>f.value=String(f.target/100));if(p.fields.length)assert.ok(act(s,'book-check'));}p.seenPages=[...p.pages];action='book-done';}
  else if(q){if(!s.lessonsSeen[s.stage])act(s,'learn');act(s,'pick',q.correct);act(s,'answer',q.correct);action='next';}
  else if(['weekBills','weekLoan'].includes(s.stage)&&balances(s).cash<dueAmount(s)){
   if(s.course.contracts.some(v=>v.balance&&!v.advanceTried))action='course-advance';else if(balances(s).inventory)action='course-clear';else{action='liquidate';value='failure';}
  }else{
   if(s.stage==='weekPurchase')act(s,'purchase-payment','credit');if(s.stage==='weekOrder')act(s,'course-order-select',50);
   action=({rainDay:'rain-close',weekRest:'week-rest-close',dailyTrading:'skip-day',dailyOpen:'daily-trade',dailyReady:'daily-trade',dailySold:'daily-close',daySummary:'next-week',weekStart:'week-open',weekPurchase:'buy-stock',weekOrder:'course-sell',weekRejected:'course-wait',weekEquipment:'course-equipment',weekOffer:'course-offer',weekSale:'course-close',weekSummary:s.course.week<4?'next-week':'keep-course',weekBills:'course-pay-supplier',weekLoan:'course-pay-loan',weekCollect:'course-collect',liquidation:'settle'})[s.stage];
   value=s.stage==='weekEquipment'?'loan':s.stage==='weekOffer'?'bulk':s.stage==='liquidation'?s.liquidation.step:undefined;
  }
  assert.ok(action,s.stage);assert.ok(act(s,action,value));const next=storyMoment(s);assert.ok(next.day*1440+next.minute>=time.day*1440+time.minute,'migration cannot rewind a trading day');
 }
 assert.ok(finished,old.stage);assert.equal(s.stage,'courseSummary');assert.equal(s.day,30);
 for(const [id,json] of known)assert.equal(JSON.stringify(s.tx.find(t=>t.id===id)),json);
 assert.ok(!s.tx.filter(t=>!known.has(t.id)).some(t=>t.rawHandling),'new purchases never use the retired percentage losses');
 const r=report(s);assert.equal(r.assets,r.liabilities+r.equity);assert.equal(r.openingCash+r.operatingFlow+r.investingFlow+r.financingFlow,r.b.cash);
}
console.log('Published v32 migration: posted losses, contracts, drafts and active sales preserved; future stock has no percentage loss, no time reversal, all four checkpoints finish with balanced reports.');
