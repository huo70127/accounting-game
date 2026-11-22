// A scene is a sequence of readable beats. Paging changes presentation only.
const $=id=>document.getElementById(id);
const later=fn=>(globalThis.requestAnimationFrame||((f)=>setTimeout(f,0)))(fn);
const extras=new Map();let extraId=0;
const cursors=new Map();let current=null,reader=null,queued=false;

export function splitText(text,limit=76){
 const parts=[];let rest=text;
 while(rest.length>limit){let end=rest.slice(0,limit+1).search(/[。！？；][^。！？；]*$/);end=end>=limit/3?end+1:limit;parts.push(rest.slice(0,end));rest=rest.slice(end);}
 if(rest)parts.push(rest);return parts;
}
function element(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
function detailButton(node){
 const summary=node.querySelector('summary'),button=element('button','stage-detail-link',summary?.textContent||'再看一眼');
 button.type='button';const id=String(++extraId);button.dataset.screenDetail=id;
 const content=node.cloneNode(true);content.querySelector('summary')?.remove();content.open=true;extras.set(id,{title:button.textContent,nodes:[...content.children]});return button;
}
function expand(nodes){
 const result=[];
 for(const node of nodes){
  if(node.matches('.illustration,.mascot,.idle-breeze'))continue;
  if(node.matches('details')){result.push(detailButton(node));continue;}
  if(node.matches('.story-dialogue')&&node.children.length>1){for(const p of [...node.children]){const box=element('div','story-dialogue');box.append(p);box.dataset.beat='';result.push(box);}continue;}
  if(node.matches('.lesson-terms')){result.push(...expand([...node.children]));continue;}
  if(node.matches('.feedback')){
   const content=node.querySelector('div'),paragraphs=[...content.children];
   for(let i=0;i<paragraphs.length;i++){
    const box=element('div',node.className);if(i===0){box.id=node.id;box.setAttribute('role',node.getAttribute('role')||'status');box.tabIndex=-1;}
    const text=element('div');text.append(paragraphs[i]);box.append(element('span','feedback-badge',node.classList.contains('negative')?'!':'✓'),text);result.push(box);
   }continue;
  }
  if(node.matches('.result-chart')){result.push(...node.children);continue;}
  if(node.matches('p')&&node.textContent.length>76&&!node.querySelector('button,input,a')){for(const text of splitText(node.textContent)){const p=element('p',node.className,text);result.push(p);}continue;}
  if(node.matches('.budget-card,.story-dialogue,.term-card'))node.dataset.beat='';
  result.push(node);
 }return result;
}
function estimate(node){
 if(node.matches('.budget-card'))return 216;
 if(node.matches('.answer-list'))return [...node.children].reduce((n,v)=>n+Math.max(52,Math.ceil(v.textContent.length/21)*23+18),0);
 if(node.matches('.review-grid'))return 92;
 if(node.matches('svg'))return 240;
 return Math.max(38,Math.ceil(node.textContent.length/23)*25+22);
}
function splitBlock(node){
 if(node.matches('.budget-card'))return null;
 if(node.matches('.answer-list,.term-card,.result-actions,.challenge-invite,.liquidation-list,.score-list,.pending-resume,.order-options,.concept-summary,.course-choices,.weekly-records,.schedule-grid,.contract-note')&&node.children.length>1){
  return [...node.children].map(child=>{const box=element('div',node.className+' divided-block');box.append(child);return box;});
 }
 if(node.textContent.length>65&&!node.querySelector('button,input,svg'))return splitText(node.textContent,55).map(text=>element('p',node.classList.contains('feedback')?node.className:'card-lead',text));
 return null;
}
function makePages(host,chunks){
 host.replaceChildren();const pages=[];let page;
 const reserve=host.id==='reading-body'?220:document.body.classList.contains('is-budget')?290:400;
 const capacity=host.clientHeight||Math.max(130,(window.visualViewport?.height||window.innerHeight||800)-reserve);
 const fresh=()=>{page=element('div','screen-page');host.append(page);pages.push(page);};fresh();
 let used=0;const work=chunks.map(node=>({node,depth:0}));
 while(work.length){
  const {node,depth}=work.shift();
  if(node.hasAttribute('data-beat')&&page.children.length){fresh();used=0;}
  page.append(node);const measured=page.scrollHeight,tooLarge=measured?measured>capacity+1:used+estimate(node)>capacity;
  if(tooLarge&&page.children.length>1){node.remove();fresh();used=0;page.append(node);}
  const aloneTooLarge=page.scrollHeight?page.scrollHeight>capacity+1:estimate(node)>capacity;
  const smaller=aloneTooLarge&&depth<4?splitBlock(node):null;
  if(smaller){node.remove();work.unshift(...smaller.map(n=>({node:n,depth:depth+1})));continue;}
  used+=estimate(node);
 }
 const nonempty=pages.filter(p=>p.children.length);for(const p of pages)if(!p.children.length)p.remove();
 return nonempty.length?nonempty:[page];
}
function nav(model){
 const {pages,index,bar,primary}=model,last=index===pages.length-1;
 for(let i=0;i<pages.length;i++){pages[i].hidden=i!==index;pages[i].setAttribute('aria-hidden',String(i!==index));}
 bar.querySelector('.screen-nav')?.remove();bar.querySelector('[data-screen-next]')?.remove();
 const controls=element('div','screen-nav'),back=element('button','screen-back','‹');back.type='button';back.dataset.screenBack='';back.disabled=index===0;back.setAttribute('aria-label','看上一页');
 const number=element('span','screen-page-number',pages.length>1?`${index+1} / ${pages.length}`:'');number.setAttribute('aria-live','polite');controls.append(back,number);bar.prepend(controls);
 if(primary)primary.hidden=!last;
 if(!last){const next=element('button','primary-button',model.reading?'下一页 →':'继续看看 →');next.type='button';next.dataset.screenNext='';bar.append(next);}
 else if(!primary){const close=element('button','primary-button',model.reading?'看好了，回去':'再看一眼账本');close.type='button';if(model.reading)close.dataset.close='reading';else close.dataset.openbook='0';bar.append(close);model.primary=close;}
 if(!model.reading)cursors.set(model.key,index);
}
function turn(model,direction){if(!model)return;model.index=Math.max(0,Math.min(model.pages.length-1,model.index+direction));nav(model);model.pages[model.index].tabIndex=-1;model.pages[model.index].focus({preventScroll:true});}
export function presentScene(key,{answered=false,quiz=false}={}){
 const play=$('play'),card=play.querySelector('.card-content'),dock=$('scene-actions');if(!card)return;
 document.body.classList.toggle('is-budget',!!card.querySelector('.budget-card'));
 extras.clear();extraId=0;
 const bar=dock.querySelector('.actionbar')||element('footer','actionbar');if(!bar.parentNode)dock.append(bar);dock.hidden=false;document.body.classList.add('has-scene-actions');
 const primary=bar.querySelector('.primary-button');bar.querySelector('small')?.remove();
 if(answered){card.querySelector('.answer-list')?.remove();card.querySelector('.card-lead')?.remove();}
 document.body.classList.toggle('is-question',quiz&&!answered);
 const heading=element('div','screen-heading');for(const n of [...card.children])if(n.matches('.card-topline,.card-title,.word-new-badge'))heading.append(n);
 if(quiz&&!answered){const lead=card.querySelector('.card-lead');if(lead){lead.classList.add('question-context');heading.append(lead);}}
 const nodes=expand([...card.children]);card.replaceChildren(heading);card.classList.add('screen-card');const host=element('div','screen-pages');
 if(answered){const negative=nodes.some(n=>n.classList.contains('negative'));for(const n of nodes)if(n.id==='answer-feedback')n.removeAttribute('id');host.id='answer-feedback';host.tabIndex=-1;host.classList.add(negative?'negative':'positive');host.setAttribute('role',negative?'alert':'status');}
 card.append(host);
 current={key,host,chunks:nodes,bar,primary,index:cursors.get(key)||0,reading:false,pages:[]};current.pages=makePages(host,nodes);current.index=Math.min(current.index,current.pages.length-1);nav(current);
 later(()=>reflow(current));
}
function reflow(model){
 if(!model||!model.host.isConnected)return;
 const active=model.pages[model.index]?.firstElementChild;
 const chunks=model.pages.flatMap(page=>[...page.children]);model.pages=makePages(model.host,chunks);const found=model.pages.findIndex(p=>active&&p.contains(active));model.index=found>=0?found:Math.min(model.index,model.pages.length-1);nav(model);
}
export function openReading(title,nodes){
 $('reading-title').textContent=title;const host=$('reading-body'),bar=$('reading-actions');bar.replaceChildren();$('reading').showModal();
 reader={reading:true,host,bar,chunks:expand(nodes.map(n=>n.cloneNode(true))),index:0,primary:null,pages:[]};reader.pages=makePages(host,reader.chunks);nav(reader);later(()=>reflow(reader));
}
export function setupScreen(){
 document.body.classList.add('one-screen');
 document.addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button)return;
  const model=button.closest('#reading')?reader:current;
  if(button.hasAttribute('data-screen-next'))turn(model,1);
  if(button.hasAttribute('data-screen-back'))turn(model,-1);
  if(button.dataset.screenDetail){const detail=extras.get(button.dataset.screenDetail);if(detail)openReading(detail.title,detail.nodes);}
 });
 const resize=()=>{if(queued)return;queued=true;later(()=>{queued=false;reflow(current);if($('reading').open)reflow(reader);});};
 window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
 if(typeof ResizeObserver==='function'){const observer=new ResizeObserver(resize);observer.observe($('play'));}
 document.fonts?.ready.then(resize);
 return {resize};
}
