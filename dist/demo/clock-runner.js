// A short visible passage of story time. No wall-clock catch-up or future-event UI.
export function createClockRunner({getState,blocked,advance,reduced=()=>false,schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id)}){
 let timer=null,segment=null,step=1;
 const stop=()=>{if(timer!==null)cancel(timer);timer=null;segment=null;};
 const key=s=>s.stage==='idle'&&s.openingWait?`${s.seed}:${s.openingWait.id}`:null;
 function tick(){timer=null;const s=getState();if(!segment||key(s)!==segment){stop();return;}
  if(!blocked())advance(reduced()?s.openingWait.target:Math.min(s.openingWait.target,s.openingMinute+step));
  if(segment&&key(getState())===segment)timer=schedule(tick,80);else stop();
 }
 function sync(){const s=getState(),next=key(s);if(!next){stop();return;}if(next===segment)return;stop();segment=next;step=Math.max(1,Math.ceil((s.openingWait.target-s.openingMinute)/36));timer=schedule(tick,80);}
 return {sync,stop};
}
