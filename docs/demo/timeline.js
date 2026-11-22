import {calendarOffset,businessDay,weekday as courseWeekday} from './calendar.js';
import {eventRandom} from './random.js';
import {isOpeningChapter,isFromZero} from './accounting.js';
const PREP_ONE={welcome:900,budget:960,pocket:990,firstcash:990,parents:1140,loanquiz:1155,friend:1170,fundingquiz:1185};
const PREP_TWO={stall:540,stallbought:570,supply:600,inventory:630};
export function storyMoment(s){
 if(['liquidation','results'].includes(s.stage)){
  const saved=s.liquidation?.startedAt,minute=Number.isFinite(saved?.minute)?saved.minute:1080;
  return {day:saved?.day||s.day,minute:Math.min(1435,minute+Math.min(s.liquidation?.step||0,5)*10)};
 }
 if(s.course&&(s.course.week>1||s.day>3))return {day:s.day,minute:s.course.minute||540};
 if(isFromZero(s)&&s.stage in PREP_ONE)return {day:1,minute:PREP_ONE[s.stage]};
 if(isFromZero(s)&&s.stage in PREP_TWO)return {day:2,minute:PREP_TWO[s.stage]};
 if(isOpeningChapter(s)){
  if(Number.isInteger(s.openingMinute))return {day:3,minute:s.openingMinute};
  const start=[540,660,900][s.cashRound||0]||540;
  const minute=s.stage==='walkin'?start:['delivery','revenue','cost','margin','cashReceipt'].includes(s.stage)?start+15:s.stage==='betweenCustomers'?580:s.stage==='dayEnd'?1050:s.stage==='review'?1065:s.stage==='daySummary'?1080:start;
  return {day:3,minute};
 }
 const minute=({welcome:540,pocket:990,firstcash:990,parents:1140,loanquiz:1155,friend:1170,fundingquiz:1185,stall:540,stallbought:570,supply:600,inventory:630,payable:645,order:660,rejected:675,waiting:690,backup:705,delivery:720,revenue:720,cost:720,margin:720,payment:540,cashflow:570,collect:900,delaycheck:915,late:915,baddebt:930,collection:960,equipment:1020,review:1080})[s.stage]||540;
 return {day:s.day,minute};
}
export const clockTime=minute=>`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
export function arrivalMinute(s,round){const [first,last]=[[552,600],[665,735],[845,945]][round];return first+Math.floor(eventRandom(s.seed,'opening:arrival:'+round)*(last-first+1));}
export function completedTimeline(s){
 const moment=storyMoment(s),events=[],add=(id,day,minute,label)=>{if(day===moment.day&&minute<=moment.minute)events.push({id,day,minute,label,time:clockTime(minute),state:'done'});};
 const recorded=(s.completedEvents||[]).filter(event=>event.day===moment.day&&event.minute<=moment.minute);
 for(const event of recorded)add(event.id,event.day,event.minute,event.label);
 // Old saves have no completion journal: retain only facts proved by posted and
 // finished books. Never infer a guest, future result or closing from a time slot.
 const active=new Set(s.pendingBook?.id.split('|')||[]),finished=s.tx.filter(t=>t.id!=='opening'&&!active.has(t.id));
 for(const tx of finished){
  if(events.some(event=>event.id===tx.id))continue;
  if(isOpeningChapter(s)&&tx.kind==='sale'&&tx.storyAt&&tx.storyAt.day===3)continue;
  const known=tx.storyAt;
  if(known){add(tx.id,known.day,known.minute,tx.kind==='sale'?`卖出 ${tx.quantity} 杯茶`:tx.label);continue;}
  if(tx.id==='owner-money')add(tx.id,1,990,'放入自己的本钱');
  if(tx.id==='parent-loan')add(tx.id,1,1155,'借款记好了');
  if(tx.id==='friend-money')add(tx.id,1,1185,'朋友出资到账');
  if(tx.id==='stall-purchase')add(tx.id,2,570,'买好桌子和机器');
  if(tx.id==='first-stock')add(tx.id,2,630,'备好茶料');
  if(tx.kind==='sale'){
   const round=s.tx.filter(t=>t.kind==='sale').findIndex(t=>t.id===tx.id),isBeingHandled=isOpeningChapter(s)&&round===s.cashRound&&['delivery','revenue','cost','margin','cashReceipt'].includes(s.stage);
   if(!isBeingHandled)add(tx.id,3,([555,675,915][round]||720),`卖出 ${tx.quantity} 杯茶`);
  }
 }
 return events.sort((a,b)=>a.minute-b.minute).slice(-5);
}
export function currentTimelineEvent(s){
 const moment=storyMoment(s),pending=s.pendingBook,tx=pending?s.tx.filter(t=>pending.id.split('|').includes(t.id)).at(-1):null;
 let id,label;
 if(isOpeningChapter(s)&&s.stage==='walkin'){id=`walkin-${s.cashRound+1}`;label='客人来买茶';}
 else if(isOpeningChapter(s)&&['delivery','revenue','cost','margin','cashReceipt'].includes(s.stage)){
  const sale=s.tx.filter(t=>t.kind==='sale').at(-1);if(sale){id=sale.id;label=`记 ${sale.quantity} 杯茶的账`;}
 }
 if(pending?.preview&&tx?.kind==='sale'){id=tx.id;label=pending.automatic?'今天的营业收好了':`成交 ${tx.quantity} 杯茶，先看看小票`;}
 if(!id&&pending){id=tx?.id||`ledger:${pending.id}`;label=tx?.kind==='sale'?'记这笔卖茶的账':['liquidation','results'].includes(s.stage)?'核对清算账目':'记好这一笔账';}
 if(!id&&s.course&&(s.course.week>1||s.day>3)){const labelByStage={rainDay:'大雨停摊，今天没有营业',weekRest:'今天按排班休息',dailyTrading:'小摊正在营业',dailyOpen:'今天开摊前备货',dailyReady:'今天的茶料备好了',dailySold:'看看今天卖了多少',weekStart:'本周开摊前盘点',weekPurchase:'按配方补货',weekEquipment:'考虑设备方案',weekOrder:'商量这笔订单',weekRejected:'处理这次未成交',weekOffer:'选择本周生意',weekSale:'核对这笔交货',weekBills:'处理到期供应商款',weekLoan:'处理到期借款',weekCollect:'核对客户回款',weekSummary:'本周结账'};label=labelByStage[s.stage]||((s.stage.startsWith('course-')||s.stage.startsWith('summer'))?'复盘刚才这笔账':null);if(label)id=`week-${s.course.week}:${s.stage}`;}
 if(!id){const active=({welcome:['opening-idea','想开个小摊'],budget:['budget-ready','算开摊预算'],pocket:['owner-money','放入自己的本钱'],firstcash:['owner-money','记好第一笔出资'],parents:['parent-loan','向父母借款'],loanquiz:['parent-loan','记好借款这笔账'],friend:['friend-money','商量朋友出资'],fundingquiz:['friend-money','记好朋友的出资'],stall:['stall-purchase','买桌子和机器'],stallbought:['stall-purchase','摆好桌子和机器'],supply:['first-stock','买第一批茶料'],inventory:['first-stock','记好茶料的账'],payable:['supplier-bill','核对供应商账单'],order:['customer-order','商量付款方式'],rejected:['customer-refusal','处理这次未成交'],waiting:['waiting','等一等巷口的动静'],backup:['backup-order','看看这次客流'],payment:['supplier-payment','处理到期账单'],cashflow:['supplier-payment','核对付款记录'],collect:['collection','联系客人收款'],delaycheck:['collection','确认延期情况'],late:['collection','处理延期货款'],baddebt:['bad-debt','处理无法收回的货款'],collection:['collection','记好回款这笔账'],equipment:['equipment-review','看看设备的账'],dayEnd:['day-close','打烊前对账'],review:['day-close','核对经营结果'],liquidation:['liquidation','清算小摊']})[s.stage];if(active)[id,label]=active;}
 return id?{id,label,day:moment.day,minute:moment.minute,time:clockTime(moment.minute),state:'current'}:null;
}
export function storyTimeline(s){
 const moment=storyMoment(s),day=moment.day,week=s.course?.week||((isFromZero(s)?1:2)+(day===12?1:0)),weekday=s.course?(calendarOffset(s)&&day<3?'开张前':courseWeekday(s,day)):({1:'周一',2:'周二',3:'周三',4:'周四',5:'周五',12:'周五'})[day];
 const current=currentTimelineEvent(s),past=completedTimeline(s).filter(node=>node.id!==current?.id),nodes=current?[...past.slice(-4),current]:past;
 return {...moment,week,weekday,time:clockTime(moment.minute),label:s.course&&(s.course.week>1||s.day>3)?`第 ${s.course.week} 周`:isOpeningChapter(s)?day===1?'筹备 · 第一天':day===2?'筹备 · 第二天':'开张日':`第 ${week} 周`,nodes,paused:s.stage==='dailyTrading'?!!s.course.daily.shift.paused:s.stage!=='idle'};
}
export function reportPeriod(s,page){const t=storyTimeline(s);if(calendarOffset(s)&&t.day<3)return `${page===0?'截至':'本局开始至'}筹备第 ${t.day} 天 ${t.time}`;const at=`第 ${t.week} 周 ${t.weekday} ${t.time}`;return page===0?`截至 ${at}`:`本局开始至 ${at}`;}
