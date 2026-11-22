// A short day in the foreground. All sales and timestamps live in the engine.
export function createTradingRunner({getState,blocked,advance,reduced=()=>false,schedule=(fn,ms)=>setTimeout(fn,ms),cancel=id=>clearTimeout(id)}){
 let timer=null,segment=null,frame=0,frames=80,from=0,epoch=0;
 const key=s=>s.stage==='dailyTrading'&&s.course.daily.shift&&!s.course.daily.shift.paused?`${s.seed}:${s.day}:${s.course.daily.shift.from}`:null;
 function stop(){if(timer!==null)cancel(timer);timer=null;segment=null;epoch++;}
 function tick(ticket){if(ticket!==epoch)return;timer=null;const s=getState();if(key(s)!==segment){stop();return;}
  if(!blocked()){frame++;const minute=reduced()?s.course.daily.shift.to:Math.min(s.course.daily.shift.to,from+Math.ceil((s.course.daily.shift.to-from)*frame/frames));if(minute>s.course.minute||minute===s.course.daily.shift.to)advance(minute);}
  if(ticket===epoch&&segment&&key(getState())===segment)timer=schedule(()=>tick(ticket),100);else if(ticket===epoch)stop();
 }
 function sync(){const s=getState(),next=key(s);if(!next){stop();return;}if(next===segment)return;stop();segment=next;from=s.course.minute;frame=0;frames=Math.max(1,Math.round(80*(s.course.daily.shift.to-from)/Math.max(1,s.course.daily.shift.to-s.course.daily.shift.from)));const ticket=epoch;timer=schedule(()=>tick(ticket),100);}
 return {sync,stop};
}
