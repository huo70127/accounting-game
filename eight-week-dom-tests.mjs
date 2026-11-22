import {gameLearningFixture} from './game-learning-test-helper.mjs';
import {recordAssessment,ASSESSMENT_QUESTIONS} from './dist/demo/assessment.js';
import {tradingTestClock} from './test-trading-clock.mjs';
const tradingClock=tradingTestClock();
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {play} from './eight-week-test-helpers.mjs';
import {SAVE_KEY,question,report,migrate} from './dist/demo/engine.js';
import {showTarget,reviewPendingReceipt} from './screen-test-helpers.mjs';
const mode=process.argv[2]||'keep',width=Number(process.argv[3])||390,height=Number(process.argv[4])||844;
const initial=play(22,{stopAt:s=>s.stage==='summerPartner'});for(let i=0;i<10;i++)recordAssessment(initial,'pre',i,i<4?ASSESSMENT_QUESTIONS[i].correct:3);const store=new Map([[SAVE_KEY,JSON.stringify(initial)]]);
const {window}=parseHTML(readFileSync('dist/index.html','utf8'));
Object.assign(globalThis,{window,document:window.document,Event:window.Event,requestAnimationFrame:fn=>fn(),setTimeout:tradingClock.schedule,clearTimeout:tradingClock.cancel,localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}});
Object.defineProperty(window,'innerWidth',{value:width,writable:true,configurable:true});Object.defineProperty(window,'innerHeight',{value:height,writable:true,configurable:true});window.visualViewport={width,height,offsetTop:0,scale:1,addEventListener(){}};
window.HTMLElement.prototype.focus=function(){document._focus=this;};window.HTMLElement.prototype.blur=function(){document._focus=null;};Object.defineProperty(document,'activeElement',{get:()=>document._focus||document.body});window.HTMLElement.prototype.scrollIntoView=function(){};
if(mode!=='fallback'){window.HTMLElement.prototype.showModal=function(){this.open=true;};window.HTMLElement.prototype.close=function(){this.open=false;};}
const {startGame}=await import('./dist/demo/game.js');startGame(gameLearningFixture);
const state=()=>JSON.parse(store.get(SAVE_KEY)),find=s=>document.querySelector(s);
function click(selector){if(selector.includes('skip-day')){assert.equal(document.querySelector('[data-action="skip-day"]'),null,'fast-forward is not exposed to players');tradingClock.finish(state);return;}const button=find(selector);assert.ok(button,`${state().stage}: missing ${selector}`);showTarget(button);assert.ok(!button.disabled,`${selector} disabled`);button.click();}
const action=(name,value)=>click(`[data-action="${name}"]${value===undefined?'':`[data-value="${value}"]`}`);
let filled=0,answered=0;
function book(){
 reviewPendingReceipt();
 for(let i=0;find('#discovery').open&&i<8;i++){click('[data-discovery-reveal]');click('[data-discovery-keep]');}
 let s=state();if(!s.pendingBook)return;
 if(!find('#book').open)click('#openbook');
 if(!s.pendingBook.checked){const tx=JSON.stringify(s.tx),answers=JSON.stringify(s.answers),stage=s.stage,day=s.day;click('[data-test-fill]');s=state();filled++;assert.equal(JSON.stringify(s.tx),tx);assert.equal(JSON.stringify(s.answers),answers);assert.equal(s.stage,stage);assert.equal(s.day,day);assert.ok(s.pendingBook.checked);assert.equal(find('[data-test-fill]'),null);}
 for(const page of state().pendingBook.pages)click(`[data-bookpage="${page}"]`);
 click('[data-book-done]');
}
for(let guard=0;guard<1100;guard++){
 const s=state();assert.deepEqual(migrate(s),s);assert.equal(report(s).assets,report(s).liabilities+report(s).equity);
 if(s.pendingBook){book();continue;}
 if(['courseSummary','results'].includes(s.stage))break;
 const q=question(s);if(q){if(!s.lessonsSeen[s.stage])action('learn');const current=question(state());assert.ok(find(`[data-action="pick"][data-value="${current.correct}"]`));action('pick',current.correct);action('answer');answered++;assert.ok(find('#answer-feedback'));action('next');continue;}
 if(s.stage==='summerClosing'&&mode==='liquidate'){action('open-liquidation');assert.ok(find('#confirm').open);assert.equal(state().stage,'summerClosing');assert.match(find('#confirm-body').textContent,/确认/);click('[data-confirm]');continue;}
 const actions={summerPartner:'summer-partner',summerSchedule:'summer-schedule',summerNight:'summer-night',summerPayroll:'summer-payroll',summerParentDue:'summer-parent-pay',summerClosing:'summer-keep',summerDistribution:'summer-dividend',weekStart:'week-open',weekSummary:s.course.week<8?'next-week':'keep-course',dailyOpen:'daily-trade',dailyReady:'daily-trade',dailyTrading:'skip-day',dailySold:'daily-close',weekRest:'week-rest-close',weekCollect:'course-collect',liquidation:'settle'};
 const value={summerPartner:'yes',summerSchedule:'hire',summerNight:'yes',summerDistribution:10000,liquidation:s.liquidation?.step}[s.stage];
 assert.ok(actions[s.stage],s.stage);action(actions[s.stage],value);
}
const result=state();assert.equal(result.stage,mode==='liquidate'?'results':'courseSummary');assert.ok(filled>=4);assert.ok(answered>=18);assert.match(find('#chapter-title').textContent,/8 \/ 8/);assert.match(find('#play').textContent,/八周|净利润/);if(mode==='liquidate'){assert.equal(report(result).assets,0);assert.match(find('#play').textContent,/实际收到/);}else assert.match(find('#play').textContent,/继续保留/);
console.log(`Eight-week DOM ${mode} ${width}×${height}: ${filled} fill-only actions, ${answered} manually answered questions, all weeks/choices/report pages and final ${result.stage} passed.`);
