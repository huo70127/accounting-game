import assert from 'node:assert/strict';
import {start,act,question,validate,migrate,balances,report,ownership,statementRows,liquidationSteps} from './dist/demo/engine.js';
import {stockValue} from './dist/demo/procurement.js';
import {courseDay,businessDay,isRestDay} from './dist/demo/calendar.js';
import {staffing,nightToday} from './dist/demo/summer-rules.js';
import {fillCurrentBook} from './dist/demo/test-tools.js';
import {simpleCashRows,money} from './dist/demo/accounting.js';
export let checks=0;
export function invariant(s){validate(s);const r=report(s);assert.equal(r.assets,r.liabilities+r.equity);assert.equal(r.profit,r.operatingProfit-r.loss);assert.equal(r.openingCash+r.operatingFlow+r.investingFlow+r.financingFlow,r.b.cash);assert.equal(stockValue(s),r.b.inventory);const rows=simpleCashRows(s),value=k=>rows.find(row=>row.key===k)?.value||0;assert.equal(value('opening')+value('incoming')-['purchases','devices','expenses','principal','distributions'].reduce((n,k)=>n+value(k),0),r.b.cash);checks++;}
export function step(s,a,v){const revision=s.revision,tx=JSON.stringify(s.tx);assert.ok(act(s,a,v),`${s.course.week}/${businessDay(s)} ${s.stage}: ${a} ${v}`);invariant(s);const now=JSON.stringify(s);assert.equal(act(s,a,v,revision),false);assert.equal(JSON.stringify(s),now);}
export function book(s){const p=s.pendingBook;if(!p)return;if(p.preview)step(s,'receipt-review');if(!p.checked){p.fields.forEach(f=>f.value=money(f.target));if(p.fields.length)step(s,'book-check');}p.seenPages=[...p.pages];step(s,'book-done');}
export function play(seed=22,{partner='yes',schedule='hire',night='yes',upgrade='cash',ending='keep',dividend=10000,stopAt,from}={}){
 const s=from?structuredClone(from):start(seed);
 for(let i=0;i<1800;i++){
  if(stopAt?.(s))return s;
  if(s.pendingBook){book(s);continue;}
  if(['results','courseSummary'].includes(s.stage))return s;
  const q=question(s);if(q){if(!s.lessonsSeen[s.stage])step(s,'learn');if(!s.answers[s.stage]){step(s,'pick',q.correct);step(s,'answer',q.correct);}step(s,'next');continue;}
  if(s.stage==='weekOrder')step(s,'course-order-select',50);
  if(s.stage==='summerClosing'&&ending==='liquidate'){step(s,'liquidate','completed');continue;}
  const a={welcome:'next',budget:'next',pocket:'invest',parents:'borrow',stall:'buy-stall',stallbought:'next',supply:'buy-stock',idle:'skip-wait',walkin:'serve-cash',delivery:'next',betweenCustomers:'next',cashReceipt:'next',dayEnd:'next',stockout:'next',review:'keep-stall',daySummary:'next-week',weekStart:'week-open',weekPurchase:'buy-stock',weekOrder:'course-sell',weekRejected:'course-wait',weekEquipment:'course-equipment',weekOffer:'course-offer',weekSale:'course-close',weekBills:'course-pay-supplier',weekLoan:'course-pay-loan',weekCollect:'course-collect',weekSummary:s.course.week<8?'next-week':'keep-course',rainDay:'rain-close',weekRest:'week-rest-close',dailyTrading:'skip-day',dailyOpen:'daily-trade',dailyReady:'daily-trade',dailySold:'daily-close',summerPartner:'summer-partner',summerSchedule:'summer-schedule',summerPayroll:'summer-payroll',summerNight:'summer-night',summerParentDue:'summer-parent-pay',summerClosing:'summer-keep',summerDistribution:'summer-dividend',liquidation:'settle'}[s.stage];
  assert.ok(a,`unhandled stage ${s.stage}`);
  const v={weekEquipment:upgrade,weekOffer:'bulk',summerPartner:partner,summerSchedule:schedule,summerNight:night,summerDistribution:dividend,liquidation:s.liquidation?.step}[s.stage];
  step(s,a,v);
 }throw Error('Eight weeks did not finish');
}
