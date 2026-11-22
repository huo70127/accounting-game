// Feature-based browser support. Game state remains local to this browser.
export function ensureStatePrimitives(root=globalThis){
 if(typeof root.structuredClone!=='function')root.structuredClone=value=>JSON.parse(JSON.stringify(value));
 if(typeof Array.prototype.at!=='function')Object.defineProperty(Array.prototype,'at',{configurable:true,writable:true,value:function(index){let n=Number(index)||0;n=n<0?Math.ceil(n):Math.floor(n);if(n<0)n+=this.length;return this[n];}});
}
export function measureViewport(win,doc,previous={}){
 const view=win.visualViewport,layoutWidth=win.innerWidth||doc.documentElement.clientWidth||390,layoutHeight=win.innerHeight||doc.documentElement.clientHeight||700;
 const zoomed=!!view&&Math.abs((view.scale||1)-1)>.02;
 if(zoomed&&previous.width)return {...previous,zoomed:true};
 const width=Math.round(view?.width||layoutWidth),height=Math.round(view?.height||layoutHeight),top=Math.max(0,Math.round(view?.offsetTop||0));
 const active=doc.activeElement,editing=!!active&&active.matches?.('input:not([type="range"]):not([type="checkbox"]),textarea');
 const rotated=previous.layoutWidth&&Math.abs(layoutWidth-previous.layoutWidth)>100;
 const baseline=rotated?layoutHeight:Math.max(previous.baseline||0,layoutHeight,editing?0:height+top);
 const keyboard=!!editing&&(baseline-height>120||!!previous.keyboard&&height<540&&height<=(previous.height||height)+80);
 return {width,height,top,layoutWidth,baseline,keyboard,short:height<540,veryShort:height<300,zoomed:false};
}
export function keepFieldVisible(input,scroller,padding=10){
 if(!input||!scroller||typeof input.getBoundingClientRect!=='function')return;
 const field=input.getBoundingClientRect(),area=scroller.getBoundingClientRect();if(area.height<=0)return;
 if(field.top<area.top+padding)scroller.scrollTop+=field.top-area.top-padding;
 else if(field.bottom>area.bottom-padding)scroller.scrollTop+=field.bottom-area.bottom+padding;
}
function focusables(dialog,win){return [...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')].filter(node=>!node.hidden&&!node.closest('[hidden]')&&(!win.getComputedStyle||win.getComputedStyle(node).display!=='none'));}
export function installDialogSupport(doc,win,onChange=()=>{}){
 const dialogs=[...doc.querySelectorAll('dialog')],stack=[],origins=new WeakMap();let overlay=null;
 const top=()=>stack.filter(node=>node.open).at(-1);
 function sync(){
  for(let i=stack.length-1;i>=0;i--)if(!stack[i].open)stack.splice(i,1);
  const opened=dialogs.filter(node=>node.open);doc.body.classList.toggle('has-open-dialog',!!opened.length);
  const active=top();for(const node of dialogs)node.classList.toggle('top-dialog',node===active);
  const fallback=active?.classList.contains('fallback-dialog');
  if(fallback&&!overlay){overlay=doc.createElement('div');overlay.className='dialog-shade';overlay.setAttribute('aria-hidden','true');doc.body.append(overlay);}
  if(overlay){overlay.hidden=!fallback;overlay.style.zIndex=String(1000+stack.indexOf(active)*2+1);}
  for(const node of stack)if(node.classList.contains('fallback-dialog')){node.style.zIndex=String(1002+stack.indexOf(node)*2);if(node===active)node.removeAttribute('aria-hidden');else node.setAttribute('aria-hidden','true');}
  onChange();
 }
 for(const node of dialogs){
  const show=typeof node.showModal==='function'?node.showModal.bind(node):null,close=typeof node.close==='function'?node.close.bind(node):null;
  if(!show){node.classList.add('fallback-dialog');node.setAttribute('role','dialog');node.setAttribute('aria-modal','true');}
  node.showModal=function(){if(node.open)return;origins.set(node,doc.activeElement);if(show)show();else node.open=true;node.setAttribute('open','');stack.push(node);sync();if(!show){const first=focusables(node,win)[0]||node;node.tabIndex=-1;first.focus?.({preventScroll:true});}};
  node.close=function(value){const wasOpen=!!node.open;if(close)close(value);else{node.open=false;node.returnValue=value||'';}node.removeAttribute('open');sync();if(wasOpen&&!show){const back=origins.get(node),active=top();if(back?.isConnected&&(!active||active.contains(back)))back.focus?.({preventScroll:true});else if(active)(focusables(active,win)[0]||active).focus?.({preventScroll:true});else doc.getElementById('openbook')?.focus?.({preventScroll:true});}};
  node.addEventListener('close',sync);
 }
 doc.addEventListener('keydown',event=>{
  const active=top();if(!active?.classList.contains('fallback-dialog'))return;
  if(event.key==='Escape'){event.preventDefault();const cancel=new win.Event('cancel',{cancelable:true});if(active.dispatchEvent(cancel))active.close();return;}
  if(event.key!=='Tab')return;const items=focusables(active,win),first=items[0]||active,last=items.at(-1)||active;
  if(!items.length||event.shiftKey&&doc.activeElement===first||!event.shiftKey&&doc.activeElement===last||!active.contains(doc.activeElement)){event.preventDefault();(event.shiftKey?last:first).focus?.({preventScroll:true});}
 });
 doc.addEventListener('focusin',event=>{const active=top();if(active?.classList.contains('fallback-dialog')&&!active.contains(event.target))(focusables(active,win)[0]||active).focus?.({preventScroll:true});});
 sync();return {sync,top};
}
export function setupPlatform(win=window,doc=document){
 ensureStatePrimitives();let metrics={},queued=false;
 function refresh(){
  const next=measureViewport(win,doc,metrics);metrics=next;if(next.zoomed)return;
  const root=doc.documentElement;root.style.setProperty('--viewport-height',next.height+'px');root.style.setProperty('--viewport-width',next.width+'px');root.style.setProperty('--viewport-top',next.top+'px');
  doc.body.classList.toggle('keyboard-open',next.keyboard);doc.body.classList.toggle('viewport-short',next.short);doc.body.classList.toggle('viewport-very-short',next.veryShort);
  for(const dismiss of doc.querySelectorAll('[data-dismiss-keyboard]')){const touch=(win.navigator?.maxTouchPoints||0)>0||win.matchMedia?.('(pointer:coarse)').matches;dismiss.hidden=!(next.keyboard||touch&&doc.activeElement?.matches?.('[data-book-field],[data-purchase-field]'));}
  keepFieldVisible(doc.activeElement?.matches?.('[data-book-field]')?doc.activeElement:null,doc.getElementById('book-body'));
 }
 const queue=()=>{if(queued)return;queued=true;const frame=win.requestAnimationFrame||globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,16));frame(()=>{queued=false;refresh();});};
 const dialogs=installDialogSupport(doc,win,queue);
 win.addEventListener('resize',queue);win.addEventListener('orientationchange',queue);win.addEventListener('pageshow',queue);
 win.visualViewport?.addEventListener('resize',queue);win.visualViewport?.addEventListener('scroll',queue);
 doc.addEventListener('focusin',queue);doc.addEventListener('focusout',queue);
 doc.addEventListener('click',event=>{if(event.target.closest?.('[data-dismiss-keyboard]')){doc.activeElement?.blur?.();queue();}});
 refresh();return {refresh,dialogs,get metrics(){return {...metrics};}};
}
