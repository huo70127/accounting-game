import {balances,money} from './accounting.js';
import {saleReceipt} from './sale-receipt.js';

// Describe the posted transaction being filled in, rather than the next story step.
export function bookContext(s){
 const p=s.pendingBook;if(!p||p.automatic)return '';
 const ids=new Set(p.id.split('|')),tx=s.tx.filter(t=>ids.has(t.id));if(!tx.length)return '';
 const sum=(key,list=tx)=>list.reduce((n,t)=>n+(t.delta[key]||0),0);
 const incoming=tx.reduce((n,t)=>n+Math.max(0,t.delta.cash||0),0),outgoing=tx.reduce((n,t)=>n-Math.min(0,t.delta.cash||0),0);
 const losses=tx.reduce((n,t)=>n+(t.loss||0),0),sale=saleReceipt(s);
 if(sale)return `本笔 ${sale.quantity} 杯 × ${money(sale.revenue/sale.quantity)} 元＝${money(sale.revenue)} 元；实收 ${money(sale.cash)} 元${sale.receivable?`，尚欠 ${money(sale.receivable)} 元`:''}。原料和包材成本 ${money(sale.cost)} 元。`;

 const equipmentSale=tx.find(t=>(t.delta.equipment||0)<0&&(t.delta.cash||0)>0);
 const stockSale=tx.find(t=>(t.delta.inventory||0)<0&&(t.delta.cash||0)>0);
 const purchases=tx.filter(t=>t.kind==='stock-purchase'),depreciation=tx.filter(t=>t.kind==='depreciation');
 let text;
 if(tx.length===1&&equipmentSale)text=`设备账面 ${money(-equipmentSale.delta.equipment)} 元，卖出收款 ${money(equipmentSale.delta.cash)} 元，处置损失 ${money(equipmentSale.loss)} 元。`;
 else if(tx.length===1&&stockSale)text=`存货账面 ${money(-stockSale.delta.inventory)} 元，清售收款 ${money(stockSale.delta.cash)} 元，折价损失 ${money(-stockSale.delta.inventory-stockSale.delta.cash)} 元。`;
 else if(purchases.length){
  const cost=sum('inventory',purchases),paid=-sum('cash',purchases),credit=sum('payable',purchases);
  text=`购入原料和包材 ${money(cost)} 元，实付 ${money(paid)} 元${credit?`，尚欠供应商 ${money(credit)} 元`:''}。${losses?`原料报损 ${money(losses)} 元。`:''}`;
 }
 else if(sum('equipment')>0)text=sum('loan')>0?`借入设备款 ${money(sum('loan'))} 元，买压汁机付出 ${money(outgoing)} 元。`:tx[0].kind==='stall-purchase'?`摊桌 10 元＋压汁器 6 元，共付 ${money(outgoing)} 元。`:`买入设备 ${money(sum('equipment'))} 元，付出现金 ${money(outgoing)} 元。`;
 else if(sum('capital')>0)text=`${tx[0].kind==='partner-investment'?'朋友投入':'投入自己的零花钱'} ${money(sum('capital'))} 元，现金增加 ${money(incoming)} 元。`;
 else if(sum('loan')>0)text=`${tx[0].kind==='parent-loan'?'向父母借入':'借入'}本金 ${money(sum('loan'))} 元，现金增加 ${money(incoming)} 元。`;
 else if(sum('loan')<0&&!sum('payable')&&!sum('receivable')&&!equipmentSale&&!stockSale)text=`归还借款本金 ${money(-sum('loan'))} 元${sum('interestPayable')<0?`、支付已计提利息 ${money(-sum('interestPayable'))} 元`:''}，共付 ${money(outgoing)} 元。`;
 else if(sum('payable')<0&&!sum('loan')&&!sum('receivable')&&!sum('interestPayable')&&!equipmentSale&&!stockSale)text=`偿还应付账款 ${money(-sum('payable'))} 元，现金付出 ${money(outgoing)} 元。`;
 else if(sum('receivable')<0&&!sum('loan')&&!sum('payable')&&!sum('interestPayable')&&!equipmentSale&&!stockSale)text=`应收账款减少 ${money(-sum('receivable'))} 元，实际收款 ${money(incoming)} 元${losses?`，未收回部分 ${money(losses)} 元`:''}。`;
 else if(!incoming&&!outgoing){
  const parts=[];if(depreciation.length)parts.push(`设备折旧 ${money(-sum('equipment',depreciation))} 元`);
  const interest=sum('interestPayable');if(interest>0)parts.push(`计提利息 ${money(interest)} 元`);
  const spoiled=tx.filter(t=>t.kind==='spoilage').reduce((n,t)=>n+t.loss,0);if(spoiled)parts.push(`原料报损 ${money(spoiled)} 元`);
  text=parts.length?parts.join('，')+'，本次未付现金。':tx[0].label+'。';
 }
 else if(tx.length>1)text=`本次共处理 ${tx.length} 项：收款 ${money(incoming)} 元、付款 ${money(outgoing)} 元${losses?`，确认损失 ${money(losses)} 元`:''}。`;
 else text=`${tx[0].label}；${incoming?`收款 ${money(incoming)} 元`:`付款 ${money(outgoing)} 元`}。`;

 if(p.fields.some(f=>f.key==='cash')&&text.length<55)text+=`交易前现金 ${money(balances(s).cash-incoming+outgoing)} 元。`;
 return text;
}
