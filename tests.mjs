import assert from 'node:assert/strict';
import {start as emptyStart,act as realAct,balances,report,replay,validate} from './dist/engine.js';
let checks=0;
// Financial regression paths explicitly fast-forward interludes. Timing is tested below.
function act(s,a,n){if(s.world?.wait&&a!=='arrive'&&a!=='call')realAct(s,'arrive');if(a==='next'&&['close1','close2'].includes(s.phase))realAct(s,'review');return realAct(s,a,n);}
function start(seed=0){const s=emptyStart(seed);assert.equal(act(s,'family'),true);assert.equal(act(s,'supplies'),true);return s;}
function go(s,a,n){const ok=act(s,a,n);assert.equal(ok,true,a);const b=balances(s);validate(s);const r=report(s,s.day);assert.equal(r.opening+r.flow,b.cash);checks++;}
function expansion(channel){const s=start();for(const a of ['serve','deposit','buy','next','collect','loan','machine','ready',channel])go(s,a);if(channel==='group')go(s,'confirm');for(let i=0;i<5;i++)go(s,'cup');assert.equal(act(s,'cup'),false);go(s,'close');assert.equal(report(s,2).profit,channel==='group'?21:11);go(s,'next');if(channel==='group'){assert.equal(balances(s).cash,0);assert.equal(balances(s).receivable,35);}go(s,'repay');assert.equal(s.end,channel==='walk'?'success':'failure');if(channel==='walk')assert.equal(balances(s).cash,11);else assert.equal(balances(s).interest,2);const tx=JSON.stringify(s.tx);assert.equal(act(s,'repay'),false);assert.equal(JSON.stringify(s.tx),tx);const reset=replay(s);assert.equal(reset.day,2);assert.equal(reset.phase,'collect');assert.equal(balances(reset).cash,0);assert.equal(balances(reset).receivable,12);assert.equal(reset.flags.loan,undefined);return s;}
expansion('walk');expansion('group');
for(const credit of ['full','deposit','refuse']){const s=start();go(s,'serve');assert.equal(act(s,'serve'),false);go(s,credit);if(credit==='refuse'){go(s,'wait');while(s.evening.served<s.evening.demand)go(s,'eveningCup');go(s,'finishEvening');}if(credit==='full')assert.equal(act(s,'buy'),false);go(s,'skip');go(s,'next');const p=balances(s).profit;go(s,'collect');assert.equal(balances(s).profit,p);if(balances(s).inventory<6)go(s,'stock',3);go(s,'ready');go(s,'walk');for(let i=0;i<3;i++)go(s,'cup');go(s,'close');go(s,'next');go(s,'repay');assert.equal(s.end,'continue');}
console.log(`${checks} transitions verified; all acceptance routes, balance equations, cash reconciliations, replay and duplicate actions passed.`);
const {statement,changes,badge}=await import('./dist/feedback.js');
const visual=start();const beforeVisual=balances(visual);act(visual,'serve');
assert.deepEqual(changes(beforeVisual,balances(visual)).map(v=>[v.key,v.value]),[['cash',5],['inventory',-2],['profit',3]]);
assert.match(badge(5),/up.*↑ \+5/);assert.match(badge(-2),/down.*↓ −2/);
for(let day=0;day<=3;day++)for(let page=0;page<3;page++)assert.ok(statement(visual,day,page).every(v=>Number.isFinite(v.value)));
act(visual,'deposit');act(visual,'buy');act(visual,'next');const priorIncome=statement(visual,2,1);act(visual,'collect');assert.deepEqual(statement(visual,2,1),priorIncome);
assert.equal(statement(visual,2,2).find(v=>v.key==='ending').value,12);
assert.equal(statement(visual,1,0).find(v=>v.key==='cash').value,0);
console.log('Statement comparison, delta signs and collection feedback verified.');
const {newConcepts}=await import('./dist/concepts.js');
const learning=start();
assert.deepEqual(statement(learning,1,1),[]);
for(const key of ['debt','interest','equipment','receivable','profit'])assert.ok(!statement(learning,1,0).some(v=>v.key===key),key);
let prior=structuredClone(learning);act(learning,'serve');assert.ok(newConcepts(prior,learning).includes('revenue'));assert.ok(!newConcepts(prior,learning).includes('debt'));
prior=structuredClone(learning);act(learning,'deposit');assert.ok(newConcepts(prior,learning).includes('receivable'));
act(learning,'buy');act(learning,'next');act(learning,'collect');assert.ok(statement(learning,2,0).some(v=>v.key==='receivable'&&v.value===0));
prior=structuredClone(learning);act(learning,'loan');assert.ok(newConcepts(prior,learning).includes('debt'));assert.ok(!statement(learning,2,0).some(v=>v.key==='interest'));
prior=structuredClone(learning);act(learning,'machine');assert.ok(newConcepts(prior,learning).includes('equipment'));assert.ok(!statement(learning,2,1).some(v=>v.key==='depreciation'));
assert.ok(!statement(learning,1,0).some(v=>v.key==='equipment'));
const learningReset=replay(learning);assert.ok(!statement(learningReset,2,0).some(v=>v.key==='debt'));act(learningReset,'collect');prior=structuredClone(learningReset);act(learningReset,'loan');assert.ok(newConcepts(prior,learningReset).includes('debt'));
console.log('Progressive disclosure, first-use introductions, historical views and replay verified.');

const {envelope,restore,checkState}=await import('./dist/storage.js');
const origin=emptyStart();assert.equal(origin.phase,'intro');assert.equal(balances(origin).cash,0);assert.equal(origin.tx.length,0);assert.deepEqual(statement(origin,1,0),[]);
assert.deepEqual(restore(envelope(origin)),origin);
const original=structuredClone(origin);go(origin,'family');assert.equal(balances(origin).familyDebt,10);assert.equal(balances(origin).cash,10);assert.equal(balances(origin).profit,0);assert.equal(balances(origin).capital,0);assert.ok(newConcepts(original,origin).includes('familyDebt'));assert.equal(act(origin,'family'),false);
go(origin,'supplies');assert.equal(balances(origin).cash,2);assert.equal(balances(origin).inventory,8);assert.equal(act(origin,'supplies'),false);
assert.deepEqual(restore(envelope(origin)),origin);
for(const route of ['walk','group']){const s=expansion(route);assert.equal(balances(s).familyDebt,10);assert.equal(balances(s).debt,route==='walk'?0:12);assert.deepEqual(restore(envelope(s)),s);const back=replay(restore(envelope(s)));assert.equal(balances(back).familyDebt,10);assert.equal(balances(back).debt,0);checkState(back);}
const broken=envelope(origin);broken.state.tx[0].delta.familyDebt=0;assert.throws(()=>restore(broken));
const duplicate=envelope(origin);duplicate.state.tx.push(duplicate.state.tx[0]);assert.throws(()=>restore(duplicate));
assert.throws(()=>restore({version:999,state:origin}));
const beforeImport=JSON.stringify(origin);const imported=restore(envelope(origin));imported.tx[0].delta.cash=999;assert.equal(JSON.stringify(origin),beforeImport);
console.log('Zero-cash opening, parent loan accounting, duplicate clicks, save round trips and checkpoint restoration verified.');

// Discover one reproducible game for every authored evening outcome.
const seeds=new Map();
for(let seed=0;seed<200&&seeds.size<4;seed++){const s=start(seed);act(s,'serve');act(s,'refuse');act(s,'wait');if(!seeds.has(s.evening.demand))seeds.set(s.evening.demand,seed);}
assert.equal(seeds.size,4);
for(const [demand,seed] of seeds){
 const s=start(seed);go(s,'serve');go(s,'refuse');assert.equal(s.phase,'dusk');assert.equal(s.evening,null);
 const beforeDraw=restore(envelope(s));go(s,'wait');go(beforeDraw,'wait');assert.equal(s.evening.demand,demand);assert.deepEqual(beforeDraw,s);
 const afterDraw=restore(envelope(s));assert.deepEqual(afterDraw.evening,s.evening);const rng=s.rngState;assert.equal(act(s,'wait'),false);assert.equal(s.rngState,rng);
 while(s.evening.served<demand){go(s,'eveningCup');checkState(s);}assert.equal(act(s,'eveningCup'),false);
 const beforeClose=structuredClone(s);go(s,'finishEvening');assert.equal(act(s,'finishEvening'),false);
 const r=report(s,1);assert.equal(r.revenue,5+5*demand);assert.equal(r.cost,2+2*demand);assert.equal(r.spoilage,2*(3-demand));assert.equal(r.profit,-3+5*demand);assert.equal(r.b.cash,7+5*demand);assert.equal(r.b.inventory,0);
 const p=statement(s,1,1);assert.equal(p.find(v=>v.key==='revenue').value,r.revenue);assert.equal(p.find(v=>v.key==='cost').value,r.cost);
 assert.equal(p.find(v=>v.key==='spoilage')?.value||0,r.spoilage);assert.equal(newConcepts(beforeClose,s).includes('spoilage'),demand<3);
 const reopen=restore(envelope(s));assert.deepEqual(reopen,s);assert.equal(reopen.rngState,rng);
 if(r.b.cash>=10){go(s,'buy');assert.equal(balances(s).inventory,10);assert.equal(report(s,1).spoilage,r.spoilage);}else{assert.equal(act(s,'buy'),false);go(s,'skip');}
 go(s,'next');const nextDay=replay(s);assert.deepEqual(nextDay.evening,s.evening);assert.equal(nextDay.rngState,rng);assert.equal(balances(nextDay).inventory,balances(s).inventory);
}
// Old saves remain loadable, including unfinished credit choices with no RNG fields.
const legacy=start(42);act(legacy,'serve');delete legacy.rngState;delete legacy.evening;
const oldLoaded=restore(envelope(legacy)),oldLoadedAgain=restore(envelope(legacy));
for(const v of [oldLoaded,oldLoadedAgain]){act(v,'refuse');act(v,'wait');}assert.deepEqual(oldLoaded.evening,oldLoadedAgain.evening);
const badEvent=envelope(oldLoaded);badEvent.state.evening.demand=99;assert.throws(()=>restore(badEvent));
console.log('All four evening outcomes, partial sales, spoilage accounting, stable draws across save/refresh/replay and old save compatibility verified.');
// Real timing rules, without the financial regression helper's fast-forwarding.
const {advanceWait,clockView}=await import('./dist/rhythm.js');
const timed=emptyStart(0);realAct(timed,'family');realAct(timed,'supplies');
assert.ok(timed.world.wait);assert.ok(timed.world.wait.totalMs<=5000);assert.equal(timed.world.minute,510);
const ledgerBefore=JSON.stringify(timed.tx),rngBefore=timed.rngState;
assert.equal(realAct(timed,'serve'),false);assert.equal(realAct(timed,'call'),true);assert.equal(realAct(timed,'call'),false);
advanceWait(timed,650);assert.ok(timed.world.minute>510&&timed.world.minute<600);
const resumed=restore(envelope(timed));assert.deepEqual(resumed.world,timed.world);
assert.equal(JSON.stringify(timed.tx),ledgerBefore);assert.equal(timed.rngState,rngBefore);
const skipped=structuredClone(timed);realAct(skipped,'arrive');while(!advanceWait(timed,500)){}realAct(timed,'arrive');assert.deepEqual(timed,skipped);assert.equal(timed.world.minute,600);assert.equal(timed.phase,'first');
assert.equal(realAct(timed,'arrive'),false);realAct(timed,'serve');assert.ok(timed.world.wait);realAct(timed,'arrive');assert.equal(clockView(timed).part,'正午');
realAct(timed,'refuse');assert.equal(clockView(timed).part,'下午');realAct(timed,'wait');const demandBefore=timed.evening.demand;realAct(timed,'arrive');assert.equal(clockView(timed).part,'傍晚');assert.equal(timed.evening.demand,demandBefore);
while(timed.evening.served<timed.evening.demand)realAct(timed,'eveningCup');realAct(timed,'finishEvening');realAct(timed,'skip');assert.equal(clockView(timed).part,'夜晚');
const oldDay=timed.world.day;realAct(timed,'review');realAct(timed,'next');assert.equal(timed.world.day,oldDay+1);assert.equal(clockView(timed).part,'早上');assert.equal(balances(timed).familyDebt,10);
const backward=replay(timed);assert.equal(backward.world.day,2);assert.equal(clockView(backward).part,'早上');
const legacyClock=emptyStart(0);delete legacyClock.world;assert.doesNotThrow(()=>restore(envelope(legacyClock)));assert.equal(realAct(legacyClock,'family'),true);assert.ok(legacyClock.world);
const brokenClock=envelope(timed);brokenClock.state.world.minute=NaN;assert.throws(()=>restore(brokenClock));
const brokenWait=envelope(resumed);brokenWait.state.world.wait.remainingMs=10000;assert.throws(()=>restore(brokenWait));
const skies=new Set([emptyStart(0).world.weather,emptyStart(256).world.weather]);assert.equal(skies.size,2);
console.log('Clock progression, short waits, single-use calling, safe arrival gates, fast-forward equivalence, resumable timers, weather and next-day reset verified.');

const {captureConcepts}=await import('./dist/concepts.js');
const reading=emptyStart(0),beforeReading=structuredClone(reading);realAct(reading,'family');captureConcepts(beforeReading,reading);
assert.ok(reading.pendingConcepts.keys.includes('familyDebt'));assert.deepEqual(restore(envelope(reading)).pendingConcepts,reading.pendingConcepts);
const badReading=envelope(reading);badReading.state.pendingConcepts.keys=['<script>'];assert.throws(()=>restore(badReading));
const reviewGame=start();for(const a of ['serve','deposit','skip'])act(reviewGame,a);
assert.equal(reviewGame.phase,'close1');assert.equal(realAct(reviewGame,'next'),false);const beforeReview=JSON.stringify(reviewGame.tx);
assert.equal(realAct(reviewGame,'review'),true);assert.equal(JSON.stringify(reviewGame.tx),beforeReview);assert.equal(restore(envelope(reviewGame)).flags.review1,true);assert.equal(realAct(reviewGame,'next'),true);
assert.equal(realAct(reviewGame,'review'),false);
console.log('Unread concept persistence, manual daily review gate and reviewed-day restoration verified.');
const {queueLesson,lessonEntries,submitEntries,finishLesson,reasoning,lessonTargets}=await import('./dist/journal.js');
const learner=emptyStart(0);let previous=structuredClone(learner);realAct(learner,'family');queueLesson(previous,learner);
assert.equal(learner.pendingLesson.editable.length,1);assert.equal(learner.pendingLesson.draft[0].account,'cash');assert.equal(learner.pendingLesson.draft[1].account,'familyDebt');assert.equal(learner.pendingLesson.draft[1].direction,'up');assert.equal(learner.pendingLesson.draft[1].amount,'');
const actualCash=balances(learner).cash;assert.equal(realAct(learner,'supplies'),false);assert.equal(finishLesson(learner),false);
for(let i=1;i<=3;i++){assert.equal(submitEntries(learner,learner.pendingLesson.draft).ok,false);assert.equal(learner.pendingLesson.attempts,i);assert.equal(balances(learner).cash,actualCash);}
assert.match(reasoning(learner),/借款不是销售收入/);assert.deepEqual(restore(envelope(learner)).pendingLesson,learner.pendingLesson);
assert.equal(submitEntries(learner,[...lessonEntries(learner)].reverse()).ok,true);assert.equal(learner.journalLog.length,1);assert.equal(submitEntries(learner,lessonTargets(learner)).ok,true);assert.equal(learner.journalLog.length,1);assert.equal(finishLesson(learner),true);assert.equal(balances(learner).cash,10);
function learn(s,a,n){if(s.world.wait)realAct(s,'arrive');const before=structuredClone(s);assert.equal(realAct(s,a,n),true);const queued=queueLesson(before,s);if(queued){assert.ok(s.pendingLesson.editable.length<=2);assert.equal(submitEntries(s,lessonTargets(s)).ok,true);assert.deepEqual(restore(envelope(s)).pendingLesson,s.pendingLesson);finishLesson(s);}return queued;}
learn(learner,'supplies');assert.equal(learn(learner,'serve'),true);assert.ok(learner.journalLog.at(-1).practiced.includes('revenue'));
learn(learner,'deposit');assert.equal(learner.journalLog.at(-1).practiced[0],'receivable');assert.equal(learn(learner,'buy'),false);assert.equal(realAct(learner,'review'),true);learn(learner,'next');
previous=structuredClone(learner);realAct(learner,'collect');queueLesson(previous,learner);assert.deepEqual(lessonEntries(learner),[{account:'cash',direction:'up',amount:12},{account:'receivable',direction:'down',amount:12}]);assert.match(reasoning(learner),/收入和利润都不再增加/);submitEntries(learner,lessonTargets(learner));finishLesson(learner);
learn(learner,'loan');learn(learner,'machine');learn(learner,'ready');learn(learner,'walk');assert.equal(learn(learner,'cup'),true);for(let i=0;i<4;i++)assert.equal(learn(learner,'cup'),false);
learn(learner,'close');assert.equal(learner.journalLog.at(-1).practiced[0],'depreciation');realAct(learner,'review');learn(learner,'next');assert.ok(learner.journalLog.at(-1).entries.some(e=>e.account==='interestExpense'));
previous=structuredClone(learner);realAct(learner,'repay');queueLesson(previous,learner);assert.ok(!lessonEntries(learner).some(e=>e.account==='interestExpense'));assert.match(reasoning(learner),/不会再确认一次费用/);submitEntries(learner,lessonTargets(learner));finishLesson(learner);assert.equal(balances(learner).cash,11);assert.deepEqual(restore(envelope(learner)),learner);
const invalidLesson=envelope(learner);invalidLesson.state.journalLog[0].entries[0].amount=999;assert.throws(()=>restore(invalidLesson));
console.log('Key blanks, prefilled entries, retry gates, saved attempts, answer order, repeat-sale consolidation and correct income/cost/collection/interest treatment verified.');

const {normalizeLesson}=await import('./dist/journal.js');
const older=emptyStart(0),olderBefore=structuredClone(older);realAct(older,'family');queueLesson(olderBefore,older);delete older.pendingLesson.inputMode;older.pendingLesson.draft[1]={account:'',direction:'',amount:'9'};older.pendingLesson.attempts=2;
const resumedAmount=restore(envelope(older));normalizeLesson(resumedAmount);assert.equal(resumedAmount.pendingLesson.draft[1].account,'familyDebt');assert.equal(resumedAmount.pendingLesson.draft[1].direction,'up');assert.equal(resumedAmount.pendingLesson.draft[1].amount,'9');assert.equal(resumedAmount.pendingLesson.attempts,2);assert.deepEqual(restore(envelope(resumedAmount)),resumedAmount);
console.log('Amount-only defaults and migration of earlier selector drafts preserve numbers and attempts.');
const {MATERIALS,RECIPE_COST,quote,suggestedCart,possibleCups,quantities,stockValue,validateStock,ensureStock}=await import('./dist/materials.js');
const {cents}=await import('./dist/currency.js');
assert.equal(RECIPE_COST,200);assert.equal(quote({lemon:200,tea:12,sugar:60,cup:4,straw:4}).cost,8);
const precise=emptyStart(0);act(precise,'family');const noTea={lemon:200,tea:9,sugar:60,cup:4,straw:4};const untouched=JSON.stringify(precise);assert.equal(act(precise,'supplies',noTea),false);assert.equal(JSON.stringify(precise),untouched);
const excess={lemon:201,tea:13,sugar:61,cup:5,straw:5};assert.equal(quote(excess).cost,8.48);assert.equal(act(precise,'supplies',excess),true);assert.equal(balances(precise).cash,1.52);assert.equal(precise.readyCups,4);assert.deepEqual(quantities(precise),{lemon:1,tea:1,sugar:1,cup:1,straw:1});assert.equal(stockValue(precise),848);validateStock(precise);assert.deepEqual(restore(envelope(precise)),precise);
act(precise,'serve');act(precise,'deposit');assert.equal(possibleCups(precise),0);assert.equal(quote(suggestedCart(precise,5)).cost,9.52);act(precise,'buy');assert.equal(possibleCups(precise),5);assert.equal(balances(precise).cash,0);assert.equal(stockValue(precise),1000);
act(precise,'next');act(precise,'collect');act(precise,'ready');act(precise,'walk');for(let i=0;i<3;i++)act(precise,'cup');act(precise,'close');assert.equal(stockValue(precise),400);assert.equal(precise.stockHistory[2].stockLots.reduce((n,l)=>n+l.quantity*MATERIALS[l.material].priceFen,0),400);act(precise,'next');assert.equal(quantities(precise).lemon,0);assert.equal(quantities(precise).cup,2);assert.equal(quantities(precise).straw,2);assert.equal(stockValue(precise),200);assert.equal(report(precise,3).spoilage,2);assert.equal(report(precise,3).cost,0);assert.equal(report(precise,3).revenue,0);assert.equal(balances(precise).cash,27);assert.deepEqual(restore(envelope(precise)),precise);
const tiny=emptyStart(0);act(tiny,'family');act(tiny,'supplies',{lemon:201,tea:12,sugar:60,cup:4,straw:4});act(tiny,'serve');act(tiny,'deposit');act(tiny,'skip');act(tiny,'next');act(tiny,'collect');act(tiny,'ready');act(tiny,'walk');act(tiny,'close');const tinyBefore=structuredClone(tiny);act(tiny,'next');assert.equal(report(tiny,3).spoilage,0.02);assert.equal(report(tiny,3).profit,-0.02);assert.equal(cents(balances(tiny).cash),2198);assert.equal(stockValue(tiny),0);queueLesson(tinyBefore,tiny);assert.equal(lessonEntries(tiny).find(v=>v.account==='spoilage').amount,0.02);assert.equal(submitEntries(tiny,lessonTargets(tiny)).ok,true);assert.deepEqual(restore(envelope(tiny)),tiny);
const oldMaterials=start(0);delete oldMaterials.stockLots;delete oldMaterials.readyCups;const oldResumed=restore(envelope(oldMaterials));ensureStock(oldResumed);assert.equal(oldResumed.readyCups,4);validateStock(oldResumed);
console.log('Recipe costing, under-purchase rejection, individual leftovers, expiry by lot, retained packaging, cent precision and legacy inventory migration verified.');
const combined=emptyStart(0);act(combined,'family');act(combined,'supplies',{lemon:201,tea:12,sugar:60,cup:4,straw:4});act(combined,'serve');act(combined,'deposit');act(combined,'skip');act(combined,'next');act(combined,'collect');act(combined,'loan');act(combined,'ready');act(combined,'walk');act(combined,'close');const combinedBefore=structuredClone(combined);act(combined,'next');assert.equal(report(combined,3).profit,-2.02);queueLesson(combinedBefore,combined);assert.equal(combined.pendingLesson.editable.length,2);assert.match(reasoning(combined),/过期原料/);assert.match(reasoning(combined),/借钱的代价/);submitEntries(combined,lessonTargets(combined));assert.deepEqual(restore(envelope(combined)),combined);finishLesson(combined);act(combined,'repay');assert.equal(balances(combined).cash,19.98);
console.log('Combined raw-material expiry and due-interest lesson reconciles to the cent.');
const {balanceSheet}=await import('./dist/balance-sheet.js');
const firstSheet=emptyStart(0);realAct(firstSheet,'family');
const sheetBlank=balanceSheet(firstSheet,1,{input:'<input data-entry="1">',value:'',animated:true,teaching:true});
assert.match(sheetBlank,/资产负债表/);assert.match(sheetBlank,/sheet-assets/);assert.match(sheetBlank,/sheet-sources/);assert.match(sheetBlank,/向父母借的钱/);assert.match(sheetBlank,/所有者权益/);assert.match(sheetBlank,/资产 = 负债 \+ 所有者权益/);assert.match(sheetBlank,/10 = 待填写 \+ 0/);assert.ok(!/[↑↓]/.test(sheetBlank));
assert.match(balanceSheet(firstSheet,1,{input:'<input>',value:'9',teaching:true}),/10 ≠ 9 \+ 0/);
assert.match(balanceSheet(firstSheet,1,{input:'<input>',value:'10',teaching:true}),/10 = 10 \+ 0/);
act(firstSheet,'supplies');act(firstSheet,'serve');const profitSheet=balanceSheet(firstSheet,1);assert.match(profitSheet,/累计利润/);assert.match(profitSheet,/13 = 10 \+ 3/);
const lossSheet=balanceSheet(precise,3);assert.match(lossSheet,/上日末/);assert.match(lossSheet,/29 = 10 \+ 19/);
console.log('Two-sided opening balance sheet, live balance equation, earned equity and historical comparisons verified.');
const {reportLayout}=await import('./dist/report-layout.js');
const inBook=emptyStart(0);act(inBook,'family');act(inBook,'supplies');act(inBook,'serve');const beforeCredit=structuredClone(inBook);act(inBook,'deposit');queueLesson(beforeCredit,inBook);
assert.equal(lessonTargets(inBook).find(v=>v.account==='receivable').amount,12);
const inserted=reportLayout(inBook,1,0,{fields:{receivable:'<input type="text" inputmode="decimal">'},previous:beforeCredit,revealNew:true});assert.match(inserted,/sheet-assets/);assert.match(inserted,/report-new row-enter/);assert.match(inserted,/应收账款<small class="row-added">新增/);assert.ok(inserted.indexOf('应收账款')<inserted.indexOf('sheet-sources'));assert.ok(!inserted.includes('type="number"'));
submitEntries(inBook,lessonTargets(inBook));finishLesson(inBook);act(inBook,'buy');act(inBook,'next');const beforeCollect=structuredClone(inBook);act(inBook,'collect');queueLesson(beforeCollect,inBook);
assert.equal(lessonEntries(inBook).find(v=>v.account==='receivable').amount,12);assert.equal(lessonTargets(inBook).find(v=>v.account==='receivable').amount,0);assert.equal(submitEntries(inBook,lessonEntries(inBook)).ok,false);assert.equal(submitEntries(inBook,lessonTargets(inBook)).ok,true);assert.deepEqual(restore(envelope(inBook)),inBook);
const priorExercise=structuredClone(inBook);priorExercise.pendingLesson.status='editing';priorExercise.pendingLesson.inputMode='amount';priorExercise.pendingLesson.draft=lessonEntries(priorExercise).map(v=>({...v,amount:String(v.amount)}));normalizeLesson(priorExercise);assert.equal(priorExercise.pendingLesson.draft.find(v=>v.account==='receivable').amount,'');assert.equal(priorExercise.pendingLesson.attempts,inBook.pendingLesson.attempts);
const reportRows=reportLayout(firstSheet,1,1,{previous:{...firstSheet,tx:firstSheet.tx.slice(0,2)},fields:{revenue:'<input type="text">',cost:'<input type="text">'},revealNew:true});assert.match(reportRows,/利润表/);assert.equal((reportRows.match(/<input/g)||[]).length,2);
console.log('In-report entry placement, newly inserted receivable row, zero ending balance, current-vs-change validation and migration verified.');
