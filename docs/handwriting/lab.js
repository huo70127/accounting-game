import {setupPlatform} from '../demo/platform.js';
import {mascot} from '../demo/art.js';
import {playCue,primeAudio,silence} from '../interactions.js';
import {loadRecognizer,recognize,groupStrokes} from './recognizer.js';
import {blank,createField,change,undo,redo,parseWrittenAmount,editKey} from './draft.js';

const $=id=>document.getElementById(id),platform=setupPlatform();
const fields=[createField('自己的零花钱'),createField('借来的钱')];
let active=0,strokeId=0,drawing=null,delay,model=null,failed=false,editBuffer='',editing=0,nextJob=0;
const canvas=$('ink'),ctx=canvas.getContext?.('2d');
$('companions').innerHTML=mascot('planning');
function hint(text){$('hint').textContent=text;}
function surfaceTransform(field){
 const rect=canvas.getBoundingClientRect(),surface=field.surface||{width:rect.width||540,height:rect.height||300},scale=Math.min((rect.width||surface.width)/surface.width,(rect.height||surface.height)/surface.height);
 return {rect,scale,x:((rect.width||surface.width)-surface.width*scale)/2,y:((rect.height||surface.height)-surface.height*scale)/2};
}
function renderInk(){
 if(!ctx)return;const field=fields[active],{rect,scale,x,y}=surfaceTransform(field),dpr=Math.min(3,window.devicePixelRatio||1),width=Math.max(1,Math.round((rect.width||540)*dpr)),height=Math.max(1,Math.round((rect.height||300)*dpr));
 if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width/dpr,height/dpr);ctx.translate(x,y);ctx.scale(scale,scale);ctx.lineWidth=4/Math.max(.5,scale);ctx.lineCap='round';ctx.lineJoin='round';
 const strokes=drawing?.replace?[]:field.current.strokes;
 for(const stroke of [...strokes,...(drawing?[drawing.stroke]:[])]){const points=stroke.points;if(!points.length)continue;ctx.strokeStyle=field.current.manual&&!drawing?'#afb7c2':'#376ac5';ctx.fillStyle=ctx.strokeStyle;
  if(points.length===1){ctx.beginPath();ctx.arc(points[0].x,points[0].y,ctx.lineWidth/2,0,Math.PI*2);ctx.fill();}
  else{ctx.beginPath();ctx.moveTo(points[0].x,points[0].y);for(const point of points.slice(1))ctx.lineTo(point.x,point.y);ctx.stroke();}
 }
}
function paintFields(){for(let i=0;i<fields.length;i++){const field=fields[i],button=document.querySelector(`[data-field="${i}"]`);button.classList.toggle('selected',i===active);button.classList.toggle('confirmed',field.current.confirmed);button.setAttribute('aria-pressed',String(i===active));$('amount-'+i).textContent=field.current.raw||'—';document.querySelector(`[data-field-status="${i}"]`).textContent=i===active?'正在写':field.current.confirmed?'记下了':field.current.strokes.length||field.current.raw?'草稿留着':'待写';}}
function paint(){
 const field=fields[active],current=field.current;paintFields();$('active-label').textContent='正在写 · '+field.name;
 $('undo').disabled=!field.past.length;$('redo').disabled=!field.future.length;$('clear').disabled=!(current.strokes.length||current.raw);$('delete-digit').disabled=!(current.strokes.length||current.raw);
 const placeholder=$('pad-placeholder');placeholder.hidden=!!current.strokes.length||!!drawing;
 if(current.manual){placeholder.hidden=false;placeholder.querySelector('span').textContent='已改为 '+current.raw;placeholder.querySelector('small').textContent='重新手写会替换这个金额，也可以点撤销返回。';}
 else{placeholder.querySelector('span').textContent='在这里写数字';placeholder.querySelector('small').textContent='多个数字从左到右写，稍稍留点空隙';}
 if(!ctx){placeholder.hidden=false;placeholder.querySelector('span').textContent='这里暂时无法画笔迹';placeholder.querySelector('small').textContent='可以用「修改金额」试试连续填写。';}
 $('previous').disabled=active===0;$('next').textContent=active===0?'记下这笔，下一格 →':'两笔写好了 ✓';
 $('recognition-status').textContent=field.busy?'正在看看你写的数字…':current.manual?'金额已经按你的修改记下。':current.raw?`我看成了 ${current.raw}，看看对不对。`:model?'可以写啦，试试一个金额。':failed?'笔迹会留着，也可以直接修改金额。':'正在准备识别，可以先写。';
 const list=$('candidates');list.replaceChildren();
 if(field.result?.candidates.length){const caption=document.createElement('span');caption.className='candidate-caption';caption.textContent='也可能是';list.append(caption);field.result.candidates.forEach((candidate,i)=>{const b=document.createElement('button');b.type='button';b.className='candidate'+(candidate.text===current.raw?' selected':'');b.dataset.candidate=String(i);b.textContent=candidate.text;b.setAttribute('aria-label','把识别金额改为 '+candidate.text);b.setAttribute('aria-pressed',String(candidate.text===current.raw));list.append(b);});}
 else if(failed&&current.strokes.length){const b=document.createElement('button');b.type='button';b.className='candidate';b.dataset.retry='';b.textContent='再识别一次';list.append(b);}
 renderInk();
}
async function updateRecognition(field=fields[active]){
 const revision=field.revision,ticket=++field.job;
 if(field.current.manual){field.busy=false;if(field===fields[active])paint();return;}
 if(!field.current.strokes.length){field.current.raw='';field.result=null;field.busy=false;if(field===fields[active])paint();return;}
 field.busy=true;if(field===fields[active])paint();
 try{
  model=model||await loadRecognizer();failed=false;
  if(ticket!==field.job||revision!==field.revision||field.current.manual)return;
  const result=recognize(field.current.strokes,model,field.current.overrides);field.result=result;field.current.raw=result.raw;
  if(field===fields[active])hint(result.uncertain?'有点拿不准，可以点候选金额，或者修改一下。':'看看识别的金额；写错了可以撤销一笔或重写。');
 }catch{if(ticket===field.job&&revision===field.revision){failed=true;field.current.raw='';if(field===fields[active])hint('暂时没认出这笔，笔迹先留着。可以重试，也可以修改金额。');}}
 finally{if(ticket===field.job){field.busy=false;if(field===fields[active])paint();else paintFields();}}
}
function scheduleRecognition(field=fields[active]){clearTimeout(delay);delay=setTimeout(()=>void updateRecognition(field),380);}
function coordinate(event){const {rect,scale,x,y}=surfaceTransform(fields[active]);return {x:(event.clientX-rect.left-x)/scale,y:(event.clientY-rect.top-y)/scale};}
function begin(event){
 if(!ctx||drawing||event.isPrimary===false||event.button>0||document.querySelector('dialog[open]'))return;event.preventDefault();primeAudio();clearTimeout(delay);
 const field=fields[active],rect=canvas.getBoundingClientRect();field.surface||={width:rect.width||540,height:rect.height||300};
 drawing={pointer:event.pointerId,field:active,replace:field.current.manual,stroke:{id:++strokeId,points:[coordinate(event)]}};
 try{canvas.setPointerCapture(event.pointerId);}catch{}renderInk();$('pad-placeholder').hidden=true;
}
function move(event){if(!drawing||drawing.pointer!==event.pointerId)return;event.preventDefault();const points=drawing.stroke.points;
 const coalesced=event.getCoalescedEvents?.();for(const sample of coalesced?.length?coalesced:[event]){if(points.length>=600)break;const point=coordinate(sample),last=points.at(-1);if(Math.hypot(point.x-last.x,point.y-last.y)>=1)points.push(point);}renderInk();
}
function finish(event,cancelled=false){
 if(!drawing||drawing.pointer!==event.pointerId)return;event.preventDefault();if(!cancelled){const point=coordinate(event),points=drawing.stroke.points,last=points.at(-1);if(points.length<600&&Math.hypot(point.x-last.x,point.y-last.y)>=1)points.push(point);}const done=drawing;drawing=null;try{canvas.releasePointerCapture(event.pointerId);}catch{}
 if(!cancelled){const field=fields[done.field];if(field.current.strokes.length>=60){hint('这张纸有点满了，先点「重写这一格」吧。');paint();return;}
  change(field,current=>{if(done.replace)Object.assign(current,blank());current.strokes.push(done.stroke);current.raw='';current.manual=false;});paint();scheduleRecognition(field);
 }else paint();
}
canvas.addEventListener('pointerdown',begin);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',event=>finish(event));canvas.addEventListener('pointercancel',event=>finish(event,true));canvas.addEventListener('lostpointercapture',event=>{if(drawing?.pointer===event.pointerId)finish(event,true);});
function selectField(index){if(index===active)return;clearTimeout(delay);drawing=null;const old=fields[active];if(old.current.strokes.length&&!old.current.manual)void updateRecognition(old);active=index;nextJob++;hint('上一格的笔迹留着了，点回去还能接着改。');paint();}
function historyAction(action){clearTimeout(delay);drawing=null;const field=fields[active];if(action(field)){hint('回到上一步了，可以接着写。');paint();void updateRecognition(field);}}
$('undo').onclick=()=>historyAction(undo);$('redo').onclick=()=>historyAction(redo);
$('clear').onclick=()=>{const field=fields[active];clearTimeout(delay);change(field,current=>Object.assign(current,blank()));field.job++;field.busy=false;hint('这一格清好了，重新写就行；也可以点撤销找回来。');paint();};
$('delete-digit').onclick=()=>{const field=fields[active];clearTimeout(delay);change(field,current=>{if(current.manual){current.raw=current.raw.slice(0,-1);if(!current.raw)Object.assign(current,blank());}else{const last=groupStrokes(current.strokes).at(-1);if(last){const ids=new Set(last.ids);current.strokes=current.strokes.filter(s=>!ids.has(s.id));current.overrides={};current.raw='';}}});hint('末位删掉了，可以接着写，也可以撤销。');paint();void updateRecognition(field);};
$('previous').onclick=()=>selectField(Math.max(0,active-1));
$('next').onclick=async()=>{
 const field=fields[active],ticket=++nextJob,index=active,revision=field.revision;clearTimeout(delay);await updateRecognition(field);if(ticket!==nextJob||index!==active||revision!==field.revision)return;
 const amount=parseWrittenAmount(field.current.raw);if(!amount.ok){hint('先写一个金额，小数最多两位；也可以点「修改金额」。');return;}
 field.current.raw=amount.text;field.current.confirmed=true;playCue('place');
 if(active===0){selectField(1);hint('第一笔记下了。现在写第二笔，随时可以点回去改。');}
 else if(fields.every(f=>parseWrittenAmount(f.current.raw).ok)){fields.forEach(f=>f.current.confirmed=true);hint('两笔都记下了！点任意金额格，还能继续修改。');playCue('success');paint();}
 else{selectField(0);hint('第二笔记下了，第一格还可以接着写。');}
};
document.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button||button.disabled)return;
 if(button.dataset.field!==undefined)selectField(Number(button.dataset.field));
 if(button.dataset.candidate!==undefined){const field=fields[active],candidate=field.result?.candidates[Number(button.dataset.candidate)];if(candidate){const result=field.result;change(field,current=>{current.raw=candidate.text;for(const pick of candidate.picks)current.overrides[pick.key]=pick.text;});field.result=result;hint('按你选的金额记下了；还可以接着写或撤销。');paint();}}
 if(button.hasAttribute('data-retry'))void updateRecognition();
 if(button.dataset.close)$(button.dataset.close).close();
 if(button.dataset.key!==undefined){editBuffer=editKey(editBuffer,button.dataset.key);paintEdit();}
 if(!['about'].includes(button.id))playCue('tap');
});
function paintEdit(){$('edit-value').textContent=editBuffer||'—';$('edit-delete').disabled=!editBuffer;$('edit-clear').disabled=!editBuffer;}
$('edit').onclick=()=>{editing=active;editBuffer=fields[active].current.raw;paintEdit();$('edit-hint').textContent='可以点数字修改，也可以关掉后重新手写。';$('edit-dialog').showModal();};
$('edit-delete').onclick=()=>{editBuffer=editBuffer.slice(0,-1);paintEdit();};$('edit-clear').onclick=()=>{editBuffer='';paintEdit();};
$('edit-apply').onclick=()=>{const amount=parseWrittenAmount(editBuffer);if(!amount.ok){$('edit-hint').textContent='写一个金额就好，小数最多两位。';return;}const field=fields[editing];change(field,current=>{current.raw=amount.text;current.manual=true;});field.job++;field.busy=false;$('edit-dialog').close();hint('金额改好了。撤销可以回到修改前。');paint();};
$('about').onclick=()=>$('about-dialog').showModal();
const resize=()=>{platform.refresh();const metrics=platform.metrics,portraitPhone=metrics.width<=600&&metrics.height>=metrics.width;document.body.classList.toggle('lab-compact',portraitPhone&&metrics.height<640);document.body.classList.toggle('lab-tiny',portraitPhone&&metrics.height<500);renderInk();};window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(delay);drawing=null;silence();}else{resize();paint();}});window.addEventListener('pagehide',()=>{clearTimeout(delay);drawing=null;silence();});
resize();paint();loadRecognizer().then(value=>{model=value;failed=false;paint();if(fields[active].current.strokes.length)void updateRecognition();}).catch(()=>{failed=true;paint();});
