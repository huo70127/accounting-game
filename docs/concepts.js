import {known,statement,badge} from './feedback.js';
const definitions={
spoilage:['没卖完的茶，也会有损失','原料超过保质期，或现制柠檬茶当天没卖完，都需要报损。原来记在存货里的成本转为报损，利润减少；这时钱盒没有再花一次钱。'],
familyDebt:['第一笔启动钱','父母借给你 10 元，免息，本章不要求归还。现金多了 10 元，同时也欠父母 10 元；这不是赚到的收入。'],
inventory:['茶料也是你的东西','买来的柠檬、白茶、糖，以及杯子和吸管，先记在存货里。卖出柠檬茶时，再把对应的茶料转成成本。'],
receivable:['客人欠你的钱','杯子已经交出，钱还没收到。这张欠条叫「应收账款」，是你的资产。收到钱时，它会减少，现金会增加。'],
equipment:['能用很多天的摇茶机','24 元换成了一台设备，不是今天一次花掉的成本。它进入资产负债表，使用后再逐日计提折旧。'],
debt:['借来的钱，要归还','收到的 12 元是借款本金。现金增加，同时多了一笔负债；借款不会让利润增加。'],
interest:['借钱也有代价','第 3 天到期时确认 2 元利息费用。没付出去前，它也是应付利息；即使违约也不能抹去。'],
depreciation:['设备用了一天','摇茶机今天贡献了产能，计入 4 元折旧费用。设备净值和利润各减少 4 元，钱盒不变。'],
revenue:['递出杯子，就有收入','客人买下的柠檬茶形成销售收入。现钱和赊销都会确认收入，是否收款要另看钱盒。'],
cost:['卖出去的杯子，才算成本','备货时只是现金换成存货。杯子交给客人时，对应的每杯 2 元才从存货转为销售成本。'],
profit:['收入减去成本与费用','剩下的是利润。利润不等于现金：客人赊账时，已经赚到的钱仍可能在欠条上。'],
'投资':['钱换成长期使用的东西','购买摇茶机的付款进入投资现金流；设备本身进入资产。'],
'还款':['兑现还钱的承诺','归还本金减少现金和负债，付利息减少现金和应付利息。利润不会因为归还本金再减少。']
};
export function newConcepts(before,after){const previous=known(before,before.day),current=known(after,after.day);return Object.keys(definitions).filter(k=>current.has(k)&&!previous.has(k));}
export function captureConcepts(before,s){const keys=newConcepts(before,s);if(keys.length)s.pendingConcepts={keys,txStart:before.tx.length,day:s.day};}
export function conceptExplanation(keys){return keys.filter(k=>definitions[k]).map(k=>`<article class="conceptcard"><h3>${definitions[k][0]}</h3><p>${definitions[k][1]}</p></article>`).join('');}
export function clearConcept(){const panel=document.getElementById('conceptnotice');if(panel?.open)panel.close();}
export function showConcept(s){const pending=s.pendingConcepts;if(!pending)return;const panel=document.getElementById('conceptnotice');if(panel.open)return;
const before={...s,tx:s.tx.slice(0,pending.txStart)};let html=conceptExplanation(pending.keys);
for(let page=0;page<3;page++){const old=statement(before,pending.day,page),rows=statement(s,pending.day,page);const changed=rows.filter(v=>!['assets','liabilities','equity'].includes(v.key)&&(!old.some(o=>o.key===v.key)||old.find(o=>o.key===v.key)?.value!==v.value));if(!changed.length)continue;
html+=`<section class="concepttable"><h3>${['资产负债表','利润表','现金流量表'][page]}</h3>`+changed.map((v,i)=>{const previous=old.find(o=>o.key===v.key);return `<div class="concept-entry ${previous?'':'new-entry'}" style="--i:${i}"><span>${v.label}</span><span>${previous?.value||0} → <strong>${v.value}</strong> ${badge(v.value-(previous?.value||0))}</span></div>`;}).join('')+'</section>';}
document.getElementById('conceptcontent').innerHTML=html;panel.showModal();panel.scrollTop=0;
}
