import {balances,money} from './accounting.js';
import {staffing,partnered,nightToday,WAGE_PER_SHIFT,PASTRY_COST} from './summer-rules.js';
export function preparePastry(s,post,teaQuantity){
 if(!partnered(s)||nightToday(s))return 0;
 const u=s.course.summer,target=Math.min(6,teaQuantity),count=Math.min(Math.max(0,target-u.pastryStock),Math.floor(balances(s).cash/PASTRY_COST));
 if(count){u.pastryStock+=count;post(s,`d${s.day}-pastry-stock`,`共同采购点心原料 ${count} 份，共 ${money(count*PASTRY_COST)} 元`,{cash:-count*PASTRY_COST,inventory:count*PASTRY_COST},'operating',{kind:'stock-purchase',pastryQuantity:count},false);}
 return Math.min(target,u.pastryStock);
}
export function accrueShift(s,post){
 if(!staffing(s).helper)return;
 const id=`d${s.day}-wages`;
 if(s.tx.some(t=>t.id===id))return;
 post(s,id,'帮手完成一天代班，确认职工薪酬 12 元，周日收摊后支付',{wagesPayable:WAGE_PER_SHIFT,profit:-WAGE_PER_SHIFT},'operating',{kind:'wage-expense',loss:WAGE_PER_SHIFT,salesExpense:WAGE_PER_SHIFT},false);
}
