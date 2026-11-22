import {gameLearningFixture} from './game-learning-test-helper.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {start,SAVE_KEY,question,balances,report} from './dist/demo/engine.js';
import {showTarget,reviewPendingReceipt} from './screen-test-helpers.mjs';

const width=Number(process.argv[2]||390),height=Number(process.argv[3]||844),store=new Map([[SAVE_KEY,JSON.stringify(start(99))]]);
const {window}=parseHTML(readFileSync('dist/index.html','utf8')),listeners=new Map();
Object.assign(globalThis,{window,document:window.document,Event:window.Event,requestAnimationFrame:fn=>fn(),setTimeout:()=>0,clearTimeout:()=>{},localStorage:{getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,String(value)),removeItem:key=>store.delete(key)}});
Object.defineProperty(window,'innerWidth',{value:width,writable:true,configurable:true});Object.defineProperty(window,'innerHeight',{value:height,writable:true,configurable:true});
window.visualViewport={width,height,offsetTop:0,scale:1,addEventListener:(event,fn)=>{if(!listeners.has(event))listeners.set(event,[]);listeners.get(event).push(fn);}};
window.HTMLElement.prototype.showModal=function(){this.open=true;};window.HTMLElement.prototype.close=function(){this.open=false;};
window.HTMLElement.prototype.focus=function(){document._focus=this;this.dispatchEvent(new Event('focusin',{bubbles:true}));};window.HTMLElement.prototype.blur=function(){document._focus=null;this.dispatchEvent(new Event('focusout',{bubbles:true}));};
window.HTMLElement.prototype.scrollIntoView=function(){throw Error('the game must navigate by pages, without scrollIntoView');};
Object.defineProperty(document,'activeElement',{get:()=>document._focus||document.body,configurable:true});
const {startGame}=await import('./dist/demo/game.js');startGame(gameLearningFixture);
const find=selector=>document.querySelector(selector),state=()=>JSON.parse(store.get(SAVE_KEY));
function click(selector){const target=find(selector);assert.ok(target,`missing ${selector} at ${state().stage}`);showTarget(target);assert.ok(!target.disabled);target.click();}
const action=name=>click(`[data-action="${name}"]`);
function readingUnchanged(open,close){const before=JSON.stringify(state());click(open);assert.ok(find('#reading').open);for(let guard=0;find('#reading [data-screen-next]')&&guard<100;guard++)click('#reading [data-screen-next]');assert.equal(JSON.stringify(state()),before);click(close);}
assert.ok(document.body.classList.contains('one-screen'));
assert.ok(find('.app-shell>#scene-actions'));
assert.equal(find('.site-footer'),null);
assert.equal(find('.screen-pages').querySelectorAll('.screen-page:not([hidden])').length,1);
assert.ok(find('#scene-actions [data-action="next"]').hidden,'the first transaction action waits for the story beats');
const initial=JSON.stringify(state()),copy=find('#play').textContent;
click('[data-screen-next]');assert.equal(JSON.stringify(state()),initial);click('[data-screen-back]');assert.equal(JSON.stringify(state()),initial);assert.equal(find('#play').textContent,copy,'paging does not lose or rewrite story text');
readingUnchanged('#viewbudget','#reading [data-close]');assert.ok(!find('#menu').open);assert.equal(document.querySelectorAll('#reading .screen-page').length,1,'the complete budget stays on one reader page');assert.equal(find('#reading .budget-gap').children.length,2);assert.doesNotMatch(find('#reading .budget-gap').textContent,/只有/);
readingUnchanged('#viewhistory','#reading [data-close]');assert.doesNotMatch(find('#reading-body').textContent,/午间客人|午后客人|下一位/);
click('#openbook');assert.match(find('#book-body').textContent,/第一笔零花钱/);assert.equal(find('#sheet-pager').children.length,0);click('#book [data-close]');

let resizeChecked=false,helpChecked=false,pendingTargetChecked=false,pauseNoticeChecked=false,books=0,pagesTurned=0;
function drain(){reviewPendingReceipt();
 for(let guard=0;find('#discovery').open&&guard<8;guard++){click('[data-discovery-reveal]');click('[data-discovery-keep]');}
 let p=state().pendingBook;if(!p)return;books++;
 if(!pauseNoticeChecked&&p.fields.length){
  pauseNoticeChecked=true;const journal=JSON.stringify(state().tx),id=p.id;
  click('#book .dialog-heading [data-close]');assert.ok(find('.book-pause-note'),'show the paused-draft reminder the first time');click('[data-resume-book]');
  click('#book .dialog-heading [data-close]');assert.equal(find('.book-pause-note'),null,'later pauses omit the repeated reminder');click('[data-resume-book]');assert.equal(state().pendingBook.id,id);assert.equal(JSON.stringify(state().tx),journal);
 }

 for(const page of p.pages){
  click(`[data-bookpage="${page}"]`);
  const all=[...document.querySelectorAll('[data-book-field]')],identity=new Map(all.map(input=>[input.id,input]));
  for(let guard=0;guard<100;guard++){
   for(const input of all.filter(input=>!input.closest('[hidden]'))){
    const [number,key]=input.dataset.bookField.split(':'),field=state().pendingBook.fields.find(f=>f.page===Number(number)&&f.key===key);input.value=String(field.target/100);input.dispatchEvent(new Event('input',{bubbles:true}));
    if(!resizeChecked){
     resizeChecked=true;input.focus();const before=JSON.stringify(state()),form=find('#book-form');window.visualViewport.height=340;window.visualViewport.offsetTop=40;for(const fn of listeners.get('resize')||[])fn();assert.strictEqual(find('#'+input.id),input);assert.strictEqual(find('#book-form'),form);assert.strictEqual(document.activeElement,input);assert.equal(JSON.stringify(state()),before);assert.ok(!input.closest('[hidden]'),'keyboard paging keeps the edited field visible');
     input.blur();window.visualViewport.height=height;window.visualViewport.offsetTop=0;for(const fn of listeners.get('resize')||[])fn();
    }
   }
   const next=find('[data-sheet-next]');if(!next||next.disabled)break;pagesTurned++;click('[data-sheet-next]');
  }
  for(const [id,input] of identity)assert.strictEqual(find('#'+id),input,'report page turns retain the actual input node');
  assert.ok(state().pendingBook.fields.filter(f=>f.page===page).every(f=>String(f.value).trim()),'every field is reachable through visible report pages');
 }
 if(!pendingTargetChecked&&p.fields.some(f=>f.page===2)){
  pendingTargetChecked=true;const f=p.fields.filter(f=>f.page===2).at(-1);click('[data-bookpage="2"]');const input=find(`#book-${f.page}-${f.key}`);showTarget(input);input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));
  window.visualViewport.height=340;for(const fn of listeners.get('resize')||[])fn();while(find('[data-sheet-back]')&&!find('[data-sheet-back]').disabled)click('[data-sheet-back]');
  assert.ok(input.closest('[hidden]'),'the pending amount is on a later report page in the short viewport');click('[data-bookpage="2"]');const located=find('#'+input.id);assert.ok(!located.closest('[hidden]'),'clicking a report name jumps directly to its pending amount');located.value=String(f.target/100);located.dispatchEvent(new Event('input',{bubbles:true}));window.visualViewport.height=height;for(const fn of listeners.get('resize')||[])fn();
 }
 if(!helpChecked&&p.fields.length){
  helpChecked=true;const f=p.fields[0];click(`[data-bookpage="${f.page}"]`);const input=find(`#book-${f.page}-${f.key}`);showTarget(input);input.value=String(Math.abs(f.target)/100+1);input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();window.visualViewport.height=340;for(const fn of listeners.get('resize')||[])fn();click('[data-book-check]');assert.strictEqual(find('#'+input.id),input,'wrong-value checks keep the focused input');const inline=input.closest('.book-input-cell').querySelector('.field-hint-trigger');assert.equal(inline.hidden,false);assert.ok(!inline.closest('[hidden]'),'the error action stays on the same visible page as the amount');const beforeHelp=JSON.stringify(state().tx);inline.click();assert.ok(find('#reading').open);assert.match(find('#reading-body').textContent,/12 元/);click('#reading [data-close]');assert.equal(JSON.stringify(state().tx),beforeHelp);input.focus();click('[data-book-check]');input.blur();window.visualViewport.height=height;for(const fn of listeners.get('resize')||[])fn();const help=find('.book-math-guide:not([hidden]) [data-field-help]');assert.ok(help);showTarget(help);help.click();assert.ok(find('#reading').open);assert.match(find('#reading-body').textContent,/12 元/);click('#reading [data-close]');const replacement=find(`#book-${f.page}-${f.key}`);replacement.value=String(f.target/100);replacement.dispatchEvent(new Event('input',{bubbles:true}));
 }
 readingUnchanged('[data-sheet-notes]','#reading [data-close]');
 if(p.fields.length)click('[data-book-check]');assert.ok(!p.fields.length||state().pendingBook.checked);
 for(const page of p.pages)click(`[data-bookpage="${page}"]`);click('[data-book-done]');
}
for(let guard=0;guard<220&&state().stage!=='daySummary';guard++){
 if(state().pendingBook){drain();continue;}
 const q=question(state());if(q){if(find('[data-action="learn"]'))action('learn');assert.ok(find('.question-context'),'question context stays beside the choices');click(`[data-action="pick"][data-value="${q.correct}"]`);action('answer');assert.equal(find('#play .answer-list'),null,'the explanation takes the place of the question choices');assert.match(find('#answer-feedback').textContent,new RegExp(q.explain.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));action('next');continue;}
 const actions={welcome:'next',budget:'next',pocket:'invest',parents:'borrow',stall:'buy-stall',stallbought:'next',supply:'buy-stock',idle:'skip-wait',walkin:'serve-cash',delivery:'next',betweenCustomers:'next',cashReceipt:'next',dayEnd:'next',review:'keep-stall'};
 action(actions[state().stage]);
 if(state().stage==='budget'){assert.equal(document.querySelectorAll('#play .screen-page').length,1,'the opening budget is a complete single page');assert.equal(find('.budget-card').querySelectorAll('.budget-row').length,4);assert.equal(find('.budget-gap').children.length,2);}
 assert.equal(find('#play .screen-pages').querySelectorAll('.screen-page:not([hidden])').length,1);
 assert.equal(document.querySelectorAll('#scene-actions .primary-button:not([hidden])').length,1);
}
assert.equal(state().stage,'daySummary');assert.equal(balances(state()).cash,6400);assert.equal(report(state()).profit,3600);assert.equal(balances(state()).loan,3200);assert.ok(resizeChecked&&helpChecked&&pendingTargetChecked&&pauseNoticeChecked);assert.ok(books>=7);if(width<=320)assert.ok(pagesTurned>0);
click('#endgame');const before=JSON.stringify(state());assert.ok(find('#confirm').open);click('#confirm [data-close]');assert.equal(JSON.stringify(state()),before,'a liquidation reminder does not end the game');
console.log(`One-screen ${width}×${height}: visible story/quiz/report paging, complete text and fields, unchanged finances, explanation replacement, retained inputs through keyboard resize, help and liquidation confirmation passed (${books} books, ${pagesTurned} sheet turns). DOM checks do not measure physical browser layout.`);
