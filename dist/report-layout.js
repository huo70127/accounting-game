import {balanceSheet} from './balance-sheet.js';
import {statement,badge} from './feedback.js';
import {report} from './engine.js';
export const REPORT_NAMES=['资产负债表','利润表','现金流量表'];
export const pageFor=account=>['revenue','cost','depreciation','interestExpense','spoilage'].includes(account)?1:0;
const statementKey=account=>account==='interestExpense'?'interest':account;
export function reportLayout(s,day,page,{fields={},previous=null,animated=false,teaching=false,value,revealNew=false}={}){if(page===0)return balanceSheet(s,day,{fields,previous,animated,teaching,value,revealNew,input:teaching?fields.familyDebt||'':''});
const rows=statement(s,day,page),old=statement(s,day-1,page),prior=previous?statement(previous,day,page):null,editing=!!previous,byKey=Object.fromEntries(Object.entries(fields).map(([k,v])=>[statementKey(k),v]));
let html=`<section class="statement-page"><div class="sheet-heading"><h3>${REPORT_NAMES[page]}</h3><p>阿柠的柠檬茶小摊 · 第 ${day} 天 <span>单位：元</span></p></div><p class="comparehint">${page===1?'本日截至当前的收入、成本与费用':'本日截至当前的现金流入与流出'}${editing?' · 在高亮处填写账本金额':' · 对照上一日发生额'}</p><div class="comparison ${editing?'report-editing':''}"><div class="compare-row compare-head"><span>条目</span><span>${day===1?'开局前':'上日'}</span><span>本日</span>${editing?'':'<span>变化</span>'}</div>`;
html+=rows.map(v=>{const priorRow=prior?.find(p=>p.key===v.key),added=prior&&!priorRow,oldValue=old.find(p=>p.key===v.key)?.value||0;return `<div class="compare-row ${added?'report-new'+(revealNew?' row-enter':''):priorRow&&priorRow.value!==v.value?'report-changed':''}"><span>${v.label}${added?'<small class="row-added">新增</small>':''}</span><span class="oldvalue">${oldValue}</span>${byKey[v.key]||`<strong>${v.value}</strong>`}${editing?'':badge(v.value-oldValue)}</div>`;}).join('')+'</div>';
if(!rows.length)html+='<p class="comparehint">相关交易发生后，对应的条目会出现在这里。</p>';if(page===2){const r=report(s,day);html+=`<div class="equation">期初 ${r.opening} + 净变动 ${r.flow} = 钱盒 ${r.b.cash} ✓</div>`;}return html+'</section>';}
