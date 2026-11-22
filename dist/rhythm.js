import {possibleCups} from './materials.js';
import {PACE} from './events.js';
const PHASE_TIMES={intro:480,supplies:510,first:600,credit:780,dusk:900,evening:1080,supplier:1125,close1:1170,collect:510,prepare:540,channel:600,confirm:600,sell:660,close2:1170,due:510,end:570};
function skyFor(s){const bit=((s.rngState??0)>>>8)&1;return (bit+s.day)%2?'sunny':'cloudy';}
export function ensureWorld(s){if(!s.world||s.world.day!==s.day)s.world={day:s.day,minute:PHASE_TIMES[s.phase]??480,weather:skyFor(s),wait:null};return s.world;}
function wait(s,id,to,duration,title,detail,kind='quiet'){const w=ensureWorld(s);w.wait={id,from:w.minute,to:Math.max(to,w.minute),totalMs:duration+(w.weather==='cloudy'?PACE.cloudExtra:0),remainingMs:duration+(w.weather==='cloudy'?PACE.cloudExtra:0),title,detail,kind,called:false};}
export function afterAction(s,a){const w=ensureWorld(s);
if(a==='family')w.minute=510;
if(a==='supplies')wait(s,'morning',600,PACE.first,'把小摊摆好，等第一位街坊','巷口有人走过，你擦了擦摊桌。');
if(a==='serve')wait(s,'noon',780,PACE.noon,'太阳升高了，街坊陆续出门','整理好杯子，再招呼一下路过的人。');
if(a==='refuse')w.minute=900;
if(a==='full'||a==='deposit')wait(s,'packing',1125,PACE.packing,'卖完这一批，慢慢收拾摊桌','你把钱盒放好，等供应商送明天的茶料。','packing');
if(a==='wait')wait(s,'evening',1080,PACE.evening,'再摆一会儿，看看巷口','晚风吹过招牌，路灯渐渐亮起来。');
if(a==='eveningCup')w.minute=Math.min(1110,w.minute+8);
if(a==='finishEvening')w.minute=1125;
if(a==='buy'||a==='skip'||a==='close')w.minute=1170;
if(a==='collect')w.minute=540;
if(a==='ready')w.minute=600;
if((a==='walk')||(a==='confirm'))wait(s,'opening2',660,PACE.opening,s.channel==='group'?'活动客人正在过来取茶':'小摊开张，等第一拨街坊','你理好茶料，挂正了小招牌。',s.channel==='group'?'busy':'quiet');
if(a==='cup'){
 const cap=s.flags.machine?5:3,remaining=Math.min(cap-s.sold,possibleCups(s));
 if(!remaining)w.minute=1080;
 else if(s.channel==='walk'&&s.sold===1)wait(s,'noon2',780,PACE.busy,'午间来了一拨街坊','前一杯刚递走，巷口又有人朝这边来了。','busy');
 else if(s.channel==='walk'&&s.sold===3)wait(s,'afternoon2',960,PACE.quiet,'午后的巷口慢了下来','你擦了擦台面，等下一拨客人。');
 else w.minute=Math.min(1050,w.minute+15);
}
if(a==='repay')w.minute=570;
}
export function advanceWait(s,elapsedMs){const w=ensureWorld(s),q=w.wait;if(!q)return false;const delta=Math.max(0,Math.min(elapsedMs,1000));q.remainingMs=Math.max(0,q.remainingMs-delta);w.minute=q.from+(q.to-q.from)*(1-q.remainingMs/q.totalMs);return q.remainingMs===0;}
export function arrive(s){const w=ensureWorld(s);if(!w.wait)return false;w.minute=w.wait.to;w.wait=null;return true;}
export function callOut(s){const w=ensureWorld(s),q=w.wait;if(!q||q.called||q.kind==='packing')return false;q.called=true;return true;}
export function checkWorld(w,day){if(!w||w.day!==day||!Number.isFinite(w.minute)||w.minute<0||w.minute>1440||!['sunny','cloudy'].includes(w.weather))throw Error('营业时间不正确');if(w.wait){const q=w.wait;if(typeof q.id!=='string'||typeof q.title!=='string'||typeof q.detail!=='string'||/[<>]/.test(q.title+q.detail)||q.title.length>100||q.detail.length>150||!['quiet','busy','packing'].includes(q.kind)||typeof q.called!=='boolean'||![q.from,q.to,q.totalMs,q.remainingMs].every(Number.isFinite)||q.from<0||q.to<q.from||q.to>1440||q.totalMs<=0||q.totalMs>5000||q.remainingMs<0||q.remainingMs>q.totalMs)throw Error('等待进度不正确');}}
export function clockView(s){const w=ensureWorld(s),minute=Math.floor(w.minute),hour=Math.floor(minute/60),part=minute<660?'早上':minute<840?'正午':minute<1020?'下午':minute<1140?'傍晚':'夜晚';return {...w,time:String(hour).padStart(2,'0')+':'+String(minute%60).padStart(2,'0'),part,progress:Math.max(0,Math.min(1,(minute-480)/690))};}
