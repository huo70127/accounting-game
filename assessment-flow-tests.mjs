import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {ASSESSMENT_SAVE_KEY,ASSESSMENT_QUESTIONS,assessmentFor,recordAssessment,assessmentScore,loadAssessment} from './dist/demo/assessment.js';
import {start,SAVE_KEY} from './dist/demo/engine.js';
import {play} from './eight-week-test-helpers.mjs';
const mode=process.argv[2]||'fresh',post=['post','post-resume','complete'].includes(mode),map=new Map(),holder={};
const baseline=assessmentFor(holder);
if(post){for(let i=0;i<10;i++)recordAssessment(holder,'pre',i,i<4?ASSESSMENT_QUESTIONS[i].correct:3);baseline.entered=true;if(mode==='post-resume')for(let i=0;i<2;i++)recordAssessment(holder,'post',i,ASSESSMENT_QUESTIONS[i].correct);if(mode==='complete')for(let i=0;i<10;i++)recordAssessment(holder,'post',i,ASSESSMENT_QUESTIONS[i].correct);map.set(SAVE_KEY,JSON.stringify(play()));map.set(ASSESSMENT_SAVE_KEY,JSON.stringify(baseline));}
if(mode==='resume'){recordAssessment(holder,'pre',0,ASSESSMENT_QUESTIONS[0].correct);recordAssessment(holder,'pre',1,ASSESSMENT_QUESTIONS[1].correct);map.set(ASSESSMENT_SAVE_KEY,JSON.stringify(baseline));}
if(mode==='old-save'){const old=start(22);old.assessment={version:1,pre:{answers:Array(10).fill(0),done:true},post:{answers:[],done:false}};map.set(SAVE_KEY,JSON.stringify(old));}
const beforeGame=map.get(SAVE_KEY),{window}=parseHTML(readFileSync('dist/index.html','utf8'));
let reloads=0;
Object.assign(globalThis,{window,document:window.document,Event:window.Event,requestAnimationFrame:f=>f(),setTimeout:()=>0,clearTimeout(){},location:{reload(){reloads++;}},localStorage:{getItem:k=>map.get(k)||null,setItem:(k,v)=>{if(mode==='storage-error')throw Error('storage unavailable');map.set(k,String(v));},removeItem:k=>map.delete(k)}});
Object.defineProperty(window,'innerWidth',{value:mode==='small'?320:768});Object.defineProperty(window,'innerHeight',{value:mode==='small'?568:1024});window.visualViewport={width:window.innerWidth,height:window.innerHeight,offsetTop:0,scale:1,addEventListener(){}};
window.HTMLElement.prototype.focus=function(){document._focus=this;};window.HTMLElement.prototype.blur=function(){};window.HTMLElement.prototype.showModal=function(){this.open=true;};window.HTMLElement.prototype.close=function(){this.open=false;};
const find=q=>document.querySelector(q),click=q=>{const n=find(q);assert.ok(n,`missing ${q}`);assert.ok(!n.disabled,`disabled ${q}`);n.click();},profile=()=>JSON.parse(map.get(ASSESSMENT_SAVE_KEY));
await import('./dist/demo/app.js');
if(mode==='complete'){
 assert.equal(document.body.classList.contains('learning-locked'),false);assert.equal(find('#assessment-page').hidden,true);assert.equal(assessmentScore(profile().post),10);
 click('[data-restart]');click('[data-confirm]');assert.equal(reloads,1);assert.equal(profile().pre.done,false);assert.equal(profile().post.done,false);
 console.log('Assessment complete/restart: completed learning does not replay, fresh game resets both tests and requests a fresh entry.');
}else{
 assert.ok(document.body.classList.contains('learning-locked'));assert.equal(find('#assessment-page').hidden,false);assert.equal(find('[data-assessment-close]'),null);assert.equal(find('[data-close="assessment"]'),null);assert.equal(find('#assessment'),null,'learning is a full page, never a game dialog');
 if(!post){assert.equal(find('#play').textContent,'','the game has not performed its opening');assert.equal(map.get(SAVE_KEY),beforeGame,'loading the pretest cannot create or mutate a game');}
 document.dispatchEvent(new Event('keydown',{bubbles:true}));assert.ok(document.body.classList.contains('learning-locked'));
 const phase=post?'post':'pre',offset=['resume','post-resume'].includes(mode)?2:0;
 for(let i=offset;i<10;i++){
  assert.match(find('#assessment-title').textContent,new RegExp(ASSESSMENT_QUESTIONS[i].title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.equal(find('[data-assessment-next]').disabled,true,'one option is required');assert.doesNotMatch(find('#assessment-page').textContent,/正确答案|学前得分|比学前多答对/,'no answers or scores before the final post-test submission');
  const staleChoice=find(`[data-assessment-choice="${ASSESSMENT_QUESTIONS[i].correct}"]`);staleChoice.click();const staleNext=find('[data-assessment-next]');assert.equal(staleNext.disabled,false);staleNext.click();staleNext.click();staleChoice.click();
  if(mode!=='storage-error')assert.equal(profile()[phase].answers.length,i+1,'old events cannot answer another question');
  if(i<9){assert.equal(find('[data-assessment-next]').disabled,true);assert.doesNotMatch(find('#assessment-page').textContent,/正确答案/);}
 }
 if(!post){
  assert.doesNotMatch(find('#assessment-page').textContent,/正确答案|\/ 10/,'pre-test completion does not reveal the score');assert.equal(find('#play').textContent,'');click('[data-assessment-enter]');
  // Wait on the actual lazy import, not a simulated start callback.
  await import('./dist/demo/game.js');for(let i=0;i<20&&!find('#card-title');i++)await new Promise(setImmediate);
  assert.ok(find('#card-title'));assert.equal(document.body.classList.contains('learning-locked'),false);assert.equal(find('#assessment-page').hidden,true);
  if(mode!=='storage-error'){assert.equal(profile().pre.done,true);assert.equal(profile().entered,true);const game=JSON.parse(map.get(SAVE_KEY));assert.deepEqual(game.tx,JSON.parse(beforeGame||map.get(SAVE_KEY)).tx);}
 }else{
  assert.equal(profile().post.done,true);assert.ok(document.body.classList.contains('learning-locked'));assert.match(find('.assessment-scores').textContent,/学前测验4 \/ 10.*学后测验10 \/ 10/);assert.match(find('.assessment-progress-note').textContent,/多答对 6 题/);assert.equal(map.get(SAVE_KEY)&&JSON.parse(map.get(SAVE_KEY)).tx.length,JSON.parse(beforeGame).tx.length);
  click('[data-assessment-review="0"]');for(let i=1;i<10;i++)click(`[data-assessment-review="${i}"]`);assert.match(find('.assessment-review').textContent,/正确答案/);click('[data-assessment-return]');assert.equal(document.body.classList.contains('learning-locked'),false);assert.equal(find('#assessment-page').hidden,true);
 }
 console.log(`Mandatory learning ${mode}: independent entry, no skip, required selections, no early answers/scores, ten identical questions, persistent first submissions, game gating and ${post?'real ending comparison':'deferred game opening'} passed.`);
}
// Invalid/partial profiles never unlock the gate or manufacture an answered baseline.
const corrupt={getItem:()=>JSON.stringify({version:2,pre:{answers:[],done:true},post:{answers:[],done:false}})};assert.equal(loadAssessment(corrupt).assessment.pre.done,false);
