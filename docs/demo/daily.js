import {serviceCapacity} from './service.js';
import {hasSummer,staffing,nightToday,NIGHT_FEE} from './summer-rules.js';
import {nightDemand} from './summer.js';
import {balances,report,queueBook,money} from './accounting.js';
import {eventRandom} from './random.js';
import {storyMoment} from './timeline.js';
import {courseDay,courseEnd,weekEnd,isRestDay} from './calendar.js';
import {suggestedStock as suggestedCart,receiveStock,forecastCups,rawCost,weekStockTarget} from './stock-policy.js';
import {isRainDay,rainDayNumber,quarantineRainStock} from './rain.js';
import {beginTrading,actTrading,validateTrading} from './trading.js';
import {quote,possibleCups,afterPurchaseCups,receive,consume,expire,RECIPE_COST} from './procurement.js';

export const DAILY_STAGES=['dailyOpen','dailyReady','dailyTrading','dailySold','weekRest','rainDay'];
export function enableDaily(s){if(s.course&&!s.course.daily){const prior=s.tx.filter(t=>!t.storyAt||t.storyAt.day<s.day);s.course.daily={version:1,records:[],active:s.day>=3?{day:s.day,startCash:prior.reduce((n,t)=>n+(t.delta.cash||0),0),startProfit:prior.reduce((n,t)=>n+(t.delta.profit||0),0)}:null};}}
export const dayCapacity=serviceCapacity;
export function dailyBatch(s,post,work){
 const before={...s,tx:s.tx.slice()},n=s.tx.length;work((id,label,delta,flow='operating',extra={})=>post(s,id,label,delta,flow,extra,false));
 if(s.tx.length>n){queueBook(before,s,s.tx.slice(n).map(t=>t.id));const p=s.pendingBook;if(p){p.automatic=true;p.fields.forEach(f=>f.value=money(f.target));p.checked=true;p.seenPages=[...p.pages];p.notice='今天的日常营业已自动记入三张表。';}}
}
export function startDay(s){const d=s.course.daily,b=balances(s);if(d.active?.day!==s.day)d.active={day:s.day,startCash:b.cash,startProfit:b.profit};}
export function affordableCart(s){if(possibleCups(s)>=dayCapacity(s))return suggestedCart(s,0);const cash=balances(s).cash;for(let target=weekStockTarget(s);target>=0;target--){const cart=suggestedCart(s,target);if(quote(cart).cost<=cash)return cart;}return suggestedCart(s,0);}
function remember(s,id,label){s.completedEvents??=[];if(!s.completedEvents.some(v=>v.id===id))s.completedEvents.push({id,label,day:s.day,minute:s.course.minute});}
export function openDay(s,post,day=s.day,route=true){
 const sameDay=s.day===day&&s.course.daily.active?.day===day;s.day=day;s.course.minute=sameDay?Math.max(540,s.course.minute||540):540;s.openingMinute=null;s.openingWait=null;startDay(s);s.stage='dailyOpen';
 const expired=expire(s);if(expired.cost)dailyBatch(s,post,add=>add(`d${day}-expired`,'开摊前下架过期原料',{inventory:-expired.cost,profit:-expired.cost},'operating',{kind:'spoilage',loss:expired.cost}));
 s.course.cart=affordableCart(s);s.course.payment='cash';
 if(isRestDay(s)){s.stage='weekRest';return;}
 if(isRainDay(s)){s.stage='rainDay';return;}
 if(nightToday(s)){s.course.minute=Math.max(s.course.minute,960);if(!s.course.summer.night.paid){if(balances(s).cash<NIGHT_FEE){s.course.summer.night.joined=false;s.course.summer.night.insufficient=true;s.course.minute=540;}else{dailyBatch(s,post,add=>add('summer-night-fee','使用暑假夜市摊位，支付摊位费 24 元',{cash:-NIGHT_FEE,profit:-NIGHT_FEE},'operating',{kind:'night-fee',loss:NIGHT_FEE,salesExpense:NIGHT_FEE}));s.course.summer.night.paid=true;}}}
 if(route&&day===courseDay(s,23))s.stage='weekBills';
 if(route&&day===courseDay(s,24))s.stage='weekLoan';
 if(route&&s.course.contracts.some(v=>v.balance&&((!v.revealed&&v.due<=day)||(v.revealed&&v.outcome==='late'&&v.due+7<=day))))s.stage='weekCollect';
}
export function dayResult(s){
 const d=s.course.daily,b=balances(s),r=report(s),sales=s.tx.filter(t=>t.kind==='sale'&&t.storyAt?.day===s.day),quantity=sales.reduce((n,t)=>n+t.quantity,0),cashReceived=sales.reduce((n,t)=>n+(t.delta.cash||0),0),revenue=sales.reduce((n,t)=>n+t.revenue,0),cost=sales.reduce((n,t)=>n+t.cost,0);
 const start=d.active?.day===s.day?d.active:{startCash:s.course.periodCash,startProfit:s.course.periodProfit};
 return {day:s.day,weatherClosed:s.stage==='rainDay'||!!s.course.rain?.closedDays.includes(s.day),rest:isRestDay(s)&&s.course.daily.shift?.day!==s.day&&!quantity,quantity,cashReceived,revenue,cost,gross:revenue-cost,cash:b.cash,profit:r.profit,cashChange:b.cash-start.startCash,profitChange:r.profit-start.startProfit,soldOut:quantity>0&&(possibleCups(s)===0)};
}
export function showDayResult(s){s.stage='dailySold';const result=dayResult(s);if(result.soldOut)s.course.minute=Math.min(s.course.minute||900,990);else s.course.minute=1080;return result;}
export function todayProfit(s){const day=storyMoment(s).day,b=balances(s),active=s.course?.daily?.active;return active?.day===day?b.profit-active.startProfit:s.tx.filter(t=>t.storyAt?.day===day).reduce((n,t)=>n+(t.delta.profit||0),0);}
export function recordDay(s){const d=s.course.daily;if(d.records.some(v=>v.day===s.day))return false;s.course.minute=storyMoment(s).minute;const result=dayResult(s);d.records.push({...result,closedAt:s.course.minute||1080});remember(s,`d${s.day}-closed`,result.weatherClosed?'大雨停摊，今天没有营业':result.soldOut?'原料用完了，提前打烊':'今天打烊了');return true;}
export function ordinaryDemand(s,key=`daily:${s.day}:demand`){const n=eventRandom(s.seed,key),cap=24,hadZero=s.course.daily?.records.some(v=>!v.rest&&!v.weatherClosed&&v.quantity===0);if(n<.01&&!hadZero)return 0;if(n<.04)return 1;const factor=n<.12?1/2:n<.35?5/6:1;return Math.floor(cap*factor);}

export function actDaily(s,action,value,post){
 const c=s.course,d=c?.daily;if(!d)return null;const trading=actTrading(s,action,value,post);if(trading!==null)return trading;
 if(action==='next-week'&&['daySummary','weekSummary'].includes(s.stage)&&s.day<weekEnd(s)){recordDay(s);openDay(s,post,s.day+1);return true;}
 if(action==='rain-close'&&s.stage==='rainDay'){
  c.minute=1080;if(!recordDay(s))return false;c.rain.closedDays.push(s.day);if(rainDayNumber(s)===3)quarantineRainStock(s);openDay(s,post,s.day+1);return true;
 }
 if(action==='week-rest-close'&&s.stage==='weekRest'){if(s.day<weekEnd(s)){recordDay(s);openDay(s,post,s.day+1);return true;}return 'finish-week';}
 if(action==='daily-close'&&s.stage==='dailySold'){
  if(!recordDay(s))return false;
  if(s.day===weekEnd(s))return 'finish-week';
  openDay(s,post,s.day+1);return true;
 }
 if(action==='buy-stock'&&s.stage==='dailyOpen'){
  const q=quote(value||c.cart);if(!q||q.cost>balances(s).cash||forecastCups(s,q.quantities)<1)return false;
  if(s.tx.some(t=>t.id===`d${s.day}-stock`))return false;
  s.stage='dailyReady';c.minute=Math.max(c.minute,570);
  dailyBatch(s,post,add=>{receiveStock(s,q.quantities);if(q.cost)add(`d${s.day}-stock`,`补齐今天的原料和包材，${money(q.cost)} 元`,{cash:-q.cost,inventory:q.cost},'operating',{kind:'stock-purchase',cart:q.quantities,rawCost:rawCost(q.quantities)});});return true;
 }
 if(action==='daily-trade'&&['dailyOpen','dailyReady'].includes(s.stage)){
  const q=s.stage==='dailyOpen'?quote(c.cart):null;if(s.stage==='dailyOpen'&&(!q||q.cost>balances(s).cash))return false;
  if(s.tx.some(t=>t.id===`d${s.day}-sale`)||d.records.some(v=>v.day===s.day))return false;
  return beginTrading(s,post,q,nightToday(s)?nightDemand(s):ordinaryDemand(s));
 }
 return null;
}
export function validateDaily(s){if(s.stage==='rainDay'&&!isRainDay(s))throw Error('停摊日期不正确');const d=s.course?.daily;if(!d)return;if(d.version!==1||!Array.isArray(d.records)||d.records.length>(s.course.totalWeeks||4)*7||new Set(d.records.map(v=>v.day)).size!==d.records.length||d.records.some(v=>!Number.isInteger(v.day)||v.day<3||v.day>s.day||v.day>courseEnd(s)||!Number.isInteger(v.quantity)||v.quantity<0||!Number.isSafeInteger(v.cash)||!Number.isSafeInteger(v.profit)))throw Error('每日经营记录不正确');validateTrading(s);}
