import assert from 'node:assert/strict';
import {ASSESSMENT_QUESTIONS,recordAssessment,assessmentScore,assessmentFor} from './dist/demo/assessment.js';
import {simpleCashRows,queueBook} from './dist/demo/accounting.js';
import {planService} from './dist/demo/service.js';
import {start,migrate,validate,SAVE_KEY,act} from './dist/demo/engine.js';
const s=start(22),journal=JSON.stringify(s.tx);
assert.equal(ASSESSMENT_QUESTIONS.length,10);
for(let i=0;i<10;i++){assert.equal(recordAssessment(s,'pre',i,i<4?ASSESSMENT_QUESTIONS[i].correct:3),true);assert.equal(recordAssessment(s,'pre',i,0),false,'a repeated tap cannot answer the next question');}
assert.equal(assessmentScore(s.assessment.pre),4);assert.equal(recordAssessment(s,'pre',10,0),false);
const restored=migrate(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored.assessment,s.assessment);
for(let i=0;i<10;i++)recordAssessment(s,'post',i,ASSESSMENT_QUESTIONS[i].correct);
assert.equal(assessmentScore(s.assessment.post),10);assert.equal(JSON.stringify(s.tx),journal);validate(s);
const pending=start(22);for(const action of ['next','next','invest'])assert.ok(act(pending,action));
pending.pendingBook.statementVersion=2;pending.pendingBook.automatic=true;pending.pendingBook.preview=true;pending.pendingBook.fields.forEach(f=>f.value=String(f.target/100));pending.pendingBook.checked=true;
const migratedAutomatic=migrate(JSON.parse(JSON.stringify(pending)));assert.equal(migratedAutomatic.pendingBook.automatic,true);assert.equal(migratedAutomatic.pendingBook.preview,true);assert.equal(migratedAutomatic.pendingBook.checked,true);assert.deepEqual(migratedAutomatic.tx,pending.tx);validate(migratedAutomatic);
const blank=start();assert.equal(assessmentScore(assessmentFor(blank).pre),null,'untaken tests are not zero scores');
// An entire sample journal: credit collection and accrued interest do not duplicate profit or cash.
const flows={tx:[{flow:'opening',delta:{cash:1000}},{flow:'financing',kind:'loan',delta:{cash:1200,loan:1200}},{flow:'operating',kind:'stock-purchase',delta:{cash:-400,inventory:400}},{flow:'investing',kind:'equipment-purchase',delta:{cash:-600,equipment:600}},{flow:'operating',kind:'sale',delta:{receivable:1000,profit:600,inventory:-400}},{flow:'operating',kind:'collection',delta:{cash:1000,receivable:-1000}},{flow:'financing',kind:'interest-expense',delta:{interestPayable:200,profit:-200}},{flow:'financing',kind:'payment',delta:{cash:-1400,loan:-1200,interestPayable:-200}},{flow:'operating',kind:'depreciation',delta:{equipment:-100,profit:-100}}]};
const rows=simpleCashRows(flows),row=key=>rows.find(r=>r.key===key)?.value||0;
assert.equal(rows.length,7);assert.equal(row('incoming'),2200);assert.equal(row('principal'),1200);assert.equal(row('expenses'),200);assert.equal(row('ending'),800);assert.equal(row('opening')+row('incoming')-row('purchases')-row('devices')-row('expenses')-row('principal'),row('ending'));
assert.ok(!simpleCashRows({tx:[flows.tx[0]]}).some(r=>r.key==='principal'||r.key==='devices'));
// Same visitors and stock, different service speed. Equipment cannot solve a stock shortage.
const old={course:{upgrade:false}},fast={course:{upgrade:true}},sum=p=>p.events.reduce((n,e)=>n+e.quantity,0);
assert.equal(sum(planService(old,24,40,540,1080)),12);assert.equal(sum(planService(fast,24,40,540,1080)),24);
assert.equal(sum(planService(old,2,40,540,1080)),2);assert.equal(sum(planService(fast,2,40,540,1080)),2);
assert.equal(sum(planService(old,24,3,540,1080)),3);assert.equal(sum(planService(fast,24,3,540,1080)),3);
assert.equal(planService(old,24,40,540,1080).lostToWait,12);assert.equal(planService(fast,24,40,540,1080).lostToWait,0);
console.log('Revision rules: original pre/post assessment, first answers, local save, absent baseline, no bookkeeping effects; simplified cash reconciliation including combined principal/interest; independent demand, stock and preparation speed passed.');
