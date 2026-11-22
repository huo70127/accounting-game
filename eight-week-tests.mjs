import assert from 'node:assert/strict';
import {start,act,question,validate,migrate,balances,report,ownership,statementRows,liquidationSteps} from './dist/demo/engine.js';
import {stockValue} from './dist/demo/procurement.js';
import {courseDay,businessDay,isRestDay} from './dist/demo/calendar.js';
import {staffing,nightToday} from './dist/demo/summer-rules.js';
import {fillCurrentBook} from './dist/demo/test-tools.js';
import {money} from './dist/demo/accounting.js';
import {play,step,book,checks} from './eight-week-test-helpers.mjs';
const full=play();assert.equal(full.course.week,8);assert.equal(full.course.completed,true);assert.equal(full.course.summaries.length,8);assert.equal(full.course.daily.records.length,56);assert.equal(full.day,58);assert.equal(ownership(full).percent,75);assert.equal(balances(full).loan,0);assert.equal(balances(full).wagesPayable,0);assert.equal(full.tx.filter(t=>t.kind==='depreciation').reduce((n,t)=>n+t.cost,0),600);assert.equal(balances(full).equipment,4200);assert.equal(full.tx.filter(t=>t.kind==='wage-expense').length,6);assert.equal(full.course.summer.payouts[0].player,7500);assert.equal(full.course.summer.payouts[0].friend,2500);assert.equal(report(full).salesExpense,6*1200+2400);assert.ok(full.tx.some(t=>t.bundles));
for(let day=36;day<=56;day++)assert.equal(staffing(full,courseDay(full,day)).helper,[6,0].includes(day%7));
assert.equal(full.course.daily.records.filter(r=>r.day>=courseDay(full,36)&&!r.rest).length,21);
assert.ok(full.answers.summerAccrual&&full.answers.summerNightResult&&full.answers.summerRetained);
assert.equal(statementRows(full,2).find(r=>r.key==='expenses').value,9600);assert.equal(statementRows(full,2).find(r=>r.key==='distributions').value,10000);
for(const schedule of ['five','six']){const s=play(22,{partner:'no',schedule,night:'no',upgrade:'keep',dividend:0});assert.equal(s.stage,'courseSummary');assert.equal(ownership(s).percent,100);assert.equal(s.tx.filter(t=>t.kind==='wage-expense').length,0);assert.equal(s.tx.filter(t=>t.bundles).length,0);assert.equal(s.tx.filter(t=>t.kind==='night-fee').length,0);assert.equal(s.course.daily.records.filter(r=>r.day>=courseDay(s,36)&&r.rest).length,schedule==='five'?6:3);}
const liquidation=play(0,{ending:'liquidate',upgrade:'loan'});assert.equal(liquidation.stage,'results');assert.equal(report(liquidation).assets,0);assert.equal(report(liquidation).liabilities,0);assert.equal(report(liquidation).equity,0);assert.equal(balances(liquidation).cash,0);assert.ok(report(liquidation).profit>0);assert.equal(liquidation.course.summer.distributed,true);assert.ok(liquidation.answers.summerRetained);assert.equal(liquidation.course.loan.paid,true);assert.equal(report(liquidation).financeExpense,200);
// Late four-week contract is actually collected in week five without new revenue.
const late=play(21);assert.equal(late.course.contracts[0].outcome,'late');assert.equal(late.course.contracts[0].balance,0);assert.ok(late.tx.some(t=>t.id==='w2-sale-collection'&&t.storyAt.day===courseDay(late,32)));
// Save round-trips cover every newly introduced transaction and question.
for(const s of [full,liquidation,late])assert.deepEqual(migrate(JSON.parse(JSON.stringify(s))),s);
const mid=play(8,{stopAt:s=>s.stage==='summerSchedule'}),a=play(8,{from:mid}),b=play(8,{from:mid});assert.deepEqual(a,b);
// The requested temporary control only fills the current transaction.
const fill=play(9,{stopAt:s=>!!s.pendingBook&&!s.pendingBook.checked}),before={tx:JSON.stringify(fill.tx),stage:fill.stage,answers:JSON.stringify(fill.answers),day:fill.day};assert.ok(fillCurrentBook(fill,act,money));assert.equal(fill.pendingBook.checked,true);assert.equal(fill.stage,before.stage);assert.equal(fill.day,before.day);assert.equal(JSON.stringify(fill.tx),before.tx);assert.equal(JSON.stringify(fill.answers),before.answers);assert.ok(fill.pendingBook);assert.equal(fillCurrentBook(fill,act,money),false);
// Early liquidation includes unpaid Saturday labor and pays no owners while insolvent.
const saturday=play(3,{stopAt:s=>s.stage==='dailySold'&&businessDay(s)===41&&!s.pendingBook});assert.equal(balances(saturday).wagesPayable,1200);step(saturday,'liquidate');while(saturday.stage!=='results'||saturday.pendingBook){if(saturday.pendingBook)book(saturday);else if(question(saturday)){const q=question(saturday);if(!saturday.lessonsSeen[saturday.stage])step(saturday,'learn');step(saturday,'pick',q.correct);step(saturday,'answer',q.correct);step(saturday,'next');}else step(saturday,'settle',saturday.liquidation.step);}assert.equal(balances(saturday).wagesPayable,0);assert.equal(saturday.course.summer.distributed,true);
// Published four-week saves continue forward without replaying their journal.
const four=play(5,{stopAt:s=>s.course.week===4&&s.stage==='weekSummary'&&!s.pendingBook});
four.stage='courseSummary';four.course.completed=true;delete four.course.totalWeeks;delete four.course.summer;
const oldJournal=JSON.stringify(four.tx),continued=migrate(four);assert.equal(continued.stage,'weekSummary');assert.equal(continued.course.totalWeeks,8);assert.equal(continued.course.completed,false);assert.equal(JSON.stringify(continued.tx),oldJournal);assert.equal(play(5,{from:continued}).course.week,8);
for(const old of JSON.parse((await import('node:fs')).readFileSync('fixtures/course-v32.json','utf8'))){const migrated=migrate(old),journal=new Map(old.tx.map(t=>[t.id,JSON.stringify(t)]));const done=play(old.seed,{from:migrated});assert.equal(done.course.week,8);for(const [id,json] of journal)assert.equal(JSON.stringify(done.tx.find(t=>t.id===id)),json);}
// A wrong answer keeps the actual transaction and first-attempt result intact.
const wrong=play(2,{stopAt:s=>s.stage==='summerEquity'&&!s.pendingBook});step(wrong,'learn');const wq=question(wrong),other=(wq.correct+1)%wq.options.length,ledger=JSON.stringify(wrong.tx);step(wrong,'pick',other);step(wrong,'answer',other);assert.equal(wrong.answers.summerEquity.correct,false);assert.equal(JSON.stringify(wrong.tx),ledger);assert.equal(act(wrong,'answer',wq.correct),false);
// Stopping during a helper shift still settles that day's fixed wage.
const during=play(7,{stopAt:s=>s.stage==='dailyTrading'&&businessDay(s)===41});step(during,'liquidate');assert.equal(balances(during).wagesPayable,1200);
console.log(`Eight-week routes passed: ${checks} checked transitions; partnership/solo, 5/6/7-day schedules, accrual/payroll, night market, delayed collection, save/replay, retention/liquidation and fill-only control.`);
