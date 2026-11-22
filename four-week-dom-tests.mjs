import {gameLearningFixture} from './game-learning-test-helper.mjs';
import {tradingTestClock} from './test-trading-clock.mjs';
const tradingClock=tradingTestClock();
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {start,SAVE_KEY,question,balances,report,migrate} from './dist/demo/engine.js';
import {MATERIALS,quote,possibleCups,stockValue} from './dist/demo/procurement.js';
import {dueAmount} from './dist/demo/course.js';
import {showTarget,reviewPendingReceipt} from './screen-test-helpers.mjs';

const mode=process.argv[2]||'steady',risk=['rescue','failure'].includes(mode),seed=mode==='failure'?16:0,store=new Map([[SAVE_KEY,JSON.stringify(start(seed,4))]]),listeners=new Map();
const {window}=parseHTML(readFileSync('dist/index.html','utf8'));
Object.assign(globalThis,{window,document:window.document,Event:window.Event,requestAnimationFrame:fn=>fn(),setTimeout:tradingClock.schedule,clearTimeout:tradingClock.cancel,localStorage:{getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)}});
Object.defineProperty(window,'innerWidth',{value:390,writable:true,configurable:true});Object.defineProperty(window,'innerHeight',{value:844,writable:true,configurable:true});
window.visualViewport={width:390,height:844,offsetTop:0,scale:1,addEventListener:(type,fn)=>{if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);}};
window.HTMLElement.prototype.focus=function(){document._focus=this;this.dispatchEvent(new Event('focusin',{bubbles:true}));};window.HTMLElement.prototype.blur=function(){document._focus=null;this.dispatchEvent(new Event('focusout',{bubbles:true}));};Object.defineProperty(document,'activeElement',{get:()=>document._focus||document.body});
if(mode!=='fallback'){window.HTMLElement.prototype.showModal=function(){this.open=true;};window.HTMLElement.prototype.close=function(){this.open=false;};}window.HTMLElement.prototype.scrollIntoView=function(){};
const {startGame}=await import('./dist/demo/game.js');startGame(gameLearningFixture);
const state=()=>JSON.parse(store.get(SAVE_KEY)),find=selector=>document.querySelector(selector);
function click(selector){if(selector.includes('skip-day')){assert.equal(document.querySelector('[data-action="skip-day"]'),null,'fast-forward is not exposed to players');tradingClock.finish(state);return;}const target=find(selector);assert.ok(target,`${state().stage} missing ${selector}`);showTarget(target);assert.ok(!target.disabled,`${selector} disabled`);target.click();}
const action=(name,value)=>click(`[data-action="${name}"]${value===undefined?'':`[data-value="${value}"]`}`);
function input(node,value){node.value=value;node.dispatchEvent(new Event('input',{bubbles:true}));}
function revealIngredient(key){const row=find(`[data-ingredient-row="${key}"]`);for(let guard=0;row.hidden&&guard<8;guard++){const rows=[...row.parentNode.children],index=rows.indexOf(row),visible=rows.findIndex(n=>!n.hidden);click(`[data-purchase-turn="${index>visible?1:-1}"]`);}assert.equal(row.hidden,false);}
let wrongTested=false,purchases=0,keyboardTested=false,manualRoutine=false,rainDays=0;
function book(){reviewPendingReceipt();
 for(let guard=0;find('#discovery').open&&guard<8;guard++){click('[data-discovery-reveal]');click('[data-discovery-keep]');}
 const p=state().pendingBook;if(!p)return;
 if(p.automatic){if(p.preview){click('#openbook');}assert.equal(p.checked,true);assert.equal(document.querySelectorAll('#book [data-book-field]').length,0);assert.ok(!find('#book [data-book-check]'));assert.match(find('#book-caption').textContent,/已经替你记好了|今日净利润/);assert.ok(find('#book .report-row-enter, #book .report-row-pulse'),'automatic changes still animate');const facts=JSON.stringify(state().tx);click('[data-book-done]');assert.equal(state().pendingBook,null);assert.equal(JSON.stringify(state().tx),facts);return;}
 if(!wrongTested&&p.fields.length>=2){wrongTested=true;const f=p.fields[0];click(`[data-bookpage="${f.page}"]`);const node=find(`#book-${f.page}-${f.key}`);showTarget(node);input(node,String(f.target/100+1));const facts=JSON.stringify(state().tx);click('[data-book-check]');assert.equal(state().pendingBook.reminder,null);assert.equal(state().pendingBook.attempts,1);assert.match(find('#book-alert').textContent,/需要修改/);assert.equal(find('#book-alert').getAttribute('role'),'alert');assert.equal(state().pendingBook.fields[1].value,'');assert.equal(JSON.stringify(state().tx),facts);click('[data-book-check]');assert.ok(find('.book-math-guide:not([hidden])'));input(find(`#book-${f.page}-${f.key}`),String(f.target/100));click('[data-book-check]');assert.ok(state().pendingBook.reminder);assert.equal(find('#book-alert').getAttribute('role'),'status');assert.equal(state().pendingBook.attempts,2);}
 for(const page of p.pages){click(`[data-bookpage="${page}"]`);for(const node of [...document.querySelectorAll('[data-book-field]')]){showTarget(node);const [number,key]=node.dataset.bookField.split(':'),f=state().pendingBook.fields.find(f=>f.page===Number(number)&&f.key===key);input(node,String(f.target/100));}}
 if(p.fields.length)click('[data-book-check]');assert.ok(!p.fields.length||state().pendingBook.checked);for(const page of p.pages)click(`[data-bookpage="${page}"]`);click('[data-book-done]');
}
function purchase(){
 purchases++;action('open-procurement');assert.ok(find('#purchase').open);assert.equal(document.querySelectorAll('[data-purchase-field]').length,5);
 if(purchases===1){
  assert.match(find('#purchase').textContent,/糖浆/);assert.match(find('#purchase').textContent,/塑料杯/);
  const before=JSON.stringify(state().tx);revealIngredient('lemon');click('[data-ingredient="lemon"][data-step="50"]');const remembered=find('#ingredient-lemon').value;click('[data-close="purchase"]');assert.equal(JSON.stringify(state().tx),before);action('open-procurement');assert.equal(find('#ingredient-lemon').value,remembered,'cart edits survive closing before payment');
  click('[data-purchase-reset]');revealIngredient('lemon');const node=find('#ingredient-lemon');input(node,'100000');assert.equal(find('#confirm-purchase').disabled,true);assert.equal(JSON.stringify(state().tx),before);input(node,'600');node.focus();const exact=node,revision=state().revision;window.visualViewport.height=350;for(const fn of listeners.get('resize')||[])fn();assert.strictEqual(find('#ingredient-lemon'),exact);assert.strictEqual(document.activeElement,exact);assert.ok(!exact.closest('[hidden]'));assert.equal(state().revision,revision);assert.equal(find('#purchase [data-dismiss-keyboard]').hidden,false);click('#purchase [data-dismiss-keyboard]');window.visualViewport.height=844;for(const fn of listeners.get('resize')||[])fn();keyboardTested=true;
  // Buy one additional complete cup's ingredients; they must remain after 12 sales.
  for(const [key,m] of Object.entries(MATERIALS)){revealIngredient(key);click(`[data-ingredient="${key}"][data-step="${m.step}"]`);}
 }else{click(`[data-payment="${mode==='steady'?'cash':'credit'}"]`);if(risk&&state().course.week===3){for(const [key,m] of Object.entries(MATERIALS)){revealIngredient(key);input(find('#ingredient-'+key),String((mode==='rescue'?290:300)*m.recipe));}}}
 const cart=state().course.cart,q=quote(cart),prior=balances(state()),beforeCount=state().tx.length,payment=state().course.week===1||state().course.payment==='cash'?1:state().course.payment==='half'?.5:0,paid=Math.ceil(q.cost*payment);
 click('[data-confirm-purchase]');assert.equal(find('#purchase').open,false);const after=balances(state());assert.equal(after.cash,prior.cash-paid);const rawLoss=state().tx.slice(beforeCount).filter(t=>t.rawHandling).reduce((n,t)=>n+t.loss,0);assert.equal(after.inventory,prior.inventory+q.cost-rawLoss);assert.equal(after.payable,prior.payable+q.cost-paid);assert.equal(stockValue(state()),after.inventory);
}
assert.match(find('.brand').textContent,/手打柠檬茶/);assert.ok(find('link[href="demo/course.css"]'));
let stop=false;for(let guard=0;guard<420&&!stop;guard++){
 const s=state();assert.deepEqual(migrate(s),s);assert.equal(report(s).assets,report(s).liabilities+report(s).equity);
 if(s.pendingBook){book();continue;}
 if(s.stage==='results'||s.stage==='courseSummary'){stop=true;break;}
 if(question(s)){if(find('[data-action="learn"]'))action('learn');const q=question(state());action('pick',q.correct);action('answer');assert.ok(find('#answer-feedback'));action('next');continue;}
 if(s.stage==='rainDay'){rainDays++;assert.match(find('#play').textContent,/今天停摊|继续歇着|第三天/);assert.match(find('#play').textContent,/0 杯/);assert.match(find('#play').textContent,/0 元/);const journal=JSON.stringify(s.tx),cash=balances(s).cash;action('rain-close');assert.equal(JSON.stringify(state().tx),journal,'rainy closures do not buy stock, sell tea or post losses');assert.equal(balances(state()).cash,cash);continue;}
 if(['supply','weekPurchase'].includes(s.stage)){purchase();continue;}
 if(s.stage==='weekOrder'){action('course-order-select',risk?0:100);action('course-sell');continue;}
 if(s.stage==='weekEquipment'){action('course-equipment',mode==='steady'?'keep':'loan');continue;}
 if(s.stage==='weekOffer'){assert.match(find('#play').textContent,/每杯 4 元/);assert.doesNotMatch(find('#play').textContent,/每杯 6 元|周五付款/);action('course-offer','bulk');continue;}
 if(s.stage==='dailyOpen'){if(mode==='steady'&&!manualRoutine){manualRoutine=true;action('open-procurement');assert.equal(document.querySelectorAll('#purchase [data-payment]').length,0);const q=quote(state().course.cart),prior=balances(state());click('[data-confirm-purchase]');assert.equal(state().stage,'dailyReady');assert.equal(balances(state()).cash,prior.cash-q.cost);continue;}if(risk){action('open-procurement');for(const key of Object.keys(MATERIALS)){revealIngredient(key);input(find('#ingredient-'+key),'0');}click('[data-close="purchase"]');}action('daily-trade');continue;}
 if(['weekBills','weekLoan'].includes(s.stage)&&balances(s).cash<dueAmount(s)){
  if(mode!=='failure'&&s.course.contracts.some(v=>v.balance&&!v.advanceTried)){action('course-advance');continue;}
  if(mode!=='failure'&&balances(s).inventory){action('course-clear');continue;}
  click('[data-course-failure]');assert.ok(find('#confirm').open);assert.equal(state().stage,s.stage);click('[data-confirm]');continue;
 }
 const actions={rainDay:'rain-close',weekRest:'week-rest-close',dailyTrading:'skip-day',dailyReady:'daily-trade',dailySold:'daily-close',welcome:'next',budget:'next',pocket:'invest',parents:'borrow',stall:'buy-stall',stallbought:'next',idle:'skip-wait',walkin:'serve-cash',delivery:'next',betweenCustomers:'next',cashReceipt:'next',dayEnd:'next',stockout:'next',review:'keep-stall',daySummary:'next-week',weekStart:'week-open',weekRejected:'course-wait',weekSale:'course-close',weekBills:'course-pay-supplier',weekLoan:'course-pay-loan',weekCollect:'course-collect',weekSummary:s.course.week<4?'next-week':'keep-course',liquidation:'settle'};
 action(actions[s.stage],s.stage==='liquidation'?s.liquidation.step:undefined);
}
if(mode==='fallback'){assert.ok(find('dialog.fallback-dialog'));assert.equal(document.querySelectorAll('dialog[open]').length,0);}
assert.ok(stop);assert.ok(wrongTested&&keyboardTested);if(mode==='steady')assert.ok(manualRoutine);assert.equal(purchases,3);
if(mode==='failure'){assert.equal(state().stage,'results');assert.equal(state().liquidation.reason,'failure');}
else{assert.equal(state().stage,'courseSummary');assert.equal(state().course.summaries.length,4);assert.deepEqual(state().course.daily.records.map(v=>v.day),Array.from({length:28},(_,i)=>i+3));assert.match(find('#card-title').textContent,mode==='steady'?/小摊续营/:/扩张成功/);assert.equal(balances(state()).payable,0);assert.equal(balances(state()).interestPayable,0);if(mode!=='steady')assert.ok(state().tx.some(t=>t.kind==='sale'&&t.quantity>12));if(mode==='rescue')assert.ok(state().tx.some(t=>t.id.endsWith('-advance')));click('[data-openbook="0"]');assert.equal(find('#book').open,true);click('#book [data-close]');}
assert.equal(rainDays,3);const spoilage=state().tx.filter(t=>t.kind==='spoilage');assert.equal(spoilage.length,1);assert.equal(spoilage[0].loss%100,0);assert.equal(spoilage[0].id,'w3-rain-spoilage');assert.equal(state().tx.filter(t=>t.id==='first-stock').length,1);assert.equal(state().course.week,4);
console.log(`Four-week DOM ${mode}: explicit daily flow, cash bulk pricing, animated auto-filled reports, editable five-item recipe cart, retained unpaid drafts, overspend blocking, keyboard / focus preservation, actual costs and stock, immediate wrong-value vs missing navigation, probability paths, due-payment rescue / failure and four-week completion passed. Device geometry still needs real-browser testing.`);
