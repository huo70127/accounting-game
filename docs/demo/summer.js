import {balances,report,ownership,money,queueBook} from './accounting.js';
import {build} from './questions-v2.js';
import {eventRandom} from './random.js';
import {courseDay,businessDay,weekEnd} from './calendar.js';
import {openDay,startDay,dayResult} from './daily.js';
import {possibleCups} from './procurement.js';
import {PARTNER_CASH,PLAYER_SHARE,WAGE_PER_SHIFT,NIGHT_FEE,hasSummer,seasonWeeks,staffing,partnered,resaleQuote} from './summer-rules.js';

export const SUMMER_QUESTIONS=['summerDebt','summerEquity','summerShares','summerFunding','summerRevenue','summerMargin','summerWages','summerAccrual','summerPayable','summerPayment','summerWageFlow','summerFixed','summerVariable','summerBreakEven','summerNightResult','summerParent','summerDisposal','summerDividend','summerOwnership','summerRetained'];
export const SUMMER_STAGES=['summerPartner','summerSchedule','summerPayroll','summerNight','summerParentDue','summerClosing','summerDistribution',...SUMMER_QUESTIONS];
export function enableSummer(s){
 if(!hasSummer(s))return;
 s.course.summer??={version:1,partner:null,pastryStock:0,schedule:null,night:null,facts:{},nexts:{},distributed:false,payouts:[]};
 const c=s.course;
 if(c.week===4&&c.completed&&s.stage==='courseSummary'&&!s.liquidation){c.completed=false;s.stage='weekSummary';}
}
const go=(s,stage)=>s.stage=stage;
function fact(s,key,data,next){s.course.summer.facts[key]=data;s.course.summer.nexts[key]=next;go(s,key);}
function refreshClosingRecord(s){const d=s.course.daily,record=d.records.find(v=>v.day===s.day);if(record)Object.assign(record,dayResult(s));}
export function payrollDue(s){return balances(s).wagesPayable;}
export function parentDue(s){return Math.min(3200,balances(s).loan-(s.course.loan&&!s.course.loan.paid?s.course.loan.principal:0));}
export function nightDemand(s){const n=eventRandom(s.seed,'summer:night:weather');return n<.2?4:n<.7?12:24;}
export function afterSummerWeek(s){
 const c=s.course,u=c.summer;if(!hasSummer(s))return;
 if(c.week>=6&&payrollDue(s)>0){go(s,'summerPayroll');return;}
 if(c.week===8&&parentDue(s)>0)go(s,'summerParentDue');
}
function finishPayroll(s,post){
 const amount=payrollDue(s);if(balances(s).cash<amount)return false;
 if(amount)post(s,`w${s.course.week}-wage-payment`,`支付本周已经确认的职工薪酬 ${money(amount)} 元`,{cash:-amount,wagesPayable:-amount},'operating',{kind:'wage-payment'});
 refreshClosingRecord(s);
 if(!s.answers.summerPayment)fact(s,'summerPayment',{amount},'summerWageFlow');
 else go(s,s.course.week===8&&parentDue(s)>0?'summerParentDue':'weekSummary');
 return true;
}
export function actSummer(s,action,value,post){
 if(!hasSummer(s))return null;
 enableSummer(s);const c=s.course,u=c.summer,b=balances(s),w=c.week;
 if(action==='week-open'&&s.stage==='weekStart'&&w>=5){startDay(s);c.minute=570;go(s,({5:'summerPartner',6:'summerSchedule',7:'summerNight',8:'dailyOpen'})[w]);if(w===8)openDay(s,post,s.day,false);return true;}
 if(action==='summer-partner'&&s.stage==='summerPartner'&&['yes','no'].includes(value)){
  u.partner=value==='yes';c.minute=600;
  if(u.partner)post(s,'summer-partner-investment','朋友投入 120 元，共同经营茶点摊；约定朋友 25%、你 75%',{cash:PARTNER_CASH,capital:PARTNER_CASH},'financing',{kind:'partner-investment'});
  fact(s,'summerDebt',{},'summerEquity');return true;
 }
 if(action==='summer-schedule'&&s.stage==='summerSchedule'&&['six','five','hire'].includes(value)){
  u.schedule=value;c.minute=600;fact(s,'summerWages',{hired:value==='hire',amount:2*WAGE_PER_SHIFT},'open');return true;
 }
 if(action==='daily-close'&&s.stage==='dailySold'){
  const sales=s.tx.filter(t=>t.kind==='sale'&&t.storyAt?.day===s.day);
  if(w>=5&&!s.answers.summerRevenue&&sales.length){const revenue=sales.reduce((n,t)=>n+t.revenue,0),cost=sales.reduce((n,t)=>n+t.cost,0),bundles=sales.reduce((n,t)=>n+(t.bundles||0),0);fact(s,'summerRevenue',{revenue,cost,bundles,partner:partnered(s)},'summerMargin');return true;}
  if(w>=6&&staffing(s).helper&&!s.answers.summerAccrual){fact(s,'summerAccrual',{amount:WAGE_PER_SHIFT,payable:b.wagesPayable},'summerPayable');return true;}
  if(w===7&&u.night?.joined&&businessDay(s)===48&&!s.answers.summerNightResult){const revenue=sales.reduce((n,t)=>n+t.revenue,0),cost=sales.reduce((n,t)=>n+t.cost,0);fact(s,'summerNightResult',{revenue,cost,fee:NIGHT_FEE,quantity:sales.reduce((n,t)=>n+t.quantity,0)},'dailySold');return true;}
 }
 if(action==='summer-payroll'&&s.stage==='summerPayroll')return finishPayroll(s,post);
 if(action==='summer-night'&&s.stage==='summerNight'&&['yes','no'].includes(value)){
  u.night={joined:value==='yes',paid:false};c.minute=600;fact(s,'summerFixed',{joined:u.night.joined},'summerVariable');return true;
 }
 if(action==='summer-parent-pay'&&s.stage==='summerParentDue'){
  const amount=parentDue(s);if(b.cash<amount)return false;c.minute=Math.max(c.minute,1090);
  if(amount)post(s,'summer-parent-repayment','暑假结束，归还父母借款本金 32 元',{cash:-amount,loan:-amount},'financing',{kind:'loan-repayment'});
  fact(s,'summerParent',{amount},'weekSummary');refreshClosingRecord(s);return true;
 }
 if(action==='keep-course'&&s.stage==='weekSummary'&&w===8){go(s,'summerClosing');c.minute=Math.max(c.minute,1100);return true;}
 if(action==='summer-keep'&&s.stage==='summerClosing'){
  const equipment=b.equipment;fact(s,'summerDisposal',{keep:true,equipment,upgrade:c.upgrade,depreciation:s.tx.filter(t=>t.kind==='depreciation').reduce((n,t)=>n+t.cost,0)},'summerDistribution');return true;
 }
 if(action==='summer-dividend'&&s.stage==='summerDistribution'&&[0,10000].includes(value)){
  const available=Math.max(0,b.profit-b.distributions);if(value>available||value>b.cash||b.wagesPayable||parentDue(s)>0)return false;
  const ratio=ownership(s).ratio,player=Math.floor(value*ratio),friend=value-player;
  if(value){post(s,'summer-dividend',`分配利润 ${money(value)} 元：你 ${money(player)} 元、朋友 ${money(friend)} 元`,{cash:-value,distributions:value},'financing',{kind:'owner-distribution',player,friend});u.payouts.push({kind:'dividend',amount:value,player,friend});}
  fact(s,'summerDividend',{amount:value,profit:b.profit},'summerOwnership');u.facts.summerOwnership={amount:value,ratio,player};u.facts.summerRetained={keep:true,profit:b.profit,distributed:b.distributions+value};refreshClosingRecord(s);return true;
 }
 if(action==='next'&&SUMMER_QUESTIONS.includes(s.stage)&&s.answers[s.stage]){
  const stage=s.stage,next=u.nexts[stage];
  if(stage==='summerDebt')fact(s,next,{amount:PARTNER_CASH,accepted:u.partner},'summerShares');
  else if(stage==='summerEquity')fact(s,next,{accepted:u.partner,ratio:PLAYER_SHARE},'summerFunding');
  else if(stage==='summerShares')fact(s,next,{accepted:u.partner},'open');
  else if(stage==='summerRevenue')fact(s,next,u.facts.summerRevenue,'dailySold');
  else if(stage==='summerAccrual')fact(s,next,u.facts.summerAccrual,'dailySold');
  else if(stage==='summerPayment')fact(s,next,u.facts.summerPayment,w===8&&parentDue(s)>0?'summerParentDue':'weekSummary');
  else if(stage==='summerFixed')fact(s,next,{},'summerBreakEven');
  else if(stage==='summerVariable')fact(s,next,{},'open');
  else if(stage==='summerDividend'){go(s,'summerOwnership');u.nexts.summerOwnership='summerRetained';}
  else if(stage==='summerOwnership'){go(s,'summerRetained');u.nexts.summerRetained=u.facts.summerRetained.keep?'complete':'results';}
  else if(next==='open')openDay(s,post,s.day,false);
  else if(next==='complete'){c.completed=true;go(s,'courseSummary');}
  else if(next)go(s,next);
  else return false;
  return true;
 }
 return null;
}
export function afterSummerAssetSale(s,before){
 if(!hasSummer(s)||s.course.week!==8||s.answers.summerDisposal||s.liquidation?.reason!=='completed')return;
 const cash=resaleQuote({...s,tx:s.tx.filter(t=>t.id!=='liq-equipment')},'equipment');
 fact(s,'summerDisposal',{keep:false,equipment:before.equipment,cash,loss:before.equipment-cash},'liquidation');refreshClosingRecord(s);
}
export function afterSummerSettlement(s,post){
 if(!hasSummer(s))return;
 const u=s.course.summer,b=balances(s),r=report(s);
 if(r.liabilities||!b.capital){u.distributed=false;return;}
 const amount=b.cash,ratio=ownership(s).ratio,player=Math.floor(amount*ratio),friend=amount-player;
 if(amount){post(s,'summer-liquidation-distribution',`分配清算剩余财产 ${money(amount)} 元：你 ${money(player)} 元、朋友 ${money(friend)} 元`,{cash:-amount,distributions:amount},'financing',{kind:'owner-distribution',player,friend});u.payouts.push({kind:'liquidation',amount,player,friend});}
 u.distributed=true;u.finalEquity=r.equity;refreshClosingRecord(s);if(s.course.week===8&&s.liquidation?.reason==='completed')s.course.completed=true;
 if(s.course.week===8&&!s.answers.summerDividend){fact(s,'summerDividend',{amount,profit:b.profit,liquidation:true},'summerOwnership');u.facts.summerOwnership={amount,ratio,player};u.facts.summerRetained={keep:false,profit:b.profit,distributed:b.distributions+amount};}
}
export function validateSummer(s){
 if(!hasSummer(s))return;const u=s.course.summer;
 if(!u||u.version!==1||![null,true,false].includes(u.partner)||!Number.isInteger(u.pastryStock)||u.pastryStock<0||u.pastryStock>6||![null,'six','five','hire'].includes(u.schedule)||!Array.isArray(u.payouts)||u.payouts.some(p=>!Number.isSafeInteger(p.amount)||p.amount<0||p.player+p.friend!==p.amount)||balances(s).wagesPayable<0||balances(s).distributions<0)throw Error('八周经营状态不正确');
}
const pick=(text,why='')=>[text,why];
const amounts=(correct,others)=>{const values=[...new Set([correct,...others])];if(values.length<2)values.push(correct+100);return values.slice(0,3).map(n=>pick(`${money(n)} 元`,n===correct?'':'把本笔收入、成本、负债和现金变化分别列出，再按题目所问计算。'));};
export function summerQuestion(s){
 const u=s.course?.summer,f=u?.facts?.[s.stage];if(!f||!SUMMER_QUESTIONS.includes(s.stage))return null;
 const terms=(...keys)=>({terms:keys}),data={};let q;
 switch(s.stage){
 case 'summerDebt':q={concept:'债权',title:'父母持有的是哪种权利？',lead:'父母借给摊位的 32 元，约定在暑假最后一周归还。',lesson:terms('debt','ownership'),choices:[pick('债权'),pick('股权','借款形成按约收回款项的权利，不会自动取得所有权。')],explain:'父母持有债权，摊位承担还款义务。朋友成为共同所有者，持有股权，并承担经营风险。'};break;
 case 'summerEquity':q={concept:'股权',title:'朋友投入资金，利润增加多少？',lead:`${f.accepted?'朋友已经投入':'朋友提出投入'} 120 元，一起经营茶点摊。只看出资到账这件事。`,lesson:terms('ownership','capital'),choices:amounts(0,[12000,9000]),explain:'投入资金增加现金与所有者权益，不属于营业收入，也不增加利润。朋友的点心手艺与持续经营投入是协商份额的理由，不把劳动随意记成资产。'};break;
 case 'summerShares':q={concept:'持股比例',title:'这份协议怎样分清所有权？',lead:'朋友负责点心备料制作，也投入 120 元；你带来已有的摊位、设备、熟客并继续经营。双方约定你占 75%、朋友占 25%。',lesson:terms('ownership'),choices:[pick('按约定持有 75% 和 25%'),pick('只按最初投入现金的比例计算','份额是结合已有生意与后续投入协商的，本次不按现金出资比例自动决定。'),pick('每次卖茶收款都立即分走 25%','先记共同摊位的收入与成本，利润及剩余财产按协议和实际条件分配。')],explain:'本次份额由双方协商。朋友共同承担经营风险，清偿债务后按约定参与剩余财产分配，没有保证返还 120 元的条款。拒绝入股则仍由你持有 100%。'};break;
 case 'summerFunding':q={concept:'筹资活动',title:'入股资金属于哪类现金流量？',lead:'从共同摊位的角度看朋友投入的现金。',lesson:terms('financing'),choices:[pick('筹资活动'),pick('经营活动','日常销售与经营付款属于经营活动。'),pick('投资活动','朋友是在投资，摊位取得资金的这一笔属于筹资。')],explain:'摊位吸收投资取得现金，列筹资活动。是否接受这份方案，由你决定。'};break;
 case 'summerRevenue':q={concept:'营业收入',title:'今天摊位的营业收入是多少？',lead:`今天全部订单已交付，实收 ${money(f.revenue)} 元，材料成本 ${money(f.cost)} 元。${f.partner?`其中卖出 ${f.bundles} 份茶点套餐；点心和茶都是共同摊位的商品。`:''}`,lesson:terms('revenue'),choices:amounts(f.revenue,[f.revenue-f.cost,f.cost]),explain:`营业收入为 ${money(f.revenue)} 元。${f.partner?'共同摊位承担茶与点心的供货责任，全部销售价款确认收入；朋友的份额不在每次收款时扣掉。':'经营收入与投入资金需要分开。'}成本另行扣除。`};break;
 case 'summerMargin':q={concept:'毛利',title:'今天这些订单的毛利是多少？',lead:`营业收入 ${money(f.revenue)} 元，对应材料成本 ${money(f.cost)} 元。`,lesson:terms('gross'),choices:amounts(f.revenue-f.cost,[f.revenue,f.cost]),explain:`毛利＝${money(f.revenue)}－${money(f.cost)}＝${money(f.revenue-f.cost)} 元。之后还需考虑工资、摊位费、设备折旧等成本费用；这里是这些销售交易的毛利。`};break;
 case 'summerWages':q={concept:'职工薪酬',title:'每周两天代班，工资共多少？',lead:`帮手每周六、周日各工作一天，每天 12 元。${f.hired?'你已约好这份安排。':'这是眼前可选的用工方案，尚未雇人。'}`,lesson:terms('wages'),choices:amounts(2400,[1200,8400]),explain:'每周职工薪酬＝2×12＝24 元。和自己干六天相比，雇人替你上一天并多开一天；能否增加利润，还取决于实际客流和成本。你也换来了固定的两天休息与每天营业的安排。'};break;
 case 'summerAccrual':q={concept:'应付职工薪酬',title:'工作已经完成，工资还没付，怎样记录？',lead:'帮手已经完成一天代班，工资 12 元约定周日收摊后结算。',lesson:terms('wagesPayable','salesExpense'),choices:[pick('确认本期费用，同时增加应付职工薪酬'),pick('等发工资时才确认费用','劳动已经发生，费用属于本期；付款日期与确认费用日期可能不同。'),pick('直接把现金减少 12 元','尚未实际付款，现金还没有减少。')],explain:'本章代班出摊的薪酬列销售费用。已完成一天工作，销售费用增加 12 元、应付职工薪酬增加 12 元，现金暂未变化。即使当天没有订单，约定的代班工资仍需确认。'};break;
 case 'summerPayable':q={concept:'应付职工薪酬',title:'现在还有多少工资没有支付？',lead:`帮手本周已经代班 1 天，每天工资 12 元，还没发工资；明天还有一天约定的班次。`,lesson:terms('wagesPayable'),choices:amounts(f.payable,[0,f.payable+1200]),explain:`已完成工作的应付职工薪酬为 ${money(f.payable)} 元，列资产负债表负债。尚未提供的劳动不提前确认工资费用。已完成但未支付的工作报酬不能漏记；付款时再冲减。`};break;
 case 'summerPayment':q={concept:'应付职工薪酬',title:'发工资时，利润还要再减少吗？',lead:`已支付本周此前确认的工资 ${money(f.amount)} 元。`,lesson:terms('wagesPayable'),choices:amounts(0,[f.amount,f.amount*2]),explain:'本次现金减少、应付职工薪酬减少。费用在帮手完成工作时已经确认，发工资不能重复扣一次利润。'};break;
 case 'summerWageFlow':q={concept:'经营活动',title:'发工资属于哪类现金流量？',lead:`这次支付职工薪酬 ${money(f.amount)} 元。`,lesson:terms('cashflow'),choices:[pick('经营活动'),pick('筹资活动','员工提供劳动、取得工资，本次不是借款或股东分配。'),pick('投资活动','工资支付不是购置固定资产。')],explain:'支付职工薪酬列经营活动现金流出。股东利润分配则列筹资活动，两种付款对应的关系不同。'};break;
 case 'summerFixed':q={concept:'固定成本',title:'本场 24 元摊位费属于哪一种成本？',lead:'本场夜市无论卖出几杯，摊位费都是 24 元。先用单卖茶的报价算一算。',lesson:terms('fixedCost','salesExpense'),choices:[pick('固定成本'),pick('变动成本','在本场既定活动规模内，这笔费用不随销量改变。')],explain:'本场活动内摊位费为固定成本。固定不代表永远不变；换活动或加摊位时可能不同。'};break;
 case 'summerVariable':q={concept:'变动成本',title:'哪一项会随多卖一杯茶而增加？',lead:'在当前设备产能范围内，单杯售价 5 元，原料与包材 2 元。',lesson:terms('variableCost'),choices:[pick('制作这杯茶耗用的原料、杯和吸管'),pick('本场固定的 24 元摊位费','本场摊位费不会按杯数重复支付。'),pick('以前购买机器的整笔价款','购买机器形成固定资产，不能每多卖一杯就再扣一次购价。')],explain:'多卖一杯就多消耗一份材料，本例每杯变动成本为 2 元。原有设备折旧仍在周末单独计入本周营业成本。'};break;
 case 'summerBreakEven':q={concept:'盈亏平衡点',title:'至少卖几杯，能覆盖这场新增成本？',lead:'每杯 5 元、材料每杯 2 元、夜市摊位费 24 元。只考虑题目列出的本场新增收支。',lesson:terms('breakEven'),choices:[pick('8 杯'),pick('5 杯','5 杯虽收 25 元，还需扣掉材料 10 元，仍不足覆盖摊位费。'),pick('12 杯','12 杯已经盈利，题目问刚好覆盖成本需要的最少杯数。')],explain:'每杯留下 5－2＝3 元覆盖摊位费。24÷3＝8 杯。本场只卖茶，点心不进夜市场地；原有工资和每周折旧仍在周报体现，这里不是整个摊位所有成本的盈亏平衡点。'};break;
 case 'summerNightResult':q={concept:'营业利润',title:'这场夜市新增的收益是多少？',lead:`实际卖出 ${f.quantity} 杯，营业收入 ${money(f.revenue)} 元，材料成本 ${money(f.cost)} 元，另付摊位费 ${money(f.fee)} 元。`,lesson:terms('fixedCost','variableCost'),choices:amounts(f.revenue-f.cost-f.fee,[f.revenue-f.cost,f.revenue]),explain:`活动新增收益＝${money(f.revenue)}－${money(f.cost)}－${money(f.fee)}＝${money(f.revenue-f.cost-f.fee)} 元。客流可能冷清，已支付的摊位费仍需承担；本周原有工资与折旧另在周报中核对。`};break;
 case 'summerParent':q={concept:'借款本金',title:'归还本金，这次利润减少多少？',lead:`刚刚归还父母借款本金 ${money(f.amount)} 元，没有利息。`,lesson:terms('loan'),choices:amounts(0,[f.amount,3200]),explain:'归还本金同时减少现金与借款负债，不增加费用。借款到账时没有产生营业收入，还本金也不能当作成本再扣除。'};break;
 case 'summerDisposal':q=f.keep?{concept:'固定资产',title:'继续使用的设备，账面价值是多少？',lead:`本局固定资产在本周计提折旧后合计 ${money(f.equipment)} 元。${f.upgrade?`其中新机器原价 32 元、累计折旧 ${money(f.depreciation)} 元，原有工具 16 元。`:'原有摊桌与手动压汁器共 16 元，本章暂不计折旧。'}`,lesson:terms('equipment','depreciation'),choices:amounts(f.equipment,[f.equipment+f.depreciation,f.depreciation]),explain:`设备继续留在摊位，按扣除已计折旧后的 ${money(f.equipment)} 元列示。没有出售就不虚构设备收款或处置损失。`}:{concept:'固定资产',title:'卖出设备，这次处置损失是多少？',lead:`设备账面价值 ${money(f.equipment)} 元，实际卖得 ${money(f.cash)} 元。账面价值已经扣过以前计提的折旧。`,lesson:terms('equipment'),choices:amounts(f.loss,[f.cash,f.equipment]),explain:`设备处置损失＝账面价值－实际收回金额＝${money(f.equipment)}－${money(f.cash)}＝${money(f.loss)} 元。卖设备收到的钱列投资活动，不能当成卖茶的营业收入；此前折旧也不能再算一次。`};break;
 case 'summerDividend':q={concept:'利润分配',title:'向所有者分配，会再减少净利润吗？',lead:f.amount?`这次${f.liquidation?'清算剩余财产':'利润'}分配共 ${money(f.amount)} 元。分配前累计净利润 ${money(f.profit)} 元。`:'你选择先不分配，把资金留在摊位。',lesson:terms('distribution'),choices:amounts(0,[f.amount||10000,(f.amount||10000)*2]),explain:'向所有者分配减少现金与所有者权益，不是经营费用，不再次减少净利润。清算剩余财产中还可能包含投入资本，不能全部称作个人利润。'};break;
 case 'summerOwnership':q={concept:'持股比例',title:'按协议，这次你收到多少？',lead:`本次实际分配 ${money(f.amount)} 元，你持有 ${Math.round(f.ratio*100)}%。${f.amount?'':'本次没有分配。'}`,lesson:terms('ownership','distribution'),choices:amounts(f.player,[f.amount,Math.max(100,f.amount-f.player)]),explain:`本次个人到账＝${money(f.amount)}×${Math.round(f.ratio*100)}%＝${money(f.player)} 元。没有入股时由你持有 100%；分配总额和个人到账需要分清。`};break;
 case 'summerRetained':q=f.keep?{concept:'未分配利润',title:'还有多少利润留在摊位？',lead:`累计净利润 ${money(f.profit)} 元，已经分配利润 ${money(f.distributed)} 元。`,lesson:terms('retained'),choices:amounts(f.profit-f.distributed,[f.profit,f.distributed]),explain:`本章未分配利润＝累计净利润－已分配利润＝${money(f.profit-f.distributed)} 元。摊位还有原料和设备，未分配利润不等于钱盒余额。`}:{concept:'净利润',title:'钱盒归零，八周净利润是多少？',lead:`清算资产并处理债务后，累计净利润 ${money(f.profit)} 元；随后已经向所有者分配剩余财产。`,lesson:terms('profit','distribution'),choices:amounts(f.profit,[0,f.distributed]),explain:`八周净利润仍为 ${money(f.profit)} 元。资产负债表反映分配后的余额，利润表保留整个经营期间的成果；分配现金不会把成果抹去。`};break;
 }
 return build(s,s.stage,q);
}
