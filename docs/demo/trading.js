import {planService} from './service.js';
import {preparePastry,accrueShift} from './summer-operations.js';
import {nightToday,PASTRY_PRICE,PASTRY_COST} from './summer-rules.js';
import {balances,queueBook,money} from './accounting.js';
import {courseEnd} from './calendar.js';
import {receiveStock,rawCost} from './stock-policy.js';
import {eventRandom} from './random.js';
import {receive,possibleCups,consume,RECIPE_COST} from './procurement.js';

export function beginTrading(s,post,q,demand){
 const c=s.course,beforeTx=s.tx.length,day=s.day;
 if(q){receiveStock(s,q.quantities);if(q.cost){c.minute=Math.max(c.minute,570);post(s,`d${day}-stock`,`补齐今天的原料和包材，${money(q.cost)} 元`,{cash:-q.cost,inventory:q.cost},'operating',{kind:'stock-purchase',cart:q.quantities,rawCost:rawCost(q.quantities)},false);}}
 const available=possibleCups(s),from=c.minute,normalClose=1080;
 const plan=planService(s,demand,available,from,normalClose),events=plan.events,quantity=events.reduce((n,e)=>n+e.quantity,0);
 // Only depleted ingredients allow early closing. A busy queue does not end the day.
 const soldOut=quantity>0&&plan.stock===0,to=soldOut?events.at(-1).minute:normalClose;
 let bundles=preparePastry(s,post,quantity);
 events.forEach(event=>{event.bundles=Math.min(event.quantity,bundles);bundles-=event.bundles;});
 c.daily.shift={version:1,day,from,to,beforeTx,events,lostToWait:plan.lostToWait,lostToStock:plan.lostToStock,demand,serviceModel:1,next:0,paused:false,finished:false};s.stage='dailyTrading';return true;
}
function finish(s,post){
 accrueShift(s,post);
 const shift=s.course.daily.shift,before={...s,tx:s.tx.slice(0,shift.beforeTx)},ids=s.tx.slice(shift.beforeTx).map(t=>t.id);shift.finished=true;s.stage='dailySold';
 if(ids.length){queueBook(before,s,ids);const p=s.pendingBook;if(p){p.automatic=true;p.preview=true;p.fields.forEach(f=>f.value=money(f.target));p.checked=true;p.seenPages=[...p.pages];s.bookSuspended=true;}}
}
export function actTrading(s,action,value,post){
 const shift=s.course?.daily?.shift;if(s.stage!=='dailyTrading'||!shift)return null;
 if(action==='pause-day'){shift.paused=!shift.paused;return true;}
 if(!['advance-day','skip-day'].includes(action))return null;
 if(shift.paused&&action==='advance-day')return false;
 const minute=action==='skip-day'?shift.to:value;if(!Number.isInteger(minute)||minute<s.course.minute||minute>shift.to||minute===s.course.minute&&minute!==shift.to)return false;
 while(shift.next<shift.events.length&&shift.events[shift.next].minute<=minute){
  const i=shift.next,event=shift.events[i],quantity=event.quantity,bundles=event.bundles||0,revenue=quantity*500+bundles*PASTRY_PRICE,cost=quantity*RECIPE_COST+bundles*PASTRY_COST;s.course.minute=event.minute;
  if(!consume(s,quantity))throw Error('营业中的原料不足');if(bundles){if(s.course.summer.pastryStock<bundles)throw Error('点心原料不足');s.course.summer.pastryStock-=bundles;}
  post(s,`d${s.day}-sale-${i+1}`,`卖出 ${quantity} 杯茶${bundles?`及 ${bundles} 份点心`:''}，收到 ${money(revenue)} 元`,{cash:revenue,inventory:-cost,profit:revenue-cost},'operating',{kind:'sale',quantity,bundles,revenue,cost},false);
  s.completedEvents??=[];s.completedEvents.push({id:`d${s.day}-sale-${i+1}`,day:s.day,minute:event.minute,label:`卖出 ${quantity} 杯茶${bundles?`及 ${bundles} 份点心`:''}，收到 ${money(revenue)} 元`});shift.next++;
 }
 s.course.minute=minute;if(minute===shift.to)finish(s,post);return true;
}
export function validateTrading(s){
 const x=s.course?.daily?.shift;if(!x){if(s.stage==='dailyTrading')throw Error('营业时钟缺失');return;}
 if(x.version!==1||!Number.isInteger(x.day)||x.day<4||x.day>courseEnd(s)||!Number.isInteger(x.beforeTx)||x.beforeTx<1||x.beforeTx>s.tx.length||!Number.isInteger(x.from)||!Number.isInteger(x.to)||x.from>x.to||x.to>1080||!Array.isArray(x.events)||x.events.length>24||!Number.isInteger(x.next)||x.next<0||x.next>x.events.length||x.events.some((e,i)=>!Number.isInteger(e.minute)||e.minute<x.from||e.minute>x.to||i>0&&e.minute<x.events[i-1].minute||!Number.isInteger(e.quantity)||e.quantity<1))throw Error('营业时钟记录不正确');
 if(s.stage==='dailyTrading'&&(x.day!==s.day||x.finished||s.course.minute<x.from||s.course.minute>x.to||s.pendingBook))throw Error('营业进度不正确');
}
