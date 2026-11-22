import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {legacyStart as start,act,migrate,validate,report,scores,question} from './dist/demo/engine.js';
import {challenge,MAIN_QUESTIONS} from './dist/demo/questions.js';
import {build} from './dist/demo/questions-v2.js';
import {TERMS} from './dist/demo/learning.js';
import {scenarios} from './demo-scenarios.mjs';

const beginner=start(scenarios.half.seed);act(beginner,'next');
assert.equal(beginner.stage,'inventory');
const inventory=question(beginner);
assert.ok(act(beginner,'pick',inventory.correct),'everyone can answer the shared warmup directly');
assert.equal(Object.keys(beginner.answers).length,0);
assert.equal(act(beginner,'learn'),false);assert.equal(Object.keys(beginner.answers).length,0,'reading a definition is not an answer');
const wrong=(inventory.correct+1)%3;assert.ok(act(beginner,'pick',wrong));assert.ok(act(beginner,'answer',wrong));
assert.equal(beginner.answers.inventory.correct,false);
const first=structuredClone(beginner.answers.inventory);
assert.equal(act(beginner,'answer',inventory.correct),false,'later attempts cannot replace the first judgment');
assert.deepEqual(migrate(JSON.parse(JSON.stringify(beginner))).answers.inventory,first);

const shared=start(9);assert.equal(act(shared,'learning-mode','quick'),false);act(shared,'next');
assert.ok(act(shared,'pick',question(shared).correct));assert.ok(act(shared,'answer',question(shared).correct));

// Every option set stays unique and follows the actual number of cups sold.
for(const qty of [0,4,8,12]){
 const s=start(40);if(qty)s.tx.push({id:'sale',kind:'sale',quantity:qty,revenue:qty*500,cost:qty*200,delta:{cash:qty*250,receivable:qty*250,inventory:-qty*200,profit:qty*300}});
 for(const [stage,amount] of [['revenue',qty*5],['cost',qty*2],['margin',qty*3]]){
  const q=question({...s,stage});assert.equal(q.options[q.correct],`${amount} 元`);
  assert.equal(new Set(q.options).size,3);assert.ok(q.lesson.terms.length);
  assert.deepEqual(question(JSON.parse(JSON.stringify({...s,stage}))),q,'reload does not reshuffle an answer');
 }
 assert.equal(challenge(s,'marginRate')===null,qty===0,'never divide by zero on a no-sales route');
}
for(const stage of MAIN_QUESTIONS){const positions=new Set();for(let seed=0;seed<100;seed++){const s={...start(seed),stage};positions.add(question(s).correct);}assert.equal(positions.size,question({...start(),stage}).options.length,'correct positions vary between new games');}
assert.equal(question({...start(),stage:'forecast'}),null);
assert.equal(question({...start(),stage:'transfer'}),null);

// Optional depth uses the same stall and never alters money or baseline scores.
const optional=start(scenarios.half.seed);optional.stage='order';act(optional,'select',3000);act(optional,'sell');
optional.pendingBook=null;optional.stage='review';
const financial=JSON.stringify(report(optional)),baseline=structuredClone(scores(optional)),answers=JSON.stringify(optional.answers);
for(const [id,correctText] of [['marginRate','60%'],['expectedLoss','1.5 元']]){
 const q=challenge(optional,id);assert.equal(q.options[q.correct],correctText);
 assert.ok(act(optional,'challenge-pick',{id,index:q.correct}));assert.ok(act(optional,'challenge-answer',{id,index:q.correct}));
 assert.equal(act(optional,'challenge-answer',{id,index:q.correct}),false);
}
assert.equal(JSON.stringify(report(optional)),financial);assert.equal(JSON.stringify(optional.answers),answers);
assert.deepEqual(scores(optional),baseline,'optional questions must not penalize beginners or inflate baseline mastery');
assert.deepEqual(validate(JSON.parse(JSON.stringify(optional))),optional);
const outside=structuredClone(optional);outside.stage='order';outside.challengeAnswers={};assert.equal(act(outside,'challenge-pick',{id:'expectedLoss',index:0}),false);

// Old question results remain separate; financial progress and unfinished inputs survive.
const old=structuredClone(optional);delete old.lessonVersion;old.stage='forecast';old.answers={forecast:{index:1,correct:true}};old.picks={forecast:1};
const upgraded=migrate(old);assert.equal(upgraded.stage,'payable');assert.deepEqual(upgraded.tx,old.tx);
assert.deepEqual(upgraded.legacyAnswers,old.answers);assert.deepEqual(upgraded.answers,{});
assert.deepEqual(validate(JSON.parse(JSON.stringify(upgraded))),upgraded);
const draft=start(scenarios.half.seed);draft.stage='order';act(draft,'select',3000);act(draft,'sell');draft.pendingBook.fields[0].value='17';delete draft.lessonVersion;
const draftUpgraded=migrate(draft);assert.deepEqual(draftUpgraded.pendingBook,draft.pendingBook);assert.deepEqual(draftUpgraded.tx,draft.tx);

assert.match(TERMS.gross.formula,/毛利＝营业收入－营业成本/);
assert.match(TERMS.profit.formula,/每笔只计一次/,'liquidation bad debts cannot be deducted twice');
for(const file of ['questions-v2.js','learning.js','accounting.js','book-ui.js']){
 const text=readFileSync('dist/demo/'+file,'utf8');assert.doesNotMatch(text,/应收(?!账款)|应付(?!账款|利息|职工薪酬|工资)|销售收入|销售成本/);
}
console.log('Learning: one shared warmup route, formulas for actual sales, stable answers, first-attempt retention, optional depth isolated from finances/scores, zero-sale handling, full terminology and legacy migration passed.');

for(let n=2;n<=6;n++){
 const choices=Array.from({length:n},(_,i)=>['选项 '+i,i?'错因 '+i:'']);
 for(let seed=0;seed<40;seed++){const q=build(start(seed),'variable-options',{choices});assert.equal(q.options.length,n);assert.equal(q.options[q.correct],'选项 0');assert.equal(new Set(q.options).size,n);}
}
const simpleLoan=question({...start(12),stage:'loanquiz'});assert.deepEqual(new Set(simpleLoan.options),new Set(['负债','营业收入']));assert.equal(simpleLoan.id,'v2:loanquiz:r2');
// Already answered old questions keep their original options and recorded judgment.
const prior=start(22);delete prior.questionRevisions;prior.stage='loanquiz';prior.answers.loanquiz={id:'v2:loanquiz',index:0,correct:true};const oldQuestion=question(prior);prior.answers.loanquiz.index=oldQuestion.correct;assert.equal(oldQuestion.options.length,3);const resumed=migrate(prior);assert.deepEqual(resumed.answers.loanquiz,prior.answers.loanquiz);assert.deepEqual(question(resumed),oldQuestion);
const unfinished=start(22);delete unfinished.questionRevisions;unfinished.stage='loanquiz';unfinished.picks.loanquiz=2;const revised=migrate(unfinished);assert.equal(revised.picks.loanquiz,undefined);assert.equal(question(revised).options.length,2);
console.log('Questions: 2–6 choices, concise two-choice loan question, old answered options and unsubmitted-pick migration passed.');
