import assert from 'node:assert/strict';
import {start as engineStart,act,question,balances,validate} from './dist/demo/engine.js';
const start=seed=>engineStart(seed,4);
import {dueAmount} from './dist/demo/course.js';
export function settleBook(s){const p=s.pendingBook;if(!p)return;if(p.preview)act(s,'receipt-review');if(!p.checked){p.fields.forEach(f=>f.value=String(f.target/100));if(p.fields.length)assert.ok(act(s,'book-check'));}p.seenPages=[...p.pages];assert.ok(act(s,'book-done'));}
export function runCourse(seed=0,{upgrade=true,payment='cash',stopAt}={}){
 const s=start(seed);
 for(let guard=0;guard<500;guard++){
  if(stopAt?.(s))return s;
  if(s.pendingBook){settleBook(s);continue;}
  if(['courseSummary','results'].includes(s.stage)){validate(s);return s;}
  const q=question(s);if(q){if(!s.lessonsSeen[s.stage])act(s,'learn');act(s,'pick',q.correct);act(s,'answer',q.correct);assert.ok(act(s,'next'));continue;}
  if(s.stage==='weekPurchase')act(s,'purchase-payment',payment);
  if(s.stage==='weekOrder')act(s,'course-order-select',100);
  if(['weekBills','weekLoan'].includes(s.stage)&&balances(s).cash<dueAmount(s)){if(s.course.contracts.some(v=>v.balance&&!v.advanceTried))act(s,'course-advance');else if(balances(s).inventory)act(s,'course-clear');else act(s,'liquidate','failure');continue;}
  const action=({rainDay:'rain-close',weekRest:'week-rest-close',dailyTrading:'skip-day',dailyOpen:'daily-trade',dailyReady:'daily-trade',dailySold:'daily-close',welcome:'next',budget:'next',pocket:'invest',parents:'borrow',stall:'buy-stall',stallbought:'next',supply:'buy-stock',idle:'skip-wait',walkin:'serve-cash',delivery:'next',betweenCustomers:'next',cashReceipt:'next',dayEnd:'next',stockout:'next',review:'keep-stall',daySummary:'next-week',weekStart:'week-open',weekPurchase:'buy-stock',weekOrder:'course-sell',weekRejected:'course-wait',weekEquipment:'course-equipment',weekOffer:'course-offer',weekSale:'course-close',weekBills:'course-pay-supplier',weekLoan:'course-pay-loan',weekCollect:'course-collect',weekSummary:s.course.week<4?'next-week':'keep-course',liquidation:'settle'})[s.stage];assert.ok(action,s.stage);assert.ok(act(s,action,s.stage==='weekEquipment'?(upgrade?'loan':'keep'):s.stage==='weekOffer'?'bulk':s.stage==='liquidation'?s.liquidation.step:undefined));
 }throw Error('course did not terminate');
}
