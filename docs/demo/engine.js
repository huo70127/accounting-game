import {accrueShift} from './summer-operations.js';
import {afterSummerSettlement,afterSummerAssetSale,parentDue} from './summer.js';
import {hasSummer,seasonWeeks,resaleQuote} from './summer-rules.js';
import {money,ACCOUNT_KEYS,balances,report,queueBook,bookIssues,statementRows,supplierBill,ownership,reportAvailable,isFromZero,isOpeningChapter,parseAmount,unfilledFields,normalizeBookField} from './accounting.js';
import {eventRandom,ACCEPTANCE,repayment,backupDemand} from './random.js';
import {question,challenge,LESSON_VERSION} from './questions.js';
import {storyMoment,arrivalMinute} from './timeline.js';
import {DISCOVERIES} from './discoveries.js';
import {question as legacyQuestion} from './questions-legacy.js';
import {enableCourse,actCourse,validateCourse,COURSE_STAGES,courseRecovery,dueAmount} from './course.js';
import {consume,possibleCups,expire} from './procurement.js';
import {startDay} from './daily.js';
import {settlementSteps} from './settlement.js';
import {courseEnd} from './calendar.js';
import {lessonStatus} from './lesson-topics.js';
export {ACCOUNT_KEYS,balances,report,money,bookIssues,statementRows,supplierBill,ownership,reportAvailable,isFromZero,isOpeningChapter,parseAmount,unfilledFields,normalizeBookField} from './accounting.js';
export {question} from './questions.js';
export const SAVE_KEY='lemon-stall:two-notes:v2';
export const OLD_SAVE_KEY='lemon-stall:two-notes:v1';
export const STAGES=['welcome','budget','idle','walkin','betweenCustomers','cashReceipt','dayEnd','daySummary','pocket','firstcash','parents','loanquiz','friend','fundingquiz','stall','stallbought','supply','inventory','payable','order','rejected','waiting','backup','delivery','revenue','entry','cost','margin','payment','cashflow','collect','delaycheck','late','baddebt','collection','equipment','review','liquidation','results'];
export function legacyStart(seed=1){return {schema:2,lessonVersion:LESSON_VERSION,lessonTopics:{},bookSuspended:false,discoverySeen:{},questionHints:{},questionRevisions:{loanquiz:2},challengeLessonsSeen:{},lessonsSeen:{},challengeAnswers:{},challengePicks:{},seed:seed>>>0,revision:0,stage:'welcome',day:3,choice:null,selection:null,order:null,contract:null,backup:null,collection:null,earlyRequest:null,answers:{},picks:{},rescueAttempted:false,rescued:false,pendingBook:null,bookLog:[],liquidation:null,tx:[{id:'opening',label:'承接期初结存',flow:'opening',delta:{cash:2000,inventory:2400,equipment:1600,payable:3500,capital:2500},revenue:0,cost:0,loss:0,kind:'opening',phase:'opening'}]};}
export function v17Start(seed=1){const s=legacyStart(seed);return {...s,journey:'from-zero-v1',day:1,reportLessonsSeen:[],tx:[{id:'opening',label:'一切从这里开始',flow:'opening',delta:{cash:0,inventory:0,equipment:0,payable:0,loan:0,capital:0},revenue:0,cost:0,loss:0,kind:'opening',phase:'opening'}]};}
export const CASH_CUSTOMERS=[{id:'walkin-1',quantity:2,name:'晨练回来的林阿姨',line:'「我和朋友走得热，给我们各来一杯吧。」'},{id:'walkin-2',quantity:4,name:'送完一趟快递的小周',line:'「同事们也想尝尝，给我们打包四杯。」'},{id:'walkin-3',quantity:6,name:'刚下课的六位同学',line:'「刚才有人说你家的茶好喝，我们每人一杯！」'}];
export function start(seed=1,weeks=8){const s={...v17Start(seed),journey:'opening-cash-v2',cashRound:0,completedEvents:[],openingMinute:null,openingWait:null};enableCourse(s);s.course.totalWeeks=weeks;s.course.calendarVersion=2;s.course.stockPolicyVersion=3;return s;}
export const liquidationSteps=s=>settlementSteps(s).length;
export {settlementSteps};
function post(s,id,label,delta,flow='operating',extra={},notify=true){
 if(s.tx.some(t=>t.id===id))return false;
 const before={...s,tx:s.tx.slice()},normalized=Object.fromEntries(Object.entries(delta).map(([k,v])=>[k,v===0?0:v]));
 const tx={id,label,delta:normalized,flow,storyAt:storyMoment(s),revenue:0,cost:0,loss:0,kind:id,phase:s.stage==='liquidation'?'liquidation':'business',...extra};
 const probe={...s,tx:[...s.tx,tx]},r=report(probe);
 if(r.assets!==r.liabilities+r.equity||['cash','inventory','equipment','receivable','payable','loan','interestPayable','wagesPayable','distributions'].some(k=>r.b[k]<0))throw Error('交易不能对账');
 s.tx.push(tx);if(notify){queueBook(before,s,[id]);if(tx.kind==='sale'&&s.pendingBook){s.pendingBook.preview=true;s.bookSuspended=true;}}return true;
}
function sell(s,qty,upfront,id='sale'){
 const total=qty*500,cost=qty*200;
 if(s.course&&!consume(s,qty))throw Error('配方原料不足');
 post(s,id,`交付 ${qty} 杯柠檬茶`,{cash:upfront,receivable:total-upfront,inventory:-cost,profit:total-cost},'operating',{revenue:total,cost,kind:'sale',quantity:qty});s.stage='delivery';
}
function spoil(s){const amount=balances(s).inventory;if(amount)post(s,'spoilage','滞销茶料过期报损',{inventory:-amount,profit:-amount},'operating',{loss:amount,kind:'spoilage'});}
export function recovery(s){const ar=balances(s).receivable;if(!ar)return {cash:0,loss:0,outcome:'none'};if(s.course?.contracts.length)return courseRecovery(s);const outcome=s.contract?.outcome||'ontime';const rate=outcome==='default'?0:outcome==='late'&&s.day<12?.7:s.day<5?.9:1;return {cash:Math.floor(ar*rate),loss:ar-Math.floor(ar*rate),outcome};}
function settlementStep(s,step,notify=true){
 const beforeStep={...s,tx:s.tx.slice()},beforeCount=s.tx.length;
 step=settlementSteps(s)[step].engineStep;
 const b=balances(s);
 if(step===0&&b.receivable){
  if(s.course?.contracts.length){const before={...s,tx:s.tx.slice()},n=s.tx.length;for(const contract of s.course.contracts){const amount=contract.balance;if(!amount)continue;const rate=contract.outcome==='default'?0:contract.outcome==='late'&&s.day<contract.due+7?.7:s.day<contract.due?.9:1,cash=Math.floor(amount*rate),loss=amount-cash;contract.balance=0;contract.revealed=true;post(s,'liq-'+contract.id,'清算处理这笔应收账款',{cash,receivable:-amount,profit:-loss},'operating',{loss,kind:contract.outcome==='default'?'badDebt':'settlementLoss'},false);}}
  else{const rec=recovery(s);post(s,'liq-ar',rec.outcome==='default'?'清算确认坏账':'清算回收应收款',{cash:rec.cash,receivable:-b.receivable,profit:-rec.loss},'operating',{loss:rec.loss,kind:rec.outcome==='default'?'badDebt':'settlementLoss'},false);if(s.contract)s.contract.revealed=true;}
 }
 if(step===1&&b.inventory){const cash=resaleQuote(s,'inventory'),loss=b.inventory-cash;if(s.course){s.stockLots=[];if(s.course.summer)s.course.summer.pastryStock=0;}post(s,'liq-stock',hasSummer(s)?'按整元报价清售剩余原料和包材':'剩余可用原料和包材按成本 75% 清售',{cash,inventory:-b.inventory,profit:-loss},'operating',{loss,kind:'settlementLoss'},false);}
 if(step===2&&b.equipment){const cash=resaleQuote(s,'equipment'),loss=b.equipment-cash;post(s,'liq-equipment','出售摊桌与压汁器',{cash,equipment:-b.equipment,profit:-loss},'investing',{loss,kind:'settlementLoss'},false);}
 if(step===3&&b.payable){const paid=Math.min(b.cash,b.payable);if(paid)post(s,'liq-pay','清偿供应商欠款',{cash:-paid,payable:-paid},'operating',{},false);}
 if(step===4&&b.loan){const paid=Math.min(b.cash,b.loan);if(paid)post(s,'liq-loan',s.course?.loan?'归还借款本金':'归还父母借款本金',{cash:-paid,loan:-paid},'financing',{},false);}
 if(step===5&&b.interestPayable){const paid=Math.min(b.cash,b.interestPayable);if(paid)post(s,'liq-interest','支付已计提的借款利息',{cash:-paid,interestPayable:-paid},'financing',{kind:'interest-payment'},false);}
 if(step===6&&b.wagesPayable){const paid=Math.min(b.cash,b.wagesPayable);if(paid)post(s,'liq-wages','支付已确认的职工薪酬',{cash:-paid,wagesPayable:-paid},'operating',{kind:'wage-payment'},false);}
 s.liquidation.step++;if(step===2&&b.equipment)afterSummerAssetSale(s,b);if(s.liquidation.step===liquidationSteps(s)){s.stage='results';afterSummerSettlement(s,(state,id,label,delta,flow,extra)=>post(state,id,label,delta,flow,extra,false));}
 if(notify&&s.tx.length>beforeCount)queueBook(beforeStep,s,s.tx.slice(beforeCount).map(t=>t.id));
}
function remember(s,id,label,at=storyMoment(s)){s.completedEvents??=[];if(!s.completedEvents.some(event=>event.id===id))s.completedEvents.push({id,label,day:at.day,minute:at.minute});}
function finishCustomer(s){const sale=s.tx.filter(t=>t.kind==='sale').at(-1);if(sale)remember(s,sale.id,`卖出 ${sale.quantity} 杯茶`,sale.storyAt||storyMoment(s));}
function beginIdle(s,round){
 s.day=3;if(s.course?.daily){startDay(s);if(round>0&&possibleCups(s)===0){s.openingWait=null;s.stage='dayEnd';return;}}s.openingMinute??=round===0?540:storyMoment(s).minute;
 s.openingWait=round<3?{id:'customer-'+round,round,target:arrivalMinute(s,round)}:{id:'closing',round:3,target:1080};s.stage='idle';
}
export function act(s,action,value,revision=s.revision){
 if(revision!==s.revision)return false;
 let book=s.pendingBook;
 if(action==='receipt-review'&&book?.preview){book.preview=false;s.bookSuspended=false;s.revision++;return true;}
 if(action==='daily-close'&&s.stage==='dailySold'&&book?.automatic){s.bookLog.push(book.id);s.pendingBook=null;s.bookSuspended=false;book=null;}
 if(action==='book-dismiss'&&book){s.bookSuspended=true;s.bookPauseCount=Math.min(2,(s.bookPauseCount||0)+1);s.revision++;return true;}
 if(action==='book-resume'&&book){s.bookSuspended=false;s.revision++;return true;}
 if(action==='discover'&&DISCOVERIES[value]&&reportAvailable(s,DISCOVERIES[value].page)&&!s.discoverySeen[value]){s.discoverySeen[value]=true;s.revision++;return true;}

 if(action==='book-page'&&book&&reportAvailable(s,value)){if(book.reminder)book.notice='';book.reminder=null;book.page=value;s.revision++;return true;}
 if(action==='book-check'&&book&&!book.checked){
  for(const field of book.fields)normalizeBookField(field);
  const enteredErrors=bookIssues(s);book.errorCounts??={};
  for(const field of book.fields)if(!enteredErrors.some(e=>e.page===field.page&&e.key===field.key))delete book.errorCounts[field.page+':'+field.key];
  if(enteredErrors.length){book.reminder=null;book.attempts++;for(const f of book.fields){const key=f.page+':'+f.key;if(enteredErrors.some(e=>e.page===f.page&&e.key===f.key))book.errorCounts[key]=(book.errorCounts[key]||0)+1;else delete book.errorCounts[key];}book.checked=false;book.page=enteredErrors[0].page;book.notice='先把这处金额改对，再继续填写。';s.revision++;return true;}
  const missing=unfilledFields(s);
  if(missing.length){const first=missing[0];book.page=first.page;book.reminder={page:first.page,key:first.key};book.notice='这里还有待填金额，接着记就好。';s.revision++;return true;}
  book.reminder=null;book.attempts++;const errors=bookIssues(s);book.errorCounts??={};
  for(const f of book.fields){const key=f.page+':'+f.key;if(errors.some(e=>e.page===f.page&&e.key===f.key))book.errorCounts[key]=(book.errorCounts[key]||0)+1;else delete book.errorCounts[key];}
  book.checked=!errors.length;book.notice=errors.length?'请修改高亮金额，核对正确后就能继续。':'金额核对正确。';if(errors.length)book.page=errors[0].page;s.revision++;return true;
 }
 if(action==='book-done'&&book){if(!book.checked&&book.fields.length)return false;const unseen=book.pages.find(page=>!book.seenPages.includes(page));if(unseen!==undefined){book.page=unseen;book.notice='这笔交易还影响了这张表，请看看高亮条目。';s.revision++;return true;}s.bookLog.push(book.id);for(const tx of s.tx.filter(t=>book.id.split('|').includes(t.id)&&t.kind!=='sale'))remember(s,tx.id,tx.label,tx.storyAt||storyMoment(s));s.pendingBook=null;s.bookSuspended=false;if(s.stage==='entry')s.stage='cost';s.revision++;return true;}
 if(book&&action!=='liquidate')return false;
 const courseResult=actCourse(s,action,value,post);if(courseResult!==null){if(courseResult)s.revision++;return courseResult;}
 if(isOpeningChapter(s)&&s.stage==='idle'&&s.openingWait&&['advance-time','skip-wait'].includes(action)){const target=s.openingWait.target,minute=action==='skip-wait'?target:value;if(!Number.isInteger(minute)||minute<=s.openingMinute||minute>target)return false;s.openingMinute=minute;if(minute===target){const round=s.openingWait.round;s.openingWait=null;if(round<3){s.cashRound=round;s.stage='walkin';}else s.stage='dayEnd';}s.revision++;return true;}
 const q=question(s),b=balances(s);let ok=false;
 if(action==='invest'&&s.stage==='pocket'){s.stage='firstcash';post(s,'owner-money','投入自己的零花钱',{cash:1200,capital:1200},'financing',{kind:'owner-investment'});ok=true;}
 if(action==='borrow'&&s.stage==='parents'){s.stage='loanquiz';const amount=isOpeningChapter(s)?3200:2000;post(s,'parent-loan',isOpeningChapter(s)?'按开摊预算向父母借入 32 元':'向父母借入 20 元',{cash:amount,loan:amount},'financing',{kind:'parent-loan'});ok=true;}
 if(action==='partner'&&s.stage==='friend'&&!isOpeningChapter(s)){s.stage='fundingquiz';post(s,'friend-money','朋友出资入股 4 元',{cash:400,capital:400},'financing',{kind:'partner-investment'});ok=true;}
 if(action==='buy-stall'&&s.stage==='stall'&&b.cash>=1600){s.stage='stallbought';s.day=2;post(s,'stall-purchase','买下二手摊桌和压汁器',{cash:-1600,equipment:1600},'investing',{kind:'stall-purchase'});ok=true;}
 if(action==='buy-stock'&&s.stage==='supply'){s.stage='inventory';s.day=isOpeningChapter(s)?2:3;post(s,'first-stock',isOpeningChapter(s)?'付现买入可做 12 杯茶的原料':'收到可做 12 杯茶的原料，周四付款',isOpeningChapter(s)?{cash:-2400,inventory:2400}:{inventory:2400,payable:2400},'operating',{kind:'stock-purchase'});ok=true;}
 if(action==='serve-cash'&&isOpeningChapter(s)&&s.stage==='walkin'){
  const customer=CASH_CUSTOMERS[s.cashRound],quantity=customer?(s.course?Math.min(customer.quantity,possibleCups(s)):customer.quantity):0;
  if(customer&&quantity&&b.inventory>=quantity*200){s.order={accepted:true,legacy:true,kind:'cash-customers'};s.choice=6000;sell(s,quantity,quantity*500,customer.id);if(s.cashRound>0)s.stage='cashReceipt';ok=true;}
  else if(customer&&s.course){remember(s,customer.id,'原料不足，这次未能成交');s.stage='stockout';ok=true;}
 }
 if(action==='keep-stall'&&isOpeningChapter(s)&&s.stage==='review'){remember(s,'day-close','今天打烊了');s.stage='daySummary';ok=true;}
 if(action==='select'&&s.stage==='order'&&[0,3000,6000].includes(value)){s.selection=value;ok=true;}
 if(action==='learn'&&q&&!s.lessonsSeen[s.stage]&&!s.answers[s.stage]){s.lessonTopics??={};s.lessonTopics[s.stage]=lessonStatus(s,q,question);s.lessonsSeen[s.stage]=true;ok=true;}
 if(action==='question-hint'&&q&&s.lessonsSeen[s.stage]&&!s.answers[s.stage]){s.questionHints[s.stage]=true;ok=true;}
 const ready=!isOpeningChapter(s)||s.lessonsSeen[s.stage];
 if(action==='pick'&&q&&ready&&!s.answers[s.stage]&&Number.isInteger(value)&&value>=0&&value<q.options.length){s.picks[s.stage]=value;if(!isOpeningChapter(s))s.lessonsSeen[s.stage]=true;ok=true;}
 if(action==='answer'&&q&&ready&&!s.answers[s.stage]&&s.picks[s.stage]===value&&Number.isInteger(value)&&value>=0&&value<q.options.length){s.answers[s.stage]={id:q.id,index:value,correct:value===q.correct,...(isOpeningChapter(s)?{helped:!!s.questionHints[s.stage]}:{})};ok=true;}
 if(action==='challenge-learn'&&s.stage==='review'&&challenge(s,value)&&!s.challengeLessonsSeen[value]){s.challengeLessonsSeen[value]=true;ok=true;}
 if(['challenge-pick','challenge-answer'].includes(action)&&s.stage==='review'&&value&&typeof value.id==='string'){
  const c=challenge(s,value.id),index=value.index;
  if(c&&(!isOpeningChapter(s)||s.challengeLessonsSeen[value.id])&&!s.challengeAnswers[value.id]&&Number.isInteger(index)&&index>=0&&index<c.options.length){
   if(action==='challenge-pick'){s.challengePicks[value.id]=index;ok=true;}
   else if(s.challengePicks[value.id]===index){s.challengeAnswers[value.id]={id:c.id,index,correct:index===c.correct};ok=true;}
  }
 }
 if(action==='next'){
  let next={welcome:isOpeningChapter(s)?'budget':isFromZero(s)?'pocket':'inventory',budget:'pocket',firstcash:'parents',loanquiz:isOpeningChapter(s)?'stall':'friend',fundingquiz:'stall',stallbought:'supply',inventory:isOpeningChapter(s)?'walkin':'payable',payable:'order',delivery:'revenue',revenue:'cost',cost:'margin',margin:isOpeningChapter(s)?'betweenCustomers':'payment',cashflow:'collect',delaycheck:'late',collection:'equipment',baddebt:'equipment',equipment:'review',dayEnd:isOpeningChapter(s)?'review':'equipment'}[s.stage];
  if(isOpeningChapter(s)&&(!q||s.answers[s.stage])){
   if(s.stage==='budget')remember(s,'budget-ready','预算算好了');
   if(s.stage==='inventory'){remember(s,'stall-ready','招牌摆好了',{day:3,minute:540});beginIdle(s,0);ok=true;next=null;}
   else if(s.stage==='margin'){finishCustomer(s);s.stage='betweenCustomers';ok=true;next=null;}
   else if(['betweenCustomers','cashReceipt'].includes(s.stage)){finishCustomer(s);beginIdle(s,s.cashRound+1);ok=true;next=null;}
   else if(s.stage==='stockout'){beginIdle(s,s.cashRound+1);ok=true;next=null;}
  }
  if(next&&(!q||s.answers[s.stage])){s.stage=next;if(isOpeningChapter(s)&&next==='walkin')s.day=3;if(next==='payment')s.day=4;if(next==='collect'){s.day=5;spoil(s);}ok=true;}
 }
 if(action==='sell'&&!isOpeningChapter(s)&&s.stage==='order'&&[0,3000,6000].includes(s.selection)){
  s.choice=s.selection;const accepted=eventRandom(s.seed,'main-customer:accept')<ACCEPTANCE[s.choice];s.order={accepted};
  if(accepted){s.contract={total:6000,upfront:s.choice,outcome:s.choice===6000?'ontime':repayment(s.seed),revealed:false,legacy:false};sell(s,12,s.choice);}else s.stage='rejected';ok=true;
 }
 if(action==='wait'&&s.stage==='rejected'){s.backup={quantity:backupDemand(s.seed)};s.stage='waiting';ok=true;}
 if(action==='reveal'&&s.stage==='waiting'){s.stage='backup';ok=true;}
 if(action==='serveBackup'&&s.stage==='backup'){const qty=s.backup.quantity;if(qty)sell(s,qty,qty*500,'backup-sale');else{const before=structuredClone(s);s.incomeIntroduced=true;s.stage='revenue';queueBook(before,s,['no-sale-review']);}ok=true;}
 if(action==='rescue'&&s.stage==='payment'&&b.cash<b.payable&&b.receivable&&!s.earlyRequest){
  s.rescueAttempted=true;const accepted=s.contract?.outcome==='ontime'&&(s.contract.legacy||eventRandom(s.seed,'main-customer:advance')<.5);
  if(accepted){const paid=Math.min(b.payable-b.cash,b.receivable);post(s,'early','协商提前收回部分货款',{cash:paid,receivable:-paid});s.rescued=true;s.earlyRequest='paid';}else s.earlyRequest='refused';ok=true;
 }
 if(action==='clear'&&s.stage==='payment'&&b.inventory){const cash=Math.floor(b.inventory*.75);post(s,'clearance','到期前折价清售库存',{cash,inventory:-b.inventory,profit:cash-b.inventory},'operating',{revenue:cash,cost:b.inventory,kind:'clearance'});ok=true;}
 if(action==='pay'&&s.stage==='payment'&&b.payable>0&&b.cash>=b.payable){post(s,'pay','周四支付供应商欠款',{cash:-b.payable,payable:-b.payable});s.stage='cashflow';ok=true;}
 if(action==='collect'&&s.stage==='collect'){
  if(s.contract)s.contract.revealed=true;
  const outcome=s.contract?.outcome||'ontime';s.collection=outcome;
  if(!b.receivable||outcome==='ontime'){if(b.receivable)post(s,'collect','周五收回货款',{cash:b.receivable,receivable:-b.receivable});s.stage=b.receivable?'collection':'equipment';}
  else if(outcome==='late')s.stage='delaycheck';
  else{post(s,'bad-debt','客户确认无法付款，确认坏账损失',{receivable:-b.receivable,profit:-b.receivable},'operating',{loss:b.receivable,kind:'badDebt'});s.stage='baddebt';}ok=true;
 }
 if(action==='waitLate'&&s.stage==='late'){s.day=12;const ar=balances(s).receivable;if(ar)post(s,'late-collect','晚一周收到货款',{cash:ar,receivable:-ar});s.stage='collection';ok=true;}
 if(action==='liquidate'&&!['liquidation','results'].includes(s.stage)){s.pendingBook=null;s.liquidation={step:0,startedAt:storyMoment(s),reason:value==='failure'&&(s.stage==='payment'&&b.cash<b.payable||dueAmount(s)>b.cash)?'failure':['review','daySummary','weekSummary','courseSummary','summerClosing'].includes(s.stage)?'completed':'early'};s.stage='liquidation';if(s.course){if(s.course.daily.shift?.day===s.day)accrueShift(s,post);const expired=expire(s,true);if(expired.cost)post(s,'liq-expired-stock',expired.reason==='rain'?'清算盘点，受潮柠檬报损':'清算盘点，先将过期原料报损',{inventory:-expired.cost,profit:-expired.cost},'operating',{kind:'spoilage',loss:expired.cost});}ok=true;}
 if(action==='settle'&&s.stage==='liquidation'&&value===s.liquidation.step){settlementStep(s,value);ok=true;}
 if(action==='quick'&&s.stage==='liquidation'){const before={...s,tx:s.tx.slice()},n=s.tx.length;while(s.stage==='liquidation')settlementStep(s,s.liquidation.step,false);if(s.tx.length>n)queueBook(before,s,s.tx.slice(n).map(t=>t.id));ok=true;}
 if(ok)s.revision++;return ok;
}
function prepareCurrent(s){
 enableCourse(s);
 if(isOpeningChapter(s)){s.completedEvents??=[];s.openingMinute??=null;s.openingWait??=null;}
 delete s.learningMode;s.lessonTopics??={};s.reportLessonsSeen??=[];s.bookSuspended??=false;s.discoverySeen??={};s.questionHints??={};s.challengeLessonsSeen??={};
 if(s.questionRevisions?.loanquiz!==2){if(!s.answers.loanquiz)delete s.picks.loanquiz;s.questionRevisions={...s.questionRevisions,loanquiz:2};}
 let p=s.pendingBook;if(p&&p.entryVersion!==2){for(const f of p.fields){const row=statementRows(s,f.page).find(r=>r.key===f.key);if(!row)continue;const entered=parseAmount(f.value);if(row.value<0&&entered.ok&&entered.cents>0)f.value='-'+String(f.value).replace(/^\+/,'');f.target=row.value;}p.entryVersion=2;p.errorCounts??={};}
 if(p&&p.statementVersion!==4){
  const old=structuredClone(p),suspended=s.bookSuspended,ids=p.id.split('|'),before={...s,tx:s.tx.filter(t=>!ids.includes(t.id))};
  if(before.tx.length)queueBook(before,s,ids);
  const current=s.pendingBook;current.statementVersion=4;current.seenPages=old.seenPages.filter(page=>current.pages.includes(page));
  current.previousDraft=[...(old.previousDraft||[]),...old.fields.filter(f=>!current.fields.some(next=>next.page===f.page&&next.key===f.key&&next.target===f.target))];
  const revised=current.previousDraft.length>0||current.fields.some(f=>!old.fields.some(v=>v.page===f.page&&v.key===f.key&&v.target===f.target));
  current.attempts=revised?0:old.attempts;current.errorCounts=revised?{}:{...old.errorCounts};
  for(const f of current.fields){const prior=old.fields.find(v=>v.page===f.page&&v.key===f.key&&v.target===f.target);if(prior)f.value=prior.value;}
  if(!current.previousDraft.length)delete current.previousDraft;
  if(revised)current.notice='报表条目已简化，原填写替你保留了。';
  for(const key of ['automatic','preview','animatedPages'])if(old[key]!==undefined)current[key]=old[key];
  if(old.automatic)for(const f of current.fields)f.value=money(f.target);
  current.checked=old.checked&&!unfilledFields(s).length&&!bookIssues(s).length;s.bookSuspended=suspended;p=current;
 }

 if(p&&p.feedbackVersion!==2){
  p.feedbackVersion=2;p.errorCounts??={};const missing=unfilledFields(s);for(const f of missing)delete p.errorCounts[f.page+':'+f.key];
  if(!p.checked&&missing.length){p.reminder={page:missing[0].page,key:missing[0].key};p.page=missing[0].page;p.notice='这里还有待填金额，接着记就好。';}
  else if(!p.checked&&!bookIssues(s).length){p.notice='金额已整理，再核对这一笔就好。';for(const f of p.fields)delete p.errorCounts[f.page+':'+f.key];}
 }

 return s;
}
export function migrate(old){
 if(old?.schema===2){
  if(old.lessonVersion===LESSON_VERSION){const s=prepareCurrent(structuredClone(old));return validate(s);}
  validate(old,legacyQuestion);
  const s=structuredClone(old);s.lessonVersion=LESSON_VERSION;delete s.learningMode;s.lessonsSeen={};s.challengeAnswers={};s.challengePicks={};
  s.legacyAnswers=structuredClone(old.answers);s.answers={};s.picks={};
  s.stage=({forecast:'payable',transfer:'equipment'})[s.stage]||s.stage;
  return validate(prepareCurrent(s));
 }
 if(old?.schema!==1)throw Error('进度版本不支持');
 const s={...legacyStart(1),...old,schema:2,seed:1,pendingBook:null,bookLog:[],earlyRequest:old.rescued?'paid':null,collection:null};delete s.draft;delete s.entryErrors;delete s.entryAttempts;delete s.entryCorrect;
 s.tx=old.tx.map(t=>({...t,kind:t.id==='sale'?'sale':t.id,phase:t.id.startsWith('liq-')?'liquidation':t.id==='opening'?'opening':'business',...(t.id==='sale'?{quantity:12}:{})}));
 if(s.tx.some(t=>t.id==='sale')){s.order={accepted:true,legacy:true};s.contract={total:6000,upfront:old.choice,outcome:'ontime',revealed:false,legacy:true};}
 if(old.stage==='entry'){const before={...s,tx:s.tx.slice(0,1)};queueBook(before,s,['sale']);for(const f of s.pendingBook.fields)if(old.draft?.[f.key]!==undefined)f.value=old.draft[f.key];}
 delete s.lessonVersion;return migrate(s);
}
export function validate(s,bank=question){
 const validStages=bank===legacyQuestion?[...STAGES,'forecast','transfer',...COURSE_STAGES]:[...STAGES,...COURSE_STAGES];
 if(!s||s.schema!==2||!validStages.includes(s.stage)||!Number.isInteger(s.seed)||s.seed<0||s.seed>4294967295||!Number.isSafeInteger(s.revision)||s.revision<0||!(s.course?Number.isInteger(s.day)&&s.day>=1&&s.day<=courseEnd(s):[1,2,3,4,5,12].includes(s.day))||!Array.isArray(s.tx)||s.tx.length<1||s.tx.length>(s.course?1500:40))throw Error('进度格式不正确');
 if(isOpeningChapter(s)&&(s.openingMinute!==null&&(!Number.isInteger(s.openingMinute)||s.openingMinute<540||s.openingMinute>1080)||s.stage==='idle'&&(s.openingMinute===null||!s.openingWait||!Number.isInteger(s.openingWait.round)||s.openingWait.round<0||s.openingWait.round>3||s.openingWait.target!==(s.openingWait.round===3?1080:arrivalMinute(s,s.openingWait.round))||s.openingMinute>=s.openingWait.target)))throw Error('时钟进度不正确');
 if(s.completedEvents&&(!Array.isArray(s.completedEvents)||new Set(s.completedEvents.map(event=>event.id)).size!==s.completedEvents.length||s.completedEvents.some(event=>!event||typeof event.id!=='string'||typeof event.label!=='string'||!Number.isInteger(event.day)||!Number.isInteger(event.minute)||event.minute<0||event.minute>1439)))throw Error('事件记录不正确');
 const ids=new Set();for(const t of s.tx){if(!t||typeof t.id!=='string'||ids.has(t.id)||typeof t.label!=='string'||!t.delta||Object.entries(t.delta).some(([k,v])=>!ACCOUNT_KEYS.includes(k)||!Number.isSafeInteger(v))||!['opening','operating','investing','financing'].includes(t.flow)||['revenue','cost','loss'].some(k=>!Number.isSafeInteger(t[k])||t[k]<0))throw Error('交易记录不正确');ids.add(t.id);}
 const r=report(s),o=s.tx[0];if(o.id!=='opening'||JSON.stringify(o.delta)!==JSON.stringify((isFromZero(s)?start():legacyStart()).tx[0].delta)||r.profit!==r.operatingProfit-r.loss||r.assets!==r.liabilities+r.equity||r.openingCash+r.operatingFlow+r.investingFlow+r.financingFlow!==r.b.cash||['cash','inventory','equipment','receivable','payable','loan','interestPayable','wagesPayable','distributions'].some(k=>r.b[k]<0))throw Error('账目不平衡');
 if(!s.picks||!s.answers||![null,0,3000,6000].includes(s.choice)||![null,0,3000,6000].includes(s.selection)||Object.entries(s.answers).some(([stage,a])=>{const q=bank({...s,stage});return !q||!a||!Number.isInteger(a.index)||a.index<0||a.index>=q.options.length||a.correct!==(a.index===q.correct)||bank===question&&a.id!==q.id;}))throw Error('学习进度不正确');
 if(bank===question){if(s.lessonVersion!==LESSON_VERSION||!s.lessonsSeen||!s.challengeAnswers||!s.challengePicks||Object.entries(s.lessonsSeen).some(([stage,v])=>!question({...s,stage})||v!==true)||Object.entries(s.challengeAnswers).some(([id,a])=>{const q=challenge(s,id);return !q||!a||a.id!==q.id||!Number.isInteger(a.index)||a.index<0||a.index>=q.options.length||a.correct!==(a.index===q.correct);}))throw Error('教学进度不正确');}
 if(s.contract&&(!['ontime','late','default'].includes(s.contract.outcome)||s.contract.total!==6000||![0,3000,6000].includes(s.contract.upfront)))throw Error('合同进度不正确');
 if(s.order&&(typeof s.order.accepted!=='boolean'||!s.order.legacy&&s.order.accepted!==(eventRandom(s.seed,'main-customer:accept')<ACCEPTANCE[s.choice])))throw Error('成交结果与本局条件不一致');
 if(s.contract&&!s.contract.legacy&&s.contract.outcome!==(s.contract.upfront===6000?'ontime':repayment(s.seed)))throw Error('回款结果与本局条件不一致');
 if(s.backup&&s.backup.quantity!==backupDemand(s.seed))throw Error('候补客流与本局条件不一致');
 if(s.pendingBook){const p=s.pendingBook;if(!Array.isArray(p.fields)||!Array.isArray(p.changes)||p.fields.length>20||!Array.isArray(p.pages)||p.pages.some(v=>![0,1,2].includes(v))||!Array.isArray(p.seenPages)||p.seenPages.some(v=>![0,1,2].includes(v))||![0,1,2].includes(p.page)||!Number.isInteger(p.attempts)||p.attempts<0||p.checked&&(bookIssues(s).length||unfilledFields(s).length)||p.fields.some(f=>![0,1,2].includes(f.page)||typeof f.value!=='string'||f.value.length>18||!Number.isSafeInteger(f.target)||!statementRows(s,f.page).some(r=>r.key===f.key&&r.value===f.target)))throw Error('报表练习不正确');}
 if(['liquidation','results'].includes(s.stage)&&(!s.liquidation||!Number.isInteger(s.liquidation.step)||s.liquidation.step<0||s.liquidation.step>liquidationSteps(s)||(s.stage==='liquidation'&&s.liquidation.step===liquidationSteps(s))||(s.stage==='results'&&s.liquidation.step!==liquidationSteps(s))))throw Error('清算进度不正确');validateCourse(s);return s;
}
export function scores(s){const r=report(s),a=Object.values(s.answers),clamp=n=>Math.max(0,Math.min(100,Math.round(n))),sold=s.tx.filter(t=>t.kind==='sale').reduce((n,t)=>n+(t.quantity||0),0),reference=hasSummer(s)&&s.course.week>4?150000:s.course?.daily&&s.course.week>1?60000:s.course?.week>1?15000:3200,purchased=s.tx.filter(t=>t.kind==='stock-purchase').reduce((n,t)=>n+(t.delta.inventory||0),0);return [
 {name:'盈利表现',score:s.order?clamp(r.profit/reference*100):null,detail:'以本关净利润为结果指标，坏账、报损与清算损失均计入。'},
 {name:'现金安排',score:s.liquidation?.reason==='failure'?0:s.tx.some(t=>['pay','w4-supplier-payment','w4-principal'].includes(t.id))?100:null,detail:s.course?.week>1?'记录第 4 周到期款项是否按约定处理，清算后的偿还不改写履约结果。':'记录周四是否按期付款，清算后的偿还不改写履约结果。'},
 {name:'资源利用',score:s.order?clamp(((s.course?purchased:2400)-r.spoilage)/(s.course?purchased||1:2400)*100):null,detail:`实际交付 ${sold} 杯；存货报损 ${r.spoilage/100} 元。`},
 {name:isOpeningChapter(s)?'本钱回报':'股东回报',score:(s.stage==='results'||s.course?.completed)&&r.b.capital?clamp((r.equity+r.b.distributions-r.b.capital)/reference*100):null,detail:`所有者共出资 ${r.b.capital/100} 元，对照最终净资产增值；借款不计入出资。`},
 {name:'风险应对',score:s.order&&!isOpeningChapter(s)?clamp((s.choice!==0?50:0)+(s.tx.some(t=>t.id==='pay')||s.rescueAttempted||s.tx.some(t=>t.id==='clearance')?50:0)):null,detail:'记录预收款、按期付款与实际补救行动；选做的进阶题不影响这一维，也不因抽到坏账直接扣分。'},
 {name:'会计理解',score:a.length?clamp(a.filter(v=>v.correct).length/a.length*100):null,detail:`记录 ${a.length} 道题的首次判断，其中 ${a.filter(v=>v.helped).length} 道查看过提示；这次练习不直接等同于独立掌握。`}
 ].map(item=>item.score===null?{...item,score:100,unexperienced:true,detail:item.detail+' 未体验时按 100 分展示。'}:item);}
