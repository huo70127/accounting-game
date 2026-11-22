import assert from 'node:assert/strict';
import {start,act,balances} from './dist/engine.js';
import {queueLesson,submitEntries,lessonTargets,lessonIssues,drawLesson,paintLessonFeedback,focusLessonIssue} from './dist/journal.js';
import {restore,envelope} from './dist/storage.js';
import {paintPurchase} from './dist/purchase-ui.js';

// A DOM fixture exercises rendering, field semantics and focus routing without a browser.
class Node {
 constructor(){this.innerHTML='';this.textContent='';this.hidden=false;this.open=false;this.dataset={};this.attrs={};this.classes=new Set();this.classList={toggle:(key,on)=>on?this.classes.add(key):this.classes.delete(key)};}
 setAttribute(k,v){this.attrs[k]=v;}
 replaceChildren(){this.innerHTML='';}
 closest(selector){return this.parents?.[selector]||null;}
 querySelector(selector){return this.children?.[selector]||null;}
 focus(){this.focused=true;}
 scrollIntoView(){this.scrolled=true;}
}
const nodes=new Map(),inputs=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};
globalThis.document={hidden:false,getElementById:get,querySelector:selector=>inputs.get(Number(selector.match(/data-entry="(\d+)"/)?.[1]))||null,querySelectorAll:()=>[]};
function bindInputs(s){inputs.clear();for(const index of s.pendingLesson.editable){const input=new Node(),cell=new Node(),row=new Node();input.parents={'.amount-cell':cell,'.sheet-entry, .compare-row':row};inputs.set(index,input);}}
const game=start(0),before=structuredClone(game);act(game,'family');queueLesson(before,game);bindInputs(game);
const i=game.pendingLesson.editable[0],cash=balances(game).cash;
drawLesson(game);assert.equal(get('journalcheckwrap').hidden,false);assert.equal(get('journaldonewrap').hidden,true);assert.equal(get('journalfeedback').innerHTML,'');assert.match(get('journalrows').innerHTML,/aria-describedby="amount-error-/);
for(const value of ['', '-1','1.001','1e1','<img src=x>','9']){
 game.pendingLesson.draft[i].amount=value;
 assert.equal(submitEntries(game,game.pendingLesson.draft).ok,false);
 assert.equal(lessonIssues(game)[0].index,i);drawLesson(game);
 assert.match(get('journalfeedback').innerHTML,/1 处金额需要修改/);
 assert.match(get('journalfeedback').innerHTML,/向父母借的钱/);
 assert.equal(inputs.get(i).attrs['aria-invalid'],'true');assert.ok(inputs.get(i).parents['.amount-cell'].classes.has('field-invalid'));
 assert.equal(get(`amount-error-${i}`).hidden,false);
 focusLessonIssue(game);assert.ok(inputs.get(i).focused&&inputs.get(i).scrolled);
 assert.equal(balances(game).cash,cash);
}
// Editing removes stale errors but still requires a new explicit check.
game.pendingLesson.draft[i].amount='10';paintLessonFeedback(game,{edited:true});assert.equal(inputs.get(i).attrs['aria-invalid'],'false');assert.equal(get(`amount-error-${i}`).hidden,true);assert.match(get('journalfeedback').innerHTML,/重新核对/);assert.equal(game.pendingLesson.status,'editing');
assert.equal(submitEntries(game,game.pendingLesson.draft).ok,true);drawLesson(game);assert.equal(get('journalcheckwrap').hidden,true);assert.equal(get('journaldonewrap').hidden,false);assert.match(get('journalsuccess').innerHTML,/这笔账，记对了/);assert.equal(game.journalLog.length,1);submitEntries(game,game.pendingLesson.draft);assert.equal(game.journalLog.length,1);assert.deepEqual(restore(envelope(game)),game);
// Two affected reports: move to an error on the other tab, keep the attempt and draft.
const cross=start(0);act(cross,'family');act(cross,'supplies',{lemon:201,tea:12,sugar:60,cup:4,straw:4});for(const a of ['serve','deposit','skip','review','next','collect','loan','ready','walk','close','review']){if(cross.world.wait)act(cross,'arrive');assert.equal(act(cross,a),true,a);}
const prev=structuredClone(cross);act(cross,'next');queueLesson(prev,cross);
assert.equal(cross.pendingLesson.editable.length,2);assert.deepEqual(new Set(lessonIssues(cross).map(v=>v.page)),new Set([0,1]));
const first=lessonIssues(cross).find(v=>v.page===0),other=lessonIssues(cross).find(v=>v.page===1);cross.pendingLesson.draft[first.index].amount=String(lessonTargets(cross)[first.index].amount);submitEntries(cross,cross.pendingLesson.draft);cross.pendingLesson.page=0;bindInputs(cross);focusLessonIssue(cross);assert.equal(cross.pendingLesson.page,1);assert.ok(inputs.get(other.index).focused);assert.deepEqual(restore(envelope(cross)).pendingLesson,cross.pendingLesson);
// Procurement failures surface locally and clear stale summary text after correction.
const purchase=start(0);act(purchase,'family');const summary=new Node();get('purchase-total').parents={'.purchase-summary':summary};
for(const [key,value] of Object.entries({lemon:'-1',tea:'12',sugar:'60',cup:'4',straw:'4'}))get('material-'+key).value=value;
get('purchase-capacity').textContent='stale';assert.equal(paintPurchase(purchase,true),false);assert.equal(get('material-lemon').attrs['aria-invalid'],'true');assert.ok(get('material-lemon').focused);assert.equal(get('purchase-capacity').textContent,'');
get('material-lemon').value='200';assert.equal(paintPurchase(purchase),true);assert.equal(get('material-lemon').attrs['aria-invalid'],'false');assert.ok(!summary.classes.has('has-error'));
get('material-lemon').value='1000';assert.equal(paintPurchase(purchase,true),false);assert.match(get('purchase-warning').textContent,/钱盒还差/);assert.ok(get('purchase-warning').focused);
console.log('UI fixtures: field errors, focus, retry/success gates, multi-report routing, saved drafts and purchase errors passed.');

// Audio stays muted when requested, hidden or unsupported, and resumes only on interaction.
const {playCue,setSound,initInteractions}=await import('./dist/interactions.js');
let notes=0,resumes=0,peak=0;const prefs=new Map();globalThis.localStorage={setItem:(k,v)=>prefs.set(k,v)};
class Audio {
 constructor(){this.state='suspended';this.currentTime=0;this.destination={};}
 resume(){resumes++;this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}
 createOscillator(){return {frequency:{setValueAtTime(){}},connect(){},disconnect(){},start(){notes++;},stop(){}};}
 createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(v){peak=Math.max(peak,v);},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
}
globalThis.AudioContext=Audio;setSound(false);playCue('success');assert.equal(notes,0);assert.equal(resumes,0);assert.equal(prefs.get('lemon-stall:sound'),'off');
setSound(true);playCue('success');await Promise.resolve();assert.equal(notes,3);assert.equal(resumes,1);assert.ok(peak>=.07&&peak<=.1);
document.hidden=true;playCue('coins');assert.equal(notes,3);document.hidden=false;
setSound(false);playCue('retry');assert.equal(notes,3);
const listeners={};document.addEventListener=(name,fn)=>{listeners[name]=fn;};initInteractions();setSound(true);listeners.click({target:{closest:()=>({disabled:true})}});assert.equal(notes,3);listeners.click({target:{closest:()=>({id:'journalcheck',dataset:{}})}});assert.equal(notes,3);
listeners.click({target:{closest:()=>({dataset:{material:'lemon'}})}});await Promise.resolve();assert.equal(notes,5);
console.log('Audio fixtures: explicit mute, persisted preference, gesture activation, hidden tab silence, disabled controls and quiet envelopes passed.');
