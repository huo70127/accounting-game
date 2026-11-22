import {serviceCapacity} from './service.js';
import {SUMMER_STAGES,enableSummer,actSummer,validateSummer,summerQuestion,afterSummerWeek,parentDue} from './summer.js';
import {seasonWeeks} from './summer-rules.js';
import {balances,report,queueBook,money} from './accounting.js';
import {eventRandom} from './random.js';
import {MATERIALS,RECIPE_COST,quote,possibleCups,afterPurchaseCups,receive,consume,expire,stockValue,validateStock} from './procurement.js';
import {courseDay,courseEnd,weekEnd,isRestDay} from './calendar.js';
import {suggestedStock as suggestedCart,receiveStock,forecastCups,rawCost,enableWeeklyStock,weekStockTarget} from './stock-policy.js';
import {settleRainStock} from './rain.js';
import {build} from './questions-v2.js';
import {enableDaily,actDaily,DAILY_STAGES,startDay,openDay,showDayResult,dayResult,ordinaryDemand,validateDaily} from './daily.js';

export const COURSE_STAGES=['weekStart','weekPurchase','weekOrder','weekRejected','weekEquipment','weekOffer','weekSale','weekBills','weekLoan','weekCollect','weekSummary','courseSummary','stockout','course-payable','course-receivable','course-finance','course-depreciation','course-payment','course-interest','course-collection','course-liquidity','course-spoil-2','course-spoil-3','course-spoil-4','course-spoil-close-2','course-spoil-close-3','course-spoil-close-4','course-bulk',...DAILY_STAGES,...SUMMER_STAGES];
export function enableCourse(s){
 if(s.journey!=='opening-cash-v2')return;if(s.course){s.course.calendarVersion??=1;s.course.totalWeeks??=8;enableWeeklyStock(s);enableDaily(s);enableSummer(s);return;}
 const value=balances(s).inventory;s.stockLots=[];
 if(value){if(value%RECIPE_COST)throw Error('旧库存无法按配方还原');const received=Math.min(2,s.day);for(const [material,m] of Object.entries(MATERIALS))s.stockLots.push({material,quantity:value/RECIPE_COST*m.recipe,received,expires:m.life===null?null:received+m.life});}
 s.course={version:1,totalWeeks:8,calendarVersion:1,stockPolicyVersion:3,week:1,payment:'cash',cart:suggestedCart(s,12),contracts:[],purchases:{},facts:{},summaries:[],upgrade:false,loan:null,periodCash:0,periodProfit:0,minute:540};enableWeeklyStock(s);enableDaily(s);enableSummer(s);
}
export const capacity=serviceCapacity;
export const currentWeek=s=>s.course?.week||1;
export function courseEnding(s){if(s.liquidation?.reason==='failure')return '资金断裂，提前停业';return s.course?.completed&&s.course.upgrade&&s.course.daily.records.some(t=>t.quantity>12)&&(!s.course.loan||s.course.loan.paid)&&balances(s).payable===0&&report(s).profit>0?'扩张成功':'小摊续营';}
const move=(s,stage,day=s.day,minute=s.course.minute)=>{s.stage=stage;s.day=day;s.course.minute=minute;};
function batch(s,post,work){const before={...s,tx:s.tx.slice()},n=s.tx.length;work((id,label,delta,flow='operating',extra={})=>post(s,id,label,delta,flow,extra,false));if(s.tx.length>n)queueBook(before,s,s.tx.slice(n).map(t=>t.id));}
export function recordWeek(s){const c=s.course,r=report(s);const entry={week:c.week,cash:r.b.cash,inventory:r.b.inventory,receivable:r.b.receivable,payable:r.b.payable,profit:r.profit-c.periodProfit,cashChange:r.b.cash-c.periodCash,totalProfit:r.profit};const prior=c.summaries.findIndex(v=>v.week===c.week);if(prior<0)c.summaries.push(entry);else c.summaries[prior]=entry;}
function afterStock(s){return s.course.week===2?'weekPurchase':s.course.week===3?'weekEquipment':'course-liquidity';}
function finishWeek(s,post,complete=false){const c=s.course,w=c.week;if(c.daily&&!complete){showDayResult(s);return;}move(s,'weekSummary',c.daily?weekEnd(s):w===2?12:w===3?19:26,1080);const rain=settleRainStock(s),expired=rain||expire(s);
 batch(s,post,add=>{
  if(expired.cost)add(rain?`w${w}-rain-spoilage`:`w${w}-closing-spoilage`,`${rain?'暴雨后周末盘点，受潮柠檬':'周末盘点，过期原料'}报损 ${money(expired.cost)} 元`,{inventory:-expired.cost,profit:-expired.cost},'operating',{kind:'spoilage',loss:expired.cost,reason:rain?'rain':'expiry',quantity:expired.quantity});
  if(w>=3&&c.upgrade)add(`w${w}-depreciation`,'计提新压汁机本周折旧 1 元',{equipment:-100,profit:-100},'operating',{kind:'depreciation',cost:100});
  if(w===3&&c.loan)add('w3-interest','计提设备借款本周利息 1 元',{interestPayable:100,profit:-100},'financing',{kind:'interest-expense',loss:100,financeExpense:100});
 });
 if(w===3&&c.upgrade&&!s.answers['course-depreciation']){c.facts['course-depreciation']={cost:3200,life:32,expense:100};s.stage='course-depreciation';}
 if(expired.cost||rain){s.stage=`course-spoil-close-${w}`;c.facts[s.stage]=expired;}
 if(c.daily&&isRestDay(s)&&!c.daily.records.some(v=>v.day===s.day))c.daily.records.push({...dayResult(s),rest:true,closedAt:1080});
 if(c.daily){const prior=c.daily.records.find(v=>v.day===s.day);if(prior)Object.assign(prior,dayResult(s));}
 recordWeek(s);afterSummerWeek(s);
}
function outcome(s,week){const n=eventRandom(s.seed,`course:w${week}:repayment`);return n<.8?'ontime':n<.95?'late':'default';}
function sell(s,post,week,quantity,price,ratio){
 const c=s.course,revenue=quantity*price,cost=quantity*RECIPE_COST,upfront=Math.floor(revenue*ratio),id=`w${week}-sale`;
 if(!quantity){c.lastSale={quantity:0,revenue:0,cost:0,cash:0,receivable:0};move(s,week===2?'weekRejected':'weekSale');return;}
 if(!consume(s,quantity))throw Error('原料不足');
 const contract={id,week,total:revenue,balance:revenue-upfront,paid:upfront,due:courseDay(s,week===2?25:26),outcome:ratio===1?'ontime':outcome(s,week),revealed:ratio===1,advanceTried:false};
 c.contracts.push(contract);c.lastSale={quantity,revenue,cost,cash:upfront,receivable:revenue-upfront};c.facts['course-receivable']??={...c.lastSale};
 move(s,week===2?'course-receivable':'weekSale',week===2?courseDay(s,8):c.daily?Math.max(courseDay(s,15),s.day):16,780);
 post(s,id,`第 ${week} 周交付 ${quantity} 杯手打柠檬茶`,{cash:upfront,receivable:revenue-upfront,inventory:-cost,profit:revenue-cost},'operating',{kind:'sale',quantity,revenue,cost});
}
export function courseRecovery(s){let cash=0,loss=0;for(const contract of s.course?.contracts||[]){if(!contract.balance)continue;const rate=contract.outcome==='default'?0:contract.outcome==='late'&&s.day<contract.due+7?.7:s.day<contract.due?.9:1;const recovered=Math.floor(contract.balance*rate);cash+=recovered;loss+=contract.balance-recovered;}return {cash,loss,outcome:'course'};}
export function dueAmount(s){const b=balances(s);if(s.stage==='summerPayroll')return b.wagesPayable;if(s.stage==='summerParentDue')return parentDue(s);return s.stage==='weekBills'?b.payable:s.stage==='weekLoan'&&s.course?.loan&&!s.course.loan.paid?s.course.loan.principal+(b.interestPayable||0):0;}
export function actCourse(s,action,value,post){
 const c=s.course;if(!c)return null;const summerResult=actSummer(s,action,value,post);if(summerResult!==null){if(summerResult&&s.day===weekEnd(s)&&c.daily.records.some(v=>v.day===s.day))recordWeek(s);return summerResult;}
 const dailyResult=actDaily(s,action,value,post);if(dailyResult==='finish-week'){finishWeek(s,post,true);return true;}if(dailyResult!==null)return dailyResult;
 if(action==='cart-update'&&['supply','weekPurchase','dailyOpen'].includes(s.stage)&&value&&MATERIALS[value.key]&&typeof value.value==='string'&&value.value.length<=18){c.cart[value.key]=value.value;return true;}
 if(action==='cart-reset'&&['supply','weekPurchase','dailyOpen'].includes(s.stage)){c.cart=suggestedCart(s,s.stage==='supply'?12:capacity(s));return true;}
 if(action==='purchase-payment'&&s.stage==='weekPurchase'&&['cash','half','credit'].includes(value)){c.payment=value;return true;}
 if(action==='buy-stock'&&['supply','weekPurchase'].includes(s.stage)){
  const q=quote(value||c.cart),ratio=s.stage==='supply'||c.payment==='cash'?1:c.payment==='half'?.5:0,paid=q?Math.ceil(q.cost*ratio):0;
  if(!q||forecastCups(s,q.quantities)<1||balances(s).cash<paid)return false;
  const w=c.week,id=w===1?'first-stock':`w${w}-stock`;if(s.tx.some(t=>t.id===id))return false;
  s.day=w===1?2:w===2?courseDay(s,8):c.daily?Math.max(courseDay(s,15),s.day):16;receiveStock(s,q.quantities);c.purchases[w]={cost:q.cost,paid,credit:q.cost-paid,cart:q.quantities};if(w===2)c.facts['course-payable']={cost:q.cost,paid,credit:q.cost-paid};
  move(s,w===1?'inventory':w===2?'course-payable':'weekOffer',s.day,Math.max(630,c.minute));
  if(q.cost)batch(s,post,add=>{add(id,`按配方采购原料和包材，共 ${money(q.cost)} 元`,{cash:-paid,inventory:q.cost,payable:q.cost-paid},'operating',{kind:'stock-purchase',cart:q.quantities,rawCost:rawCost(q.quantities)});});return true;
 }
 if(action==='next-week'&&['daySummary','weekSummary'].includes(s.stage)&&c.week<seasonWeeks(s)){recordWeek(s);const b=balances(s);c.week++;c.periodCash=b.cash;c.periodProfit=b.profit;c.payment='cash';c.cart=suggestedCart(s,weekStockTarget(s));s.openingMinute=null;s.openingWait=null;move(s,'weekStart',c.week===4&&!c.daily?courseDay(s,23):courseDay(s,(c.week-1)*7+1),540);return true;}
 if(action==='week-open'&&s.stage==='weekStart'){
  const w=c.week;if(c.daily)startDay(s);move(s,afterStock(s),s.day,570);const expired=expire(s);
  if(expired.cost){const stage=`course-spoil-${w}`;c.facts[stage]=expired;s.stage=stage;post(s,`w${w}-spoilage`,`到期原料报损：${expired.items.map(v=>`${v.name} ${v.quantity}${v.unit}`).join('、')}`,{inventory:-expired.cost,profit:-expired.cost},'operating',{kind:'spoilage',loss:expired.cost});}
  if(w===4&&c.loan&&!s.tx.some(t=>t.id==='w4-interest')){
   // Keep the expiry and interest entries in one review when both happen together.
   const prior=s.pendingBook,before={...s,tx:prior?s.tx.filter(t=>!prior.id.split('|').includes(t.id)):s.tx.slice()},ids=prior?prior.id.split('|'):[];
   post(s,'w4-interest','计提设备借款第二周利息 1 元',{interestPayable:100,profit:-100},'financing',{kind:'interest-expense',loss:100,financeExpense:100},false);queueBook(before,s,[...ids,'w4-interest']);
  }
  if(w===4&&s.stage==='weekBills')move(s,'weekBills',courseDay(s,23),600);
  if(w===4){const b=balances(s);c.facts['course-liquidity']={cash:b.cash,profit:b.profit,receivable:b.receivable,due:b.payable+(c.loan&&!c.loan.paid?c.loan.principal+b.interestPayable:0)};}
  c.cart=suggestedCart(s,weekStockTarget(s));
  return true;
 }
 if(action==='course-equipment'&&s.stage==='weekEquipment'&&['keep','cash','loan'].includes(value)){
  if(value==='cash'&&balances(s).cash<3200)return false;c.equipmentChoice=value;c.upgrade=value!=='keep';c.facts['course-finance']={choice:value};move(s,'course-finance',courseDay(s,15),660);
  if(c.upgrade)batch(s,post,add=>{if(value==='loan'){c.loan={principal:3200,interest:200,due:courseDay(s,24),paid:false};add('expansion-loan','借入设备贷款 32 元，第 4 周归还本金和利息',{cash:3200,loan:3200},'financing',{kind:'expansion-loan'});}add('expansion-equipment','买入压汁机，单杯制作由 4 分钟缩短为 2 分钟',{cash:-3200,equipment:3200},'investing',{kind:'equipment-purchase'});});return true;
 }
 if(action==='course-order-select'&&s.stage==='weekOrder'&&[0,50,100].includes(value)){c.customerChoice=value;return true;}
 if(action==='course-sell'&&s.stage==='weekOrder'&&[0,50,100].includes(c.customerChoice)){
  const rate=({0:.95,50:.75,100:.45})[c.customerChoice],accepted=eventRandom(s.seed,'course:w2:accept')<rate;c.accepted=accepted;
  if(accepted)sell(s,post,2,Math.min(c.daily?4:12,possibleCups(s)),500,c.customerChoice/100);else move(s,'weekRejected',courseDay(s,8),735);return true;
 }
 if(action==='course-wait'&&s.stage==='weekRejected'){
  const n=eventRandom(s.seed,'course:w2:backup'),qty=Math.min(n<.35?0:n<.75?4:8,possibleCups(s));
  if(qty){sell(s,post,2,qty,500,1);c.facts['course-receivable']={...c.lastSale};}else finishWeek(s,post);return true;
 }
 if(action==='course-offer'&&s.stage==='weekOffer'&&['cash','bulk','credit'].includes(value)){
  c.offer=value==='credit'?'bulk':value;const bulk=c.offer==='bulk',quantity=Math.min(bulk?capacity(s):ordinaryDemand(s,'course:w3:walkins'),capacity(s),possibleCups(s));sell(s,post,3,quantity,bulk?400:500,1);if(bulk){c.facts['course-bulk']={...c.lastSale};s.stage='course-bulk';}return true;
 }
 if(action==='course-close'&&s.stage==='weekSale'){finishWeek(s,post);return true;}
 if(action==='course-pay-supplier'&&s.stage==='weekBills'){
  const amount=balances(s).payable;if(balances(s).cash<amount)return false;move(s,'course-payment',courseDay(s,23),660);c.facts['course-payment']={amount};
  if(amount)post(s,'w4-supplier-payment','付清到期的供应商款项',{cash:-amount,payable:-amount},'operating',{kind:'supplier-payment'});return true;
 }
 if(action==='course-pay-loan'&&s.stage==='weekLoan'){
  if(!c.loan||c.loan.paid){if(c.daily)openDay(s,post,s.day,false);else move(s,'weekCollect',courseDay(s,25),900);return true;}
  const interest=balances(s).interestPayable||0;if(balances(s).cash<c.loan.principal+interest)return false;
  move(s,'course-interest',courseDay(s,24),660);c.facts['course-interest']={principal:c.loan.principal,interest};
  batch(s,post,add=>{add('w4-principal','归还设备借款本金 32 元',{cash:-c.loan.principal,loan:-c.loan.principal},'financing',{kind:'loan-repayment'});if(interest)add('w4-interest-payment','支付已经计提的设备借款利息',{cash:-interest,interestPayable:-interest},'financing',{kind:'interest-payment'});});c.loan.paid=true;return true;
 }
 if(action==='course-advance'&&['weekBills','weekLoan'].includes(s.stage)){
  const contract=c.contracts.find(v=>v.balance&&!v.advanceTried);if(!contract)return false;contract.advanceTried=true;
  const success=contract.outcome==='ontime'&&eventRandom(s.seed,contract.id+':advance')<.5;c.rescueNotice=success?'客人同意提前付款，按约定折让 10%。':'客人暂时不能提前付款，欠条仍然保留。';
  if(success){const amount=contract.balance,cash=Math.floor(amount*.9),loss=amount-cash;contract.balance=0;contract.paid+=cash;contract.revealed=true;post(s,contract.id+'-advance','折让 10%，提前收回货款',{cash,receivable:-amount,profit:-loss},'operating',{loss,kind:'settlementLoss'});}return true;
 }
 if(action==='course-clear'&&['weekBills','weekLoan','summerPayroll','summerParentDue'].includes(s.stage)&&balances(s).inventory){
  const value=stockValue(s),cash=Math.floor(value*.75);s.stockLots=[];if(s.course.summer)s.course.summer.pastryStock=0;post(s,s.course.week>4?`summer-clearance-${s.day}`:'w4-clearance','将剩余可用原料和包材按成本 75% 清售',{cash,inventory:-value,profit:cash-value},'operating',{kind:'clearance',revenue:cash,cost:value});return true;
 }
 if(action==='course-collect'&&s.stage==='weekCollect'){
  move(s,'course-collection',c.daily?s.day:26,960);let collected=0,badDebt=0,delayed=0;
  batch(s,post,add=>{for(const contract of c.contracts){if(!contract.balance||c.daily&&(contract.due>s.day||contract.revealed&&!(contract.outcome==='late'&&contract.due+7<=s.day)))continue;const lateReady=contract.revealed&&contract.outcome==='late'&&contract.due+7<=s.day;contract.revealed=true;const amount=contract.balance;
   if(contract.outcome==='late'&&!lateReady){delayed+=amount;continue;}
   contract.balance=0;if(contract.outcome==='default'){badDebt+=amount;add(contract.id+'-bad-debt','确认客户无法偿还货款',{receivable:-amount,profit:-amount},'operating',{loss:amount,kind:'badDebt'});}
   else{collected+=amount;contract.paid+=amount;add(contract.id+'-collection','按期收回已经交货的货款',{cash:amount,receivable:-amount},'operating',{kind:'collection'});}
  }});if(!c.facts['course-collection'])c.facts['course-collection']={collected,badDebt,delayed};if(c.daily&&s.answers['course-collection'])openDay(s,post,s.day,false);return true;
 }
 if(action==='keep-course'&&s.stage==='weekSummary'&&c.week===4&&seasonWeeks(s)===4){const b=balances(s);if(b.payable||b.interestPayable||c.loan&&!c.loan.paid)return false;move(s,'courseSummary',c.daily?courseEnd(s):26,1080);c.completed=true;return true;}
 if(action==='next'&&s.answers[s.stage]){
  if(s.stage==='course-bulk'){finishWeek(s,post);return true;}
  if(c.daily&&['course-liquidity','course-payment','course-interest','course-collection'].includes(s.stage)){if(s.stage==='course-liquidity'&&s.day>=courseDay(s,23))move(s,'weekBills',s.day,c.minute);else openDay(s,post,s.day,false);return true;}
  if(s.stage.startsWith('course-spoil-close-')){move(s,c.week===3&&c.upgrade?'course-depreciation':'weekSummary');return true;}
  if(s.stage.startsWith('course-spoil-')){move(s,afterStock(s),c.week===4&&!c.daily?courseDay(s,23):s.day,c.week===4?600:c.minute);c.cart=suggestedCart(s,weekStockTarget(s));return true;}
  const next={'course-payable':'weekOrder','course-finance':'weekPurchase','course-depreciation':'weekSummary','course-payment':'weekLoan','course-interest':'weekCollect','course-liquidity':'weekBills'}[s.stage];
  if(next){move(s,next,s.stage==='course-finance'?(c.daily?courseDay(s,15):16):s.stage==='course-payment'?courseDay(s,24):s.stage==='course-interest'?courseDay(s,25):s.day,s.stage==='course-finance'?(c.daily?690:600):s.stage==='course-payment'?600:s.stage==='course-interest'?900:c.minute);c.cart=suggestedCart(s,weekStockTarget(s));return true;}
  if(s.stage==='course-receivable'||s.stage==='course-collection'){finishWeek(s,post);return true;}
 }
 return null;
}
export function validateCourse(s){if(!s.course)return;const c=s.course;if(c.version!==1||!Number.isInteger(c.week)||c.week<1||c.week>seasonWeeks(s)||![4,8].includes(seasonWeeks(s))||!Array.isArray(c.contracts)||c.contracts.length>3||c.contracts.some(v=>!['ontime','late','default'].includes(v.outcome)||!Number.isSafeInteger(v.balance)||v.balance<0||v.balance>v.total)||c.contracts.reduce((n,v)=>n+v.balance,0)!==balances(s).receivable)throw Error('经营周次或合同不正确');const rain=c.rain;if(!rain||typeof rain.eligible!=='boolean'||typeof rain.quarantined!=='boolean'||typeof rain.settled!=='boolean'||!Array.isArray(rain.closedDays)||rain.closedDays.length>3||new Set(rain.closedDays).size!==rain.closedDays.length||rain.closedDays.some(day=>![16,17,18].map(n=>courseDay(s,n)).includes(day)||day>s.day)||!Number.isSafeInteger(rain.quantity)||rain.quantity<0)throw Error('雨天盘点进度不正确');validateStock(s);validateDaily(s);validateSummer(s);}

const pick=(text,why='')=>[text,why],lesson=(terms,extra='')=>({terms,extra});
function amounts(correct,others){const unique=[...new Set([correct,...others])];if(unique.length<2)unique.push(correct+100);return unique.slice(0,3).map(n=>pick(`${money(n)} 元`,n===correct?'':'按这笔交易实际尚未收付的金额计算，不把已收付部分再算一次。'));}
export function courseQuestion(s){const summer=summerQuestion(s);if(summer)return summer;const c=s.course,f=c?.facts?.[s.stage];if(!c||!f)return null;let data;
 if(s.stage.startsWith('course-spoil-'))data={concept:'存货报损',title:'过期原料下架，哪两个数变了？',lead:`本周盘点发现 ${f.items.map(v=>v.name+' '+v.quantity+v.unit).join('、')} 已过游戏保质期，原采购成本 ${money(f.cost)} 元。`,lesson:lesson(['shelfLife','spoilage']),choices:[pick('存货减少，报损损失增加'),pick('存货减少，现金再减少','这些原料的钱已经在采购时付出或形成欠款；下架不会再付一次。'),pick('仍留在存货里，不用处理','过期后不能继续用于销售，应从可用库存和账面存货中移出。')],explain:`存货减少 ${money(f.cost)} 元，同时记录报损损失 ${money(f.cost)} 元；这次没有新的现金收付，仍可使用的原料和包材继续保留。`};
 if(s.stage.startsWith('course-spoil-')&&f.reason==='rain')data=f.cost?{concept:'存货报损',title:'这些变质的柠檬，应该记多少报损？',lead:f.quantity*2===f.beforeQuantity?`这一周连日下雨。盘点这箱柠檬，原账面价值 ${money(f.cost*2)} 元，一半受潮变质（${f.quantity} 克），不能再用。`:`周末盘点确认 ${f.quantity} 克柠檬受潮变质，不能再用。采购价每 500 克 10 元。`,lesson:lesson(['spoilage']),choices:amounts(f.cost,[f.cost*2,0]),explain:`${f.quantity*2===f.beforeQuantity?`存货报损＝${money(f.cost*2)} 元 × 1/2＝${money(f.cost)} 元。`:`存货报损＝${f.quantity} 克 × 10 元 ÷ 500 克＝${money(f.cost)} 元。`}存货和利润各减少 ${money(f.cost)} 元；采购款以前已经支付或形成欠款，这次现金不再减少。正常的原料、杯子和吸管继续保留。`}:{concept:'存货报损',title:'盘点没有发现坏掉的柠檬，还要记报损吗？',lead:'这一周连日下雨。你备货较少，盘点时没有确认变质的柠檬。',lesson:lesson(['spoilage']),choices:[pick('不用，按实际变质数量记；这次是 0 元'),pick('要，所有采购都先损失一半')],explain:'存货报损依据实际损坏、变质的材料计算，不每天固定扣一个比例。这次没有确认损失，存货与利润都不因此减少。'};
 if(s.stage==='course-bulk')data={concept:'毛利',title:'这笔团购，一共带来多少毛利？',lead:`本次团购交付 ${f.quantity} 杯，每杯现结 4 元，每杯原料和包材成本 2 元。`,lesson:lesson(['gross','revenue']),choices:amounts(f.revenue-f.cost,[f.revenue,f.cost+f.quantity*100]),explain:`毛利＝营业收入 ${money(f.revenue)}－营业成本 ${money(f.cost)}＝${money(f.revenue-f.cost)} 元。每杯比日常零售少赚 1 元；团购靠确定的批量销量来弥补差额，交茶时货款已经收齐。`};
 if(s.stage==='course-payable')data={concept:'应付账款',title:'这次采购，新增多少应付账款？',lead:`原料和包材共 ${money(f.cost)} 元，已经付了 ${money(f.paid)} 元，余款约定第 4 周周二付清。`,lesson:lesson(['payable']),choices:amounts(f.credit,[f.cost,f.paid]),explain:`新增应付账款＝采购价款 ${money(f.cost)}－已付 ${money(f.paid)}＝${money(f.credit)} 元。采购形成存货，尚未售出的部分没有立即变成营业成本。`};
 if(s.stage==='course-receivable')data={concept:'应收账款',title:'这笔交货，留下多少应收账款？',lead:`已经交付 ${f.quantity} 杯，营业收入 ${money(f.revenue)} 元，当场收到 ${money(f.cash)} 元。`,lesson:lesson(['receivable','revenue']),choices:amounts(f.receivable,[f.revenue,f.cash]),explain:`应收账款＝已交付价款 ${money(f.revenue)}－已收现金 ${money(f.cash)}＝${money(f.receivable)} 元。营业收入按交货确认，不等到回款时再确认。`};
 if(s.stage==='course-finance')data={concept:'借款与经营利润',title:'借入 32 元，会直接增加多少净利润？',lead:f.choice==='loan'?'压汁机借款已到账，32 元本金按约定在第 4 周归还，另有两周合计 2 元利息。':'设备店同时提供借入 32 元的方案。只看借款本金到账这一件事。',lesson:lesson(['loan','interest']),choices:[pick('0 元'),pick('32 元','借款增加现金，同时增加还款义务，本金不是营业收入。'),pick('30 元','不能把借款本金减去利息当作经营利润；本金与费用需要分开处理。')],explain:'借款本金增加现金和负债，不直接增加利润。借款利息是费用，本局按两周每周 1 元计提，实际还本时也不会再扣一次本金利润。'};
 if(s.stage==='course-depreciation')data={concept:'折旧',title:'本周计提 1 元折旧，现金还要再少 1 元吗？',lead:'新压汁机买价 32 元，游戏规则按 32 周使用、每周折旧 1 元。购机款已经在买设备时支付。',lesson:lesson(['depreciation']),choices:[pick('现金不变，固定资产账面价值和利润各减少 1 元'),pick('现金、固定资产和利润都减少 1 元','折旧分摊已购设备的成本，没有在本周再付一次购机款。')],explain:'本周设备用于制茶，1 元折旧计入营业成本，同时减少固定资产账面价值；这是一笔不新增现金收付的成本。本局原有旧摊桌和手动压汁器暂不计折旧。'};
 if(s.stage==='course-payment')data={concept:'应付账款',title:'付清这笔旧账，利润会再少一遍吗？',lead:`今天付给供应商 ${money(f.amount)} 元，冲掉此前采购已经记下的欠款。`,lesson:lesson(['payable','cash']),choices:[pick('不会；现金和应付账款同时减少'),pick('会；再增加同额营业成本','原料在售出时才结转成本；付款偿还已有欠款不能把成本再记一遍。')],explain:`现金减少 ${money(f.amount)} 元，应付账款也减少 ${money(f.amount)} 元。这次偿付本身不改变利润。`};
 if(s.stage==='course-interest')data={concept:'本金与利息',title:'这次还本付息，还要再减少多少净利润？',lead:`本次支付本金 ${money(f.principal)} 元、利息 ${money(f.interest)} 元。两周的利息已分别在各周计提为费用。`,lesson:lesson(['interest','interestPayable']),choices:amounts(0,[f.interest,f.principal+f.interest]),explain:'本金归还只减少现金和借款本金；已计提的利息支付只减少现金和应付利息。利息费用此前已经记过，不能在付款时重复减少利润。'};
 if(s.stage==='course-liquidity')data={concept:'流动性',title:f.profit>0?'经营已有利润，为什么还要单独看资金安排？':'除了经营利润，为什么还要单独看资金安排？',lead:`本摊位累计净利润 ${money(f.profit)} 元，钱盒 ${money(f.cash)} 元，应收账款 ${money(f.receivable)} 元，本周需处理的供应商款与设备借款本息 ${money(f.due)} 元。`,lesson:lesson(['liquidity','cashflow']),choices:[pick('收入可能尚未回款，买设备、采购和还本也会影响可用现金'),pick('只要资产总额大于负债，付款时现金就一定够','设备和未收货款也是资产，但未必能在付款时及时变成现金。'),pick('借款本金可以当作营业收入来提高利润','借款会带来还款义务，不属于营业收入，不能靠这样改变利润补缺口。')],explain:'流动性关注能否按期拿出足够资金。利润表回答经营赚了多少，现金流量表和合同日期帮助判断什么时候能付得起钱；三张表需要结合起来看。'};
 if(s.stage==='course-collection')data={concept:'回款与现金流',title:f.collected?'货款到账，营业收入还要再增加吗？':'这周没有新增回款，以前的营业收入要重记吗？',lead:`本周实际回款 ${money(f.collected)} 元，延期货款 ${money(f.delayed)} 元，确认无法收回 ${money(f.badDebt)} 元。都来自本摊位以前已经交付的茶。`,lesson:lesson(f.badDebt?['receivable','cashflow','badDebt']:['receivable','cashflow']),choices:[pick('不重复确认营业收入，按实际回款和欠款状态分别处理'),pick('按实际回款金额再确认一次营业收入','交货时已经确认收入，回款时再记会把同一笔销售重复计算。')],explain:`实际回款增加现金并减少应收账款；延期的 ${money(f.delayed)} 元仍保留为应收账款，确认无法收回的 ${money(f.badDebt)} 元单独记录坏账损失。`};
 return build(s,s.stage,data);
}
