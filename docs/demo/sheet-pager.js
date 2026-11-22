// Keep the real accounting rows and inputs; only their visibility is paged.
import {openReading} from './screen.js';
const $=id=>document.getElementById(id);
let current=null,queued=false;
const later=fn=>(globalThis.requestAnimationFrame||((f)=>setTimeout(f,0)))(fn);
function groupsFor(body){
 const sheet=body.querySelector('.balance-sheet');
 if(sheet){
  const left=[...sheet.querySelector('.balance-assets .balance-details').children],right=[...sheet.querySelector('.balance-sources .balance-details').children];
  const groups=Array.from({length:Math.max(left.length,right.length)},(_,i)=>[left[i],right[i]].filter(Boolean));
  groups.push([...sheet.querySelectorAll('.balance-column>.book-row')]);return groups;
 }
 return [...body.querySelectorAll('.financial-table .book-row')].map(row=>[row]);
}
function selectGroups(model,indexes){
 const visible=new Set(indexes);model.groups.forEach((group,i)=>{for(const n of group)n.hidden=!visible.has(i);});
 for(const section of model.body.querySelectorAll('.cashflow-group,.cash-reconciliation'))section.hidden=![...section.querySelectorAll('.book-row')].some(n=>!n.hidden);
}
function activate(model,index){
 model.index=Math.max(0,Math.min(model.pages.length-1,index));selectGroups(model,model.pages[model.index]);model.body.scrollTop=0;
 model.controls.innerHTML=`<button type="button" class="sheet-turn" data-sheet-back ${model.index===0?'disabled':''} aria-label="报表上一页">‹ 上页</button><span class="sheet-page-label">${model.index+1} / ${model.pages.length}</span><button type="button" class="sheet-turn" data-sheet-next ${model.index===model.pages.length-1?'disabled':''} aria-label="报表下一页">下页 ›</button><button type="button" class="sheet-notes" data-sheet-notes>说明与交易</button>`;
}
function layout(model,target){
 if(!model?.body.isConnected)return;
 for(const guide of model.body.querySelectorAll('.book-math-guide'))guide.classList.toggle('compact-guide',document.body.classList.contains('keyboard-open'));
 const height=model.body.clientHeight||Math.max(180,(window.visualViewport?.height||window.innerHeight||800)-300);
 const pages=[];let page=[];
 for(let i=0;i<model.groups.length;i++){
  const trial=[...page,i];selectGroups(model,trial);
  if(!page.length&&model.body.scrollHeight>height)for(const node of model.groups[i])for(const guide of node.querySelectorAll('.book-math-guide'))guide.classList.add('compact-guide');
  const content=model.body.scrollHeight,estimated=110+trial.reduce((sum,j)=>sum+Math.max(...model.groups[j].map(n=>n.matches('h5')?25:n.querySelector('input')?62:44)),0);
  if(page.length&&(content?content>height+1:estimated>height)){pages.push(page);page=[i];}else page=trial;
 }
 if(page.length)pages.push(page);model.pages=pages.length?pages:[[]];
 const activeGroup=target?model.groups.findIndex(g=>g.some(node=>node===target||node.contains(target))):-1;
 const found=activeGroup>=0?model.pages.findIndex(p=>p.includes(activeGroup)):-1;
 activate(model,found>=0?found:Math.min(model.index,model.pages.length-1));
}
export function paginateBook(key,target){
 const body=$('book-body'),old=current,controls=$('sheet-pager');if(!controls)return;
 const notes=[];
 for(const n of [...body.children])if(n.id!=='book-form'&&!n.matches('.book-equation')){notes.push(n.cloneNode(true));n.hidden=true;}
 const model={key,body,controls,notes,groups:groupsFor(body),pages:[],index:old?.key===key?old.index:0};current=model;
 layout(model,target);later(()=>{if(current===model)layout(model,document.activeElement?.matches?.('[data-book-field]')&&model.body.contains(document.activeElement)?document.activeElement:target);});
}
export function clearBookPages(){current=null;$('sheet-pager')?.replaceChildren();}
export function revealBookNode(node){
 if(!node||!current?.body.contains(node))return;
 const group=current.groups.findIndex(g=>g.some(n=>n===node||n.contains(node))),page=current.pages.findIndex(p=>p.includes(group));if(page>=0)activate(current,page);
}
export function refreshBookPages(target=document.activeElement){if(current)layout(current,target);}
export function setupSheetPaging(){
 document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||!current)return;
  if(button.hasAttribute('data-sheet-back')){activate(current,current.index-1);$('sheet-pager [data-sheet-back]')?.focus({preventScroll:true});}
  if(button.hasAttribute('data-sheet-next')){activate(current,current.index+1);$('sheet-pager [data-sheet-next]')?.focus({preventScroll:true});}
  if(button.hasAttribute('data-sheet-notes'))openReading('这一页的说明与交易',current.notes);
  if(button.hasAttribute('data-field-help')){const p=document.createElement('p');p.textContent=button.dataset.helpCopy||button.parentNode.querySelector('.guide-copy')?.textContent||'';openReading('贼溜溜把这笔账摊开了', [p]);}
 });
 const resize=()=>{if(queued)return;queued=true;later(()=>{queued=false;refreshBookPages();});};
 window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
 document.addEventListener('focusin',event=>{if(event.target.matches?.('[data-book-field]'))revealBookNode(event.target);});
 if(typeof ResizeObserver==='function')new ResizeObserver(resize).observe($('book-body'));
}
