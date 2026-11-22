export const ACCOUNT_KEYS=['cash','inventory','equipment','receivable','payable','loan','capital','profit','interestPayable','wagesPayable','distributions'];
export const money=n=>Number.isInteger(n/100)?String(n/100):(n/100).toFixed(2);
export const REPORT_NAMES=['资产负债表','利润表','现金流量表'];
export const isFromZero=s=>['from-zero-v1','opening-cash-v2'].includes(s.journey);
export const isOpeningChapter=s=>s.journey==='opening-cash-v2';
export function balances(s){return Object.fromEntries(ACCOUNT_KEYS.map(k=>[k,s.tx.reduce((n,t)=>n+(t.delta[k]||0),0)]));}
export function supplierBill(s){return s.tx.reduce((n,t)=>n+((t.id==='opening'||t.kind==='stock-purchase')?(t.delta.payable||0):0),0);}
export function ownership(s){if(s.course?.summer?.partner){const own=s.tx.filter(t=>t.kind==='owner-investment').reduce((n,t)=>n+(t.delta.capital||0),0);return {own,total:balances(s).capital,ratio:.75,percent:75};}const total=balances(s).capital,own=isFromZero(s)?s.tx.filter(t=>t.kind==='owner-investment').reduce((n,t)=>n+(t.delta.capital||0),0):total;return {own,total,ratio:total?own/total:0,percent:total?Math.round(own/total*100):0};}
export function reportAvailable(s,page){
 if(!isFromZero(s)||s.stage==='results')return [0,1,2].includes(page);
 if(page===0)return s.tx.some(t=>(t.delta.capital||0)>0||(t.delta.loan||0)>0);
 if(page===1)return !!s.incomeIntroduced||s.tx.some(t=>t.revenue||t.cost||t.loss);
 if(page===2)return s.tx.some(t=>t.flow==='investing'&&(t.delta.cash||0)!==0);
 return false;
}
export function report(s){
 const b=balances(s),sum=k=>s.tx.reduce((n,t)=>n+(t[k]||0),0),flow=kind=>s.tx.filter(t=>t.flow===kind).reduce((n,t)=>n+(t.delta.cash||0),0);
 // Old journals stored inventory liquidation markdown as a single loss. Re-present
 // the same sale at its cash proceeds and carrying cost, without changing facts.
 const inventorySales=s.tx.filter(t=>t.phase==='liquidation'&&(t.delta.inventory||0)<0&&!t.cost),stockRevenue=inventorySales.reduce((n,t)=>n+(t.delta.cash||0),0),stockCost=inventorySales.reduce((n,t)=>n-t.delta.inventory,0);
 const revenue=sum('revenue')+stockRevenue,cost=sum('cost')+stockCost,loss=sum('loss')-(stockCost-stockRevenue),financeExpense=sum('financeExpense')+s.tx.filter(t=>t.kind==='settlementLoss'&&(t.delta.receivable||0)<0).reduce((n,t)=>n+t.loss,0);
 const salesExpense=sum('salesExpense'),gross=revenue-cost,nonOperatingExpense=loss-financeExpense-salesExpense,operatingResult=gross-financeExpense-salesExpense;
 return {b,revenue,cost,loss,salesExpense,financeExpense,nonOperatingExpense,operatingResult,profitBeforeTax:operatingResult-nonOperatingExpense,badDebt:s.tx.filter(t=>t.kind==='badDebt').reduce((n,t)=>n+t.loss,0),spoilage:s.tx.filter(t=>t.kind==='spoilage').reduce((n,t)=>n+t.loss,0),liquidationLoss:s.tx.filter(t=>t.phase==='liquidation').reduce((n,t)=>n+t.loss,0),operatingProfit:gross,profit:b.profit,assets:b.cash+b.inventory+b.equipment+b.receivable,liabilities:b.payable+b.loan+b.interestPayable+b.wagesPayable,equity:b.capital+b.profit-b.distributions,openingCash:s.tx[0]?.delta.cash||0,operatingFlow:flow('operating'),investingFlow:flow('investing'),financingFlow:flow('financing')};
}
export function cashFlowDetails(s,flow){
 const transactions=s.tx.filter(t=>t.flow===flow&&(t.delta.cash||0)!==0),incoming=transactions.filter(t=>t.delta.cash>0),outgoing=transactions.filter(t=>t.delta.cash<0),sum=list=>list.reduce((n,t)=>n+Math.abs(t.delta.cash),0);
 const detail=(key,label,list)=>list.length?{key,label,value:sum(list),calculated:true,detail:true}:null;
 const details=flow==='operating'?[detail('operating-sales','销售商品、提供劳务收到的现金',incoming),detail('operating-purchases','购买商品、接受劳务支付的现金',outgoing.filter(t=>t.kind!=='wage-payment')),detail('operating-wages','支付给职工以及为职工支付的现金',outgoing.filter(t=>t.kind==='wage-payment'))]:flow==='investing'?[detail('investing-disposals','处置固定资产收回的现金净额',incoming),detail('investing-purchases','购建固定资产支付的现金',outgoing)]:[detail('financing-capital','吸收投资收到的现金',incoming.filter(t=>(t.delta.capital||0)>0)),detail('financing-loans','取得借款收到的现金',incoming.filter(t=>(t.delta.loan||0)>0)),detail('financing-repayments','偿还借款本金支付的现金',outgoing.filter(t=>t.kind!=='interest-payment'&&t.kind!=='owner-distribution')),detail('financing-interest','偿付利息支付的现金',outgoing.filter(t=>t.kind==='interest-payment')),detail('financing-distributions','分配利润或清算剩余财产支付的现金',outgoing.filter(t=>t.kind==='owner-distribution'))];
 return {details:details.filter(Boolean),inflow:sum(incoming),outflow:sum(outgoing)};
}

// Classify actual payments once. Accruals without cash never enter this table.
export function simpleCashRows(s){
 const totals={incoming:0,purchases:0,devices:0,expenses:0,principal:0,distributions:0};
 for(const t of s.tx){const cash=t.delta.cash||0;if(!cash||t.flow==='opening')continue;
  if(cash>0){totals.incoming+=cash;continue;}
  const amount=-cash;
  if(t.kind==='owner-distribution')totals.distributions+=amount;
  else if((t.delta.loan||0)<0){const principal=Math.min(amount,-t.delta.loan);totals.principal+=principal;totals.expenses+=amount-principal;}
  else if(t.flow==='investing'&&(t.delta.equipment||0)>0)totals.devices+=amount;
  else if((t.delta.inventory||0)>0||(t.delta.payable||0)<0)totals.purchases+=amount;
  else totals.expenses+=amount;
 }
 const opening=s.tx.filter(t=>t.flow==='opening').reduce((n,t)=>n+(t.delta.cash||0),0),row=(key,label,value,calculated=false)=>({key,label,value,calculated});
 return [row('opening','期初现金余额',opening,true),...[
  ['incoming','现金流入'],['purchases','购置存货'],['devices','购置固定资产'],['expenses','支付费用'],['principal','偿还借款本金'],['distributions','向所有者分配']
 ].filter(([key])=>totals[key]>0).map(([key,label])=>row(key,label,totals[key])),row('ending','期末现金余额',balances(s).cash,true)];
}

export function incomeExpenseDetails(s){
 const r=report(s),equipmentLoss=s.tx.filter(t=>(t.delta.equipment||0)<0&&t.loss>0).reduce((n,t)=>n+t.loss,0);
 return [{key:'salesExpense',label:'销售费用',value:r.salesExpense},{key:'financeExpense',label:'财务费用',value:r.financeExpense},{key:'spoilage',label:'存货报损',value:r.spoilage},{key:'badDebt',label:'坏账损失',value:r.badDebt},{key:'settlementLoss',label:'固定资产处置损失',value:equipmentLoss}].filter(row=>row.value>0);
}

export function statementRows(s,page){
 if(!reportAvailable(s,page))return [];
 const r=report(s),b=r.b,zero=isFromZero(s),seen=k=>s.tx.some(t=>(t.delta[k]||0)!==0),occur=k=>s.tx.some(t=>t.kind===k),row=(key,label,value,calculated=false)=>({key,label,value,calculated});
 if(page===0){const own=ownership(s);return [
  ...(!zero||seen('cash')||s.stage==='results'?[row('cash','现金',b.cash)]:[]),
  ...(!zero||seen('inventory')?[row('inventory','存货',b.inventory)]:[]),
  ...(seen('receivable')?[row('receivable','应收账款',b.receivable)]:[]),
  ...(!zero||seen('equipment')?[row('equipment','固定资产',b.equipment)]:[]),
  row('assets','资产合计',r.assets,true),
  ...(!zero||seen('payable')?[row('payable','应付账款',b.payable)]:[]),
  ...(seen('loan')?[row('loan',s.course?.loan?'借款本金':'借款本金 · 父母',b.loan)]:[]),
  ...(seen('interestPayable')?[row('interestPayable','应付利息',b.interestPayable)]:[]),
  ...(seen('wagesPayable')?[row('wagesPayable','应付工资',b.wagesPayable)]:[]),
  ...(seen('capital')?[row('capital',zero?'投入资本 · 本人':'期初所有者权益',zero?own.own:b.capital)]:[]),
  ...(zero&&b.capital>own.own?[row('partnerCapital','投入资本 · 合伙人',b.capital-own.own)]:[]),
  ...(seen('profit')?[row('profit',s.course?.totalWeeks===8?'未分配利润':'累计净利润',s.course?.totalWeeks===8?b.profit-Math.min(Math.max(0,b.profit),b.distributions):b.profit,true)]:[]),...(b.distributions>Math.max(0,b.profit)?[row('distributions','减：已退还投入资本',b.distributions-Math.max(0,b.profit),true)]:[]),row('sources','负债与所有者权益合计',r.liabilities+r.equity,true)];}
 if(page===1){
  const active=s.tx.some(t=>t.revenue||t.cost||t.loss)||s.incomeIntroduced||s.stage==='results';if(!active)return [];
  return [row('revenue','营业收入',r.revenue),row('cost','减：营业成本',r.cost),row('gross','毛利',r.operatingProfit,true),...(r.loss?[row('expenses','减：费用',r.loss)]:[]),row('profit','净利润',r.profit,true)];
 }
 return simpleCashRows(s);

}
export function queueBook(before,s,ids){
 const changes=[],fields=[],pages=[];
 for(let page=0;page<3;page++){const prior=statementRows(before,page),next=statementRows(s,page),old=new Map(prior.map(r=>[r.key,r.value]));let affected=false;for(const row of next){const fresh=!old.has(row.key),changed=fresh||old.get(row.key)!==row.value;if(changed){affected=true;changes.push({page,key:row.key,fresh,previous:old.get(row.key)??null});if(!row.calculated&&(fresh||isOpeningChapter(s)&&changed&&['cash','revenue','cost','incoming','purchases','devices','expenses','principal'].includes(row.key)))fields.push({page,key:row.key,label:row.label,target:row.value,value:''});}}if(affected)pages.push(page);}
 if(!pages.length)return;
 s.bookSuspended=false;s.pendingBook={entryVersion:2,feedbackVersion:2,statementVersion:4,errorCounts:{},id:ids.join('|'),pages,page:fields[0]?.page??pages[0],fields,changes,seenPages:[],attempts:0,checked:false,notice:''};
}
export function parseAmount(value){
 let raw=String(value??'').normalize('NFKC').trim().replace(/[−﹣]/g,'-');
 if(!raw)return {ok:false,code:'empty'};
 let negative=false;if(/^\([^()]+\)$/.test(raw)){negative=true;raw=raw.slice(1,-1).trim();if(/^[+-]/.test(raw))return {ok:false,code:'format'};}
 if(!/^[+-]?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?|\.\d{1,2})$/.test(raw))return {ok:false,code:'format'};
 if(raw[0]==='-'){negative=true;raw=raw.slice(1);}else if(raw[0]==='+')raw=raw.slice(1);
 const [whole='',fraction='']=raw.replaceAll(',','').split('.');const n=BigInt(whole||'0')*100n+BigInt((fraction+'00').slice(0,2));if(n>BigInt(Number.MAX_SAFE_INTEGER))return {ok:false,code:'range'};
 return {ok:true,cents:Number(n)*(negative?-1:1)};
}
// Entry accepts either sign; each report row supplies its standard presentation.
// The entered magnitude still has to match: this never repairs a wrong amount.
export function entryAmount(field){const n=parseAmount(field.value);return n.ok?{ok:true,cents:Math.abs(n.cents)*(field.target<0?-1:1)}:n;}
export function normalizeBookField(field){const n=entryAmount(field);if(n.ok)field.value=money(n.cents);return n;}
export function unfilledFields(s,page){return s.pendingBook?.fields.filter(f=>(page===undefined||f.page===page)&&!String(f.value??'').trim())||[];}
export function bookIssues(s){const p=s.pendingBook;if(!p)return [];return p.fields.flatMap(f=>{const n=entryAmount(f);if(n.code==='empty')return [];const message=!n.ok?'请输入有效金额，最多两位小数。':n.cents!==f.target?'再对照刚才的交易，看看这张表应记多少。':'';return message?[{page:f.page,key:f.key,message}]:[];});}
export function fieldGuide(s,f){const p=s.pendingBook,r=report(s),change=p?.changes.find(c=>c.page===f.page&&c.key===f.key),tx=s.tx.filter(t=>p?.id.split('|').includes(t.id)),cashDelta=tx.reduce((n,t)=>n+(t.delta.cash||0),0),sold=s.tx.filter(t=>t.kind==='sale').reduce((n,t)=>n+(t.quantity||0),0);
 const labels={financeExpense:'财务费用',cash:'现金余额',capital:'你的投入资本',partnerCapital:'朋友的投入资本',loan:'未还借款本金',inventory:'存货',equipment:'固定资产账面价值',revenue:'营业收入',cost:'营业成本',operating:'经营活动产生的现金流量净额',investing:'投资活动产生的现金流量净额',financing:'筹资活动产生的现金流量净额'};
 let explanation=`先看本局的这笔交易，${labels[f.key]||f.label}应记 ${money(f.target)} 元。`;
 if(f.key==='cash'&&change&&change.previous!==null)explanation=`原来现金 ${money(change.previous)} 元，本次${cashDelta>=0?'收到':'付出'} ${money(Math.abs(cashDelta))} 元，所以现金余额＝${money(change.previous)} ${cashDelta>=0?'＋':'－'} ${money(Math.abs(cashDelta))}＝${money(f.target)} 元。`;
 if(f.key==='capital')explanation=`只记你实际投入的零花钱：${money(f.target)} 元。父母的借款另列为负债，不加入这行。`;
 if(f.key==='partnerCapital')explanation=`朋友实际出资 ${money(f.target)} 元，这行记录真实出资；约定的持股比例另看合作约定。`;
 if(f.key==='loan')explanation=`借入的本金减去已经归还的本金，本局尚未归还 ${money(f.target)} 元。借款不是营业收入。`;
 if(f.key==='inventory'&&!s.course)explanation=`本次原料可做 12 杯，每杯原料和包材成本 2 元：12×2＝${money(f.target)} 元。还没售出的原料先作为存货。`;
 if(f.key==='inventory'&&s.course)explanation=`逐项采购金额相加，减去已售出消耗、清售和报损转出；期末仍可用的原料与包材合计 ${money(f.target)} 元。塑料杯和吸管也属于存货。`;
 if(f.key==='wagesPayable')explanation=`已经完成工作的职工薪酬，减去已经支付的工资，尚欠 ${money(f.target)} 元；付款时不再重复计费用。`;
 if(f.key==='salesExpense')explanation=`本局已经发生的出摊人员薪酬与夜市摊位费，合计 ${money(f.target)} 元。是否已经付款不改变费用所属期间。`;
 if(f.key==='interestPayable')explanation=`已经计提、尚未支付的借款利息合计 ${money(f.target)} 元；实际支付后冲减，不再重复确认费用。`;
 if(f.key==='equipment'&&!s.course?.upgrade)explanation=`摊桌 10 元＋压汁器 6 元＝16 元，买来继续使用，计入固定资产。`;
 if(f.key==='revenue'&&r.revenue===sold*500)explanation=`已交付 ${sold} 杯，每杯售价 5 元：营业收入＝${sold}×5＝${money(f.target)} 元。`;
 if(f.key==='financeExpense'&&!s.course?.loan)explanation=`为提前收回货款而让出的现金折扣合计 ${money(f.target)} 元，计入财务费用，不再次冲减已经确认的营业收入。`;
 if(f.key==='cost'&&r.cost===sold*200)explanation=`已售出 ${sold} 杯，每杯原料和包材成本 2 元：营业成本＝${sold}×2＝${money(f.target)} 元。报表将营业成本按正数列为减项。`;
 if(f.key==='cost'&&s.course&&s.tx.some(t=>t.kind==='depreciation'))explanation=`已售出茶饮消耗的原料和包材成本，加本期生产设备折旧，合计 ${money(f.target)} 元。折旧没有再次支付现金。`;
 if(['operating','investing','financing'].includes(f.key)){const flows=s.tx.filter(t=>t.flow===f.key&&t.delta.cash).map(t=>t.delta.cash);explanation=`这类活动的现金流入减现金流出：${flows.map((v,i)=>`${i&&v>=0?'＋':''}${money(v)}`).join(' ')}＝${money(f.target)} 元。${f.target<0?'报表用负数表示净流出。':'正数表示净流入。'}`;}
 if(f.page===1&&f.key==='expenses')explanation=`本期工资、摊位费、利息及已确认的报损等合计 ${money(f.target)} 元。设备折旧已计入营业成本，不在费用行重复扣除。`;
 if(f.page===2){const names={incoming:'实际收到的钱（含出资、借款、卖茶和收欠款）',purchases:'实际买原料、包材及还供应商货款支付的钱',devices:'实际买设备支付的钱',expenses:'实际支付的费用（含利息和工资）',principal:'实际归还的借款本金',distributions:'实际分给所有者的钱'};if(names[f.key])explanation=`把本局${names[f.key]}相加，累计是 ${money(f.target)} 元。未收到的欠款、未支付的利息和折旧不计入现金收支。`;}
 return explanation;
}

export function pendingFields(s,page){const p=s.pendingBook;if(!p||p.checked)return [];return p.fields.filter(f=>(page===undefined||f.page===page)&&(!String(f.value).trim()||p.attempts>0&&(!entryAmount(f).ok||entryAmount(f).cents!==f.target)));}
