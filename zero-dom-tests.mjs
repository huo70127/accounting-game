import {gameLearningFixture} from './game-learning-test-helper.mjs';
import {showTarget,reviewPendingReceipt} from './screen-test-helpers.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {v17Start as start,act,question,SAVE_KEY,balances,report,ownership} from './dist/demo/engine.js';
import {scenarios} from './demo-scenarios.mjs';
const mode=process.argv[2]||'half',config=scenarios[mode]||scenarios.half,initial=start(config.seed),store=new Map();
if(mode==='resume'){act(initial,'next');act(initial,'invest');initial.pendingBook.fields.find(f=>f.key==='cash').value='17';}
store.set(SAVE_KEY,JSON.stringify(initial));
const {window}=parseHTML(readFileSync('dist/index.html','utf8'));
Object.assign(globalThis,{window,document:window.document,Event:window.Event,localStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)},requestAnimationFrame:fn=>fn(),setTimeout:()=>0,clearTimeout:()=>{}});
window.HTMLElement.prototype.focus=function(){document._focused=this;};window.HTMLElement.prototype.scrollIntoView=function(){};window.HTMLElement.prototype.showModal=function(){this.open=true;};window.HTMLElement.prototype.close=function(){this.open=false;};
const {startGame}=await import('./dist/demo/game.js');startGame(gameLearningFixture);
const state=()=>JSON.parse(store.get(SAVE_KEY)),find=s=>document.querySelector(s);
function click(selector){const node=find(selector);assert.ok(node,`missing ${selector} at ${state().stage}`);assert.ok(!node.disabled,selector+' disabled');node.click();}
const action=name=>click(`[data-action="${name}"]`);
function answer(){if(find('[data-action="learn"]'))action('learn');const q=question(state());assert.ok(find('[data-action="pick"]'),'shared warmup is immediately available');const index=q.correct;click(`[data-action="pick"][data-value="${index}"]`);action('answer');assert.match(find('#answer-feedback').textContent,new RegExp(q.explain.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));action('next');}
let books=0;
function drain(){reviewPendingReceipt();const p=state().pendingBook;if(!p)return;books++;assert.ok(find('#book').open);const tx=JSON.stringify(state().tx),tabs=[...document.querySelectorAll('#book-tabs [data-bookpage]')].map(n=>Number(n.dataset.bookpage));
 if(['firstcash','loanquiz','fundingquiz'].includes(state().stage))assert.deepEqual(tabs,[0],'only the balance sheet has been introduced');
 if(['stallbought','inventory','payable'].includes(state().stage))assert.deepEqual(tabs,[0,2],'income statement is still absent');
 if(state().stage==='delivery')assert.deepEqual(tabs,[0,1,2]);
 if(books===1){const intro=find('.report-introduction');if(mode!=='resume')assert.ok(intro);const before=JSON.stringify(state());click('#book .term-label>.term-help');assert.ok(find('#glossary').open);click('#glossary [data-close]');assert.equal(JSON.stringify(state()),before);}
 if(p.fields.length){for(const page of p.pages){click(`[data-bookpage="${page}"]`);for(const field of [...document.querySelectorAll('[data-book-field]')]){assert.equal(field.getAttribute('placeholder'),null);assert.match(field.getAttribute('aria-label'),/金额/);const [n,key]=field.dataset.bookField.split(':'),expected=state().pendingBook.fields.find(f=>f.page===Number(n)&&f.key===key);field.value=(expected.target/100).toFixed(2);field.dispatchEvent(new Event('input',{bubbles:true}));}}
 click('[data-book-check]');assert.equal(state().pendingBook.checked,true);}
 for(const page of state().pendingBook.pages)click(`[data-bookpage="${page}"]`);click('[data-book-done]');assert.equal(state().pendingBook,null);assert.equal(JSON.stringify(state().tx),tx);}
assert.equal(find('[data-learning-mode]'),null);assert.match(find('#guide').textContent,/圆滚滚/);assert.match(find('#guide').textContent,/贼溜溜/);assert.doesNotMatch(document.body.textContent,/跨主题经营搭档|看见变化 · 亲手经营|陪你经营/);
if(mode==='resume'){assert.ok(find('#book').open);assert.equal(find('[data-book-field="0:cash"]').value,'17');const saved=JSON.stringify(state());click('#book [data-restart]');assert.ok(find('#confirm').open);assert.equal(JSON.stringify(state()),saved);click('#confirm [data-close]');assert.equal(find('[data-book-field="0:cash"]').value,'17');}
else{assert.equal(report(state()).assets,0);assert.ok(find('.empty-street'));click('#openbook');assert.equal(document.querySelectorAll('[data-bookpage]').length,0);assert.match(find('#book-body').textContent,/第一笔零花钱/);click('#book [data-close]');}
if(mode==='early'){click('#endgame');assert.equal(state().stage,'welcome');click('#confirm [data-close]');click('#endgame');click('[data-confirm]');action('quick');assert.equal(state().stage,'results');assert.equal(report(state()).profit,0);assert.equal(balances(state()).cash,0);assert.equal(state().audioMilestones.includes('results'),true);}
else{
 for(let guard=0;guard<210&&state().stage!=='results';guard++){const current=state();if(current.pendingBook){drain();continue;}if(question(current)){answer();continue;}switch(current.stage){
  case'welcome':action('next');break;case'pocket':action('invest');break;case'parents':action('borrow');break;case'friend':action('partner');break;case'stall':action('buy-stall');break;case'stallbought':action('next');break;case'supply':action('buy-stock');break;
  case'order':click(`[data-action="select"][data-value="${config.choice}"]`);action('sell');break;case'rejected':action('wait');break;case'waiting':action('reveal');break;case'backup':action('serveBackup');break;case'delivery':action('next');break;
  case'payment':{const b=balances(current);assert.match(find('#play').textContent,/24/);if(b.cash>=b.payable)action('pay');else if(b.receivable&&!current.earlyRequest)action('rescue');else if(b.inventory)action('clear');else{click('[data-failure]');click('[data-confirm]');}break;}
  case'collect':action('collect');break;case'late':action('waitLate');break;case'review':action('open-liquidation');click('[data-confirm]');break;case'liquidation':action('settle');break;default:throw Error(current.stage);
 }}
 if(state().pendingBook)drain();assert.equal(state().stage,'results');assert.equal(ownership(state()).percent,75);assert.equal(state().liquidation.step,5);assert.match(find('#play').textContent,/持股 75%|尚未还清/);if(mode==='failure'){assert.equal(balances(state()).loan,1200);assert.match(find('#play').textContent,/暂不分配资金/);}else{assert.equal(balances(state()).loan,0);assert.equal(balances(state()).payable,0);}if(['half','cash','credit','late','resume'].includes(mode)){assert.equal(balances(state()).cash,4800);assert.match(find('#play').textContent,/你可拿回 36 元，朋友可拿回 12 元/);}
}
click('[data-openbook="0"]');for(const page of [0,1,2])click(`[data-bookpage="${page}"]`);click('#book [data-close]');
if(mode==='half'){const seed=state().seed,setup=state().tx.filter(t=>['opening','owner-money','parent-loan','friend-money','stall-purchase','first-stock'].includes(t.id));click('[data-replay]');click('[data-confirm]');assert.equal(state().stage,'order');assert.equal(state().seed,seed);assert.deepEqual(state().tx,setup);assert.equal(balances(state()).loan,2000);assert.equal(balances(state()).cash,2000);}
if(mode==='resume'){click('[data-restart]');click('[data-confirm]');assert.equal(state().stage,'welcome');assert.equal(report(state()).assets,0);assert.equal(balances(state()).loan,0);}
console.log(`Zero DOM ${mode}: ${books} books, no level selector, small inline blanks/help, progressive statement discovery, real startup actions, debt/ownership settlement and replay passed.`);
