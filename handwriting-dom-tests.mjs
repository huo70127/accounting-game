import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {amountStrokes} from './handwriting-strokes.mjs';

const mode=process.argv[2]||'normal',store=new Map([['lemon-stall:two-notes:v2','untouched game progress'],['lemon-stall:volume','0.82']]),original=[...store],timers=new Map(),requests=[],vvEvents=new Map(),waiting=[];let timerId=0,networkReady=mode==='normal',rect={left:0,top:0,width:330,height:210};
const {window}=parseHTML(readFileSync('dist/handwriting.html','utf8'));
Object.assign(globalThis,{window,document:window.document,Event:window.Event,requestAnimationFrame:fn=>fn(),localStorage:{getItem:key=>store.get(key)??null,setItem:(key,value)=>store.set(key,String(value))},setTimeout:(fn,ms)=>{if(ms===380){timers.set(++timerId,fn);return timerId;}return 0;},clearTimeout:id=>timers.delete(id)});
Object.defineProperty(window,'innerWidth',{configurable:true,value:390,writable:true});Object.defineProperty(window,'innerHeight',{configurable:true,value:844,writable:true});
window.visualViewport={width:390,height:844,offsetTop:0,scale:1,addEventListener:(event,fn)=>{if(!vvEvents.has(event))vvEvents.set(event,[]);vvEvents.get(event).push(fn);}};
window.HTMLElement.prototype.focus=function(){document._focus=this;};window.HTMLElement.prototype.blur=function(){document._focus=null;};Object.defineProperty(document,'activeElement',{get:()=>document._focus||document.body});
window.HTMLElement.prototype.showModal=function(){this.open=true;};window.HTMLElement.prototype.close=function(){this.open=false;};
const ink=document.getElementById('ink'),context={setTransform(){},clearRect(){},translate(){},scale(){},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},stroke(){}};ink.getContext=()=>context;ink.getBoundingClientRect=()=>rect;ink.setPointerCapture=()=>{};ink.releasePointerCapture=()=>{};
const modelBytes=readFileSync('dist/handwriting/digits.f32'),buffer=modelBytes.buffer.slice(modelBytes.byteOffset,modelBytes.byteOffset+modelBytes.byteLength),metadata=JSON.parse(readFileSync('dist/handwriting/model.json'));
globalThis.fetch=async(url,options)=>{requests.push({url:String(url),options});if(mode==='pending'&&!networkReady)await new Promise(resolve=>waiting.push(resolve));if(!networkReady)return {ok:false};return String(url).endsWith('model.json')?{ok:true,json:async()=>metadata}:{ok:true,arrayBuffer:async()=>buffer};};
await import('./dist/handwriting/lab.js');
const flush=()=>new Promise(resolve=>setImmediate(resolve)),find=s=>document.querySelector(s),click=s=>{const button=find(s);assert.ok(button,`missing ${s}`);assert.ok(!button.disabled,`disabled ${s}`);button.click();};
function pointer(type,point,id=1){const event=new Event(type,{bubbles:true,cancelable:true});Object.assign(event,{pointerId:id,clientX:point.x,clientY:point.y,button:0,isPrimary:true,getCoalescedEvents:()=>[]});ink.dispatchEvent(event);}
async function recognizeNow(){for(const [id,fn] of [...timers]){timers.delete(id);fn();}await flush();await flush();}
async function write(text){for(const stroke of amountStrokes(text,{scale:.65,x:10,y:30})){pointer('pointerdown',stroke.points[0]);for(const p of stroke.points.slice(1))pointer('pointermove',p);pointer('pointerup',stroke.points.at(-1));}await recognizeNow();}
await flush();assert.equal(document.querySelectorAll('input,textarea,[contenteditable="true"]').length,0,'neither handwriting nor correction uses a native text input');
await write('12');if(mode==='pending'){click('#next');click('#clear');networkReady=true;for(const resolve of waiting)resolve();await flush();await flush();assert.equal(find('#amount-0').textContent,'—');assert.match(find('#active-label').textContent,/自己的零花钱/,'a stale next action cannot advance after clearing pending ink');await write('12');}
if(mode==='offline'){assert.equal(find('#amount-0').textContent,'—');assert.match(find('#hint').textContent,/笔迹先留着/);networkReady=true;click('[data-retry]');await flush();await flush();}
assert.equal(find('#amount-0').textContent,'12');assert.equal(find('#amount-1').textContent,'—');
click('#undo');await flush();assert.equal(find('#amount-0').textContent,'1');click('#redo');await flush();assert.equal(find('#amount-0').textContent,'12');
click('#delete-digit');await flush();assert.equal(find('#amount-0').textContent,'1');click('#undo');await flush();assert.equal(find('#amount-0').textContent,'12');
click('#clear');assert.equal(find('#amount-0').textContent,'—');click('#undo');await flush();assert.equal(find('#amount-0').textContent,'12');
const alternative=find('[data-candidate="1"]');assert.ok(alternative);const alternateText=alternative.textContent;alternative.click();assert.equal(find('#amount-0').textContent,alternateText);click('#undo');await flush();assert.equal(find('#amount-0').textContent,'12');
click('#edit');assert.ok(find('#edit-dialog').open);if(!find('#edit-clear').disabled)click('#edit-clear');for(const digit of ['3','2'])click(`[data-key="${digit}"]`);click('#edit-apply');assert.equal(find('#amount-0').textContent,'32');assert.equal(find('#edit-dialog').open,false);click('#undo');await flush();assert.equal(find('#amount-0').textContent,'12');
click('#next');await flush();assert.match(find('#active-label').textContent,/借来的钱/);assert.equal(find('#amount-0').textContent,'12');assert.equal(find('[data-field="0"]').classList.contains('confirmed'),true);
await write('32');assert.equal(find('#amount-1').textContent,'32');pointer('pointerdown',{x:280,y:30});pointer('pointermove',{x:280,y:160});pointer('pointercancel',{x:280,y:160});await recognizeNow();assert.equal(find('#amount-1').textContent,'32','a cancelled stroke does not alter the amount');
click('[data-field="0"]');await flush();assert.equal(find('#amount-1').textContent,'32');assert.equal(find('#amount-0').textContent,'12');
rect={left:0,top:0,width:540,height:200};window.visualViewport.width=768;window.visualViewport.height=690;for(const fn of vvEvents.get('resize')||[])fn();assert.equal(find('#amount-0').textContent,'12');assert.equal(find('#amount-1').textContent,'32');
click('[data-field="1"]');await flush();click('#clear');rect={left:0,top:0,width:330,height:210};for(const fn of vvEvents.get('resize')||[])fn();
// Erasing the prior ink preserves a compatible surface; emulate writing on its original coordinates.
click('#edit');if(!find('#edit-clear').disabled)click('#edit-clear');click('[data-key="sign"]');click('#edit-apply');assert.ok(find('#edit-dialog').open,'an incomplete sign is a gentle editing prompt');assert.match(find('#edit-hint').textContent,/金额/);for(const digit of ['2','.','5','0'])click(`[data-key="${digit}"]`);click('#edit-apply');assert.equal(find('#amount-1').textContent,'-2.50');
click('#undo');await flush();assert.equal(find('#amount-1').textContent,'—');
click('#edit');if(!find('#edit-clear').disabled)click('#edit-clear');for(const digit of ['3','2'])click(`[data-key="${digit}"]`);click('#edit-apply');click('#next');await flush();assert.match(find('#hint').textContent,/两笔都记下/);assert.equal(find('#amount-0').textContent,'12');assert.equal(find('#amount-1').textContent,'32');
click('#about');assert.ok(find('#about-dialog').open);assert.match(find('#about-dialog').textContent,/不上传/);click('[data-close="about-dialog"]');
assert.equal(document.querySelectorAll('input,textarea,[contenteditable="true"]').length,0);assert.deepEqual([...store],original,'the independent lab never changes game progress or audio preferences');
assert.ok(requests.every(r=>/\/(model\.json|digits\.f32)$/.test(r.url)&&!r.options?.body),'only model assets are fetched; no strokes or field amounts are uploaded');
const style=document.createElement('style');style.textContent=readFileSync('dist/handwriting/style.css','utf8');document.head.append(style);assert.ok(style.sheet.cssRules.length>50);
console.log(`Handwriting DOM ${mode}: real local-model pointer recognition, undo / redo / clear / last-digit delete, candidate and button corrections, independent fields, cancelled strokes, resize, decimal / minus, no native text inputs, no uploads and untouched game storage passed. Canvas geometry and finger comfort still need real-device testing.`);
