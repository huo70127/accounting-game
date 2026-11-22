import {gameLearningFixture} from './game-learning-test-helper.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {SAVE_KEY,act,balances,report} from './dist/demo/engine.js';
import {prepared} from './trading-test-helpers.mjs';
import {showTarget} from './screen-test-helpers.mjs';

const mode=process.argv[2]||'live',initial=prepared(0,mode==='receipt'?'walkin':'dailyOpen');
if(mode==='resume'){act(initial,'daily-trade');act(initial,'advance-day',initial.course.daily.shift.events[0].minute);}
const store=new Map([[SAVE_KEY,JSON.stringify(initial)]]),jobs=new Map();let sequence=0,now=1000;
const {window}=parseHTML(readFileSync('dist/index.html','utf8'));
Object.assign(globalThis,{window,document:window.document,Event:window.Event,requestAnimationFrame:fn=>fn(),setTimeout:(fn,ms)=>{jobs.set(++sequence,{fn,ms});return sequence;},clearTimeout:id=>jobs.delete(id),localStorage:{getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)}});
Date.now=()=>now;
Object.defineProperty(window,'innerWidth',{value:390,writable:true});Object.defineProperty(window,'innerHeight',{value:844,writable:true});Object.defineProperty(document,'hidden',{value:false,writable:true,configurable:true});
window.visualViewport={width:390,height:844,offsetTop:0,scale:1,addEventListener(){}};
window.HTMLElement.prototype.showModal=function(){this.open=true;};window.HTMLElement.prototype.close=function(){this.open=false;};window.HTMLElement.prototype.focus=function(){document._focus=this;};window.HTMLElement.prototype.blur=function(){document._focus=null;};Object.defineProperty(document,'activeElement',{get:()=>document._focus||document.body});window.HTMLElement.prototype.scrollIntoView=function(){};
const {startGame}=await import('./dist/demo/game.js');startGame(gameLearningFixture);
const find=selector=>document.querySelector(selector),state=()=>JSON.parse(store.get(SAVE_KEY)),frame=()=>{const entry=[...jobs].find(([,v])=>v.ms===100);assert.ok(entry,'one trading frame is scheduled');const [id,{fn}]=entry;jobs.delete(id);now+=100;fn();};
function click(selector){const node=find(selector);assert.ok(node,selector);showTarget(node);assert.ok(!node.disabled);node.click();}
if(mode==='receipt'){
 click('[data-action="serve-cash"]');assert.equal(!!find('#book').open,false);assert.equal(!!find('#discovery').open,false);assert.ok(find('.sale-confirmation'));assert.match(find('.sale-price-equation').textContent,/2 杯.*5 元.*10 元/);assert.match(find('.sale-confirmation').textContent,/实际收到.*10 元/);assert.equal(state().pendingBook.preview,true);const journal=JSON.stringify(state().tx);
 click('[data-action="receipt-review"]');for(let guard=0;find('#discovery').open&&guard<8;guard++){click('[data-discovery-reveal]');click('[data-discovery-keep]');}
 assert.equal(find('#book').open,true);assert.match(find('#book-caption').textContent,/2 杯.*5.*10.*实收 10/);assert.equal(JSON.stringify(state().tx),journal);console.log('Sale DOM: quantity, unit price, total and actual cash are readable before any report/discovery opens; explicit review preserves facts and pins the receipt above the fields.');
}else{
 if(mode==='live')click('[data-action="daily-trade"]');else{assert.equal(state().course.daily.shift.paused,true);assert.equal([...jobs.values()].filter(v=>v.ms===100).length,0);click('[data-action="pause-day"]');}
 assert.equal(state().stage,'dailyTrading');assert.match(find('#card-title').textContent,/第 2 天/);assert.ok(find('[data-trading-time]'));assert.equal(!!find('#book').open,false);assert.equal(find('[data-screen-next]'),null,'live cash and clock stay on one visible panel');
 const beforeCash=balances(state()).cash,firstTime=find('[data-trading-time]').textContent;let firstSale=state().course.daily.shift.next;
 for(let guard=0;state().course.daily.shift.next===firstSale&&guard<100;guard++)frame();
 assert.notEqual(find('[data-trading-time]').textContent,firstTime);assert.ok(balances(state()).cash>beforeCash);assert.equal(Number(find('[data-trading-cash]').textContent),balances(state()).cash/100);assert.equal(Number(find('[data-trading-profit]').textContent),report(state()).profit/100);assert.ok(find('[data-trading-stage]').classList.contains('sale-tick'));assert.match(find('[data-live-sale]').textContent,/卖出.*收到/);assert.equal(!!find('#book').open,false);assert.equal(state().pendingBook,null);
 // Buttons keep their current revision while the clock moves.
 click('[data-action="pause-day"]');assert.equal(state().course.daily.shift.paused,true);assert.equal([...jobs.values()].filter(v=>v.ms===100).length,0);const pausedFacts=JSON.stringify(state().tx);click('#openbook');assert.equal(find('#book').open,true);assert.equal(find('#book [data-book-field]'),null);click('#book [data-close]');assert.equal(JSON.stringify(state().tx),pausedFacts);click('[data-action="pause-day"]');
 const stale=[...jobs.values()].find(v=>v.ms===100).fn;document.hidden=true;document.dispatchEvent(new Event('visibilitychange'));const hiddenState=JSON.stringify(state());stale();assert.equal(JSON.stringify(state()),hiddenState);document.hidden=false;document.dispatchEvent(new Event('visibilitychange'));assert.equal(state().course.daily.shift.paused,true);click('[data-action="pause-day"]');
 for(let guard=0;state().stage==='dailyTrading'&&guard<120;guard++)frame();
 assert.equal(state().stage,'dailySold');assert.equal(!!find('#book').open,false);assert.equal(state().pendingBook.preview,true);assert.match(find('#card-title').textContent,/第 2 天.*收摊/);assert.match(find('#play').textContent,/今天一共卖出/);assert.equal([...jobs.values()].filter(v=>v.ms===100).length,0);
 const facts=JSON.stringify(state().tx);click('#openbook');assert.equal(find('#book').open,true);assert.equal(find('#book [data-book-field]'),null);assert.ok(find('#book .report-row-enter,#book .report-row-pulse'));click('#book [data-close]');click('[data-action="daily-close"]');assert.equal(state().day,5);assert.equal(state().stage,'dailyOpen');assert.equal(JSON.stringify(state().tx),facts,'closing the day never sells the same cups twice');
 console.log(`Trading DOM ${mode}: large day/time, live cash and profit, cup/coin feedback, readable receipts, explicit reports, current action revisions, pause, background/reload resume and next-day gating passed. Real-browser geometry and listening remain pending.`);
}
