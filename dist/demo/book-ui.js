import {TEST_TOOLS} from './test-tools.js';
import {todayProfit} from './daily.js';
import {bookContext} from './book-context.js';
import {keepFieldVisible} from './platform.js';
import {paginateBook,revealBookNode,refreshBookPages,clearBookPages} from './sheet-pager.js';
import {statementRows,incomeExpenseDetails,report,money,REPORT_NAMES,bookIssues,reportAvailable,pendingFields,fieldGuide,unfilledFields} from './accounting.js';
import {reportPeriod} from './timeline.js';
import {TERMS,termForRow} from './learning.js';
const $=id=>document.getElementById(id),esc=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
let lastDocument='';
export const fieldId=(page,key)=>`book-${page}-${key}`;
function balanceSheetMarkup(rows,renderRow,r){
 const assetKeys=['cash','inventory','receivable','equipment'],liabilityKeys=['payable','loan','interestPayable','wagesPayable'];
 const assets=rows.filter(row=>assetKeys.includes(row.key)),liabilities=rows.filter(row=>liabilityKeys.includes(row.key));
 const equity=rows.filter(row=>['capital','partnerCapital','profit','distributions'].includes(row.key)),hasLiabilities=liabilities.length>0;
 const render=list=>list.map(row=>renderRow(row,Math.max(0,rows.findIndex(v=>v.key===row.key)))).join('');
 const total=(key,label,value)=>renderRow({key,label,value,calculated:true},rows.length);
 const assetTotal=rows.find(row=>row.key==='assets'),sourcesTotal=rows.find(row=>row.key==='sources');
 return `<div class="balance-sheet" aria-label="左右分栏资产负债表"><section class="balance-column balance-assets" aria-label="资产"><h4>资产</h4><div class="balance-details">${render(assets)}</div>${renderRow(assetTotal,rows.indexOf(assetTotal))}</section><section class="balance-column balance-sources" aria-label="负债和所有者权益"><h4>${hasLiabilities?'负债和所有者权益':'所有者权益'}</h4><div class="balance-details">${hasLiabilities?`<h5>负债</h5>${render(liabilities)}${total('liabilities-total','负债合计',r.liabilities)}<h5>所有者权益</h5>`:''}${render(equity)}${hasLiabilities?total('equity-total','所有者权益合计',r.equity):''}</div>${renderRow({...sourcesTotal,label:hasLiabilities?sourcesTotal.label:'所有者权益合计'},rows.indexOf(sourcesTotal))}</section></div>`;
}
function incomeStatementMarkup(rows,renderRow){
 return `<div class="financial-table income-statement"><div class="statement-columns"><strong>项目</strong><strong>本期累计金额</strong></div>${rows.map(renderRow).join('')}</div>`;
}
function cashflowStatementMarkup(rows,renderRow){
 const outflows=rows.filter(row=>!['opening','incoming','ending'].includes(row.key));
 return `<div class="financial-table cashflow-statement"><div class="statement-columns"><strong>项目</strong><strong>本局累计金额</strong></div><section class="cash-reconciliation">${rows.filter(row=>['opening','incoming'].includes(row.key)).map(renderRow).join('')}</section>${outflows.length?`<section class="cashflow-group cash-outflows" aria-label="现金流出"><h4>现金流出</h4>${outflows.map(row=>renderRow(row,rows.indexOf(row))).join('')}</section>`:''}<section class="cash-reconciliation">${rows.filter(row=>row.key==='ending').map(renderRow).join('')}</section></div>`;
}
export function drawBook(s,page=0){
 const p=s.pendingBook;if(p)page=p.page;
 $('book-caption').classList.remove('transaction-context');
 const available=[0,1,2].filter(n=>reportAvailable(s,n));
 if(!available.length){clearBookPages();$('book-title').textContent='贼溜溜的小账本';$('book-caption').textContent='钱盒还空着。';$('book-tabs').innerHTML='';$('book-body').innerHTML='<div class="empty-statement">圆滚滚：先放进第一笔零花钱吧，小摊的账就从这里开始。</div>';$('book-footer').innerHTML='<button type="button" class="primary-button" data-close="book">回到巷口</button>';return 0;}
 if(!available.includes(page))page=available[0];if(p)p.page=page;

 const first=p&&!(p.automatic?p.animatedPages||[]:p.seenPages).includes(page),r=report(s),errors=p?.attempts&&!p.reminder?bookIssues(s):[];
 $('book-title').textContent='贼溜溜的小账本';
 $('book-caption').textContent=p?.automatic?'贼溜溜：今天的日常账目，已经替你记好了。':p?(p.checked?'这一笔，记好了。':p.fields.length?'贼溜溜：这笔咱们记多少？':'贼溜溜：看看这几个数字变了没有。'):s.stage==='results'?(s.course?.summer?.distributed?'清算并分配后 · 单位：元':'收摊后 · 分钱前 · 单位：元'):'截至现在 · 单位：元';
 const context=bookContext(s);if(context){$('book-caption').textContent=context;$('book-caption').classList.add('transaction-context');}
 if(page===1&&(!p||p.automatic))$('book-caption').textContent=`今日净利润 ${money(todayProfit(s))} 元 · 表内为本局累计`;
 $('book-tabs').innerHTML=REPORT_NAMES.map((name,i)=>{if(!available.includes(i))return '';const n=pendingFields(s,i).length,newRows=p?.changes.filter(c=>c.page===i&&c.fresh).length||0;return `<button type="button" class="${page===i?'selected':''} ${n?'has-pending':''}" data-bookpage="${i}" aria-pressed="${page===i}">${name}<small class="pending-badge" data-pending-count="${i}" ${n?'':'hidden'}>${n} 处待填</small>${newRows?`<small>${newRows} 项新增</small>`:p?.pages.includes(i)?'<small>本笔有变化</small>':''}</button>`;}).join('');
 const rows=statementRows(s,page);
 const helpKeys=[...new Set((p?.fields||[]).filter(f=>f.page===page).map(f=>termForRow(f.key)).filter(Boolean))];
 const learningHelp=helpKeys.length?`<details class="book-learning-help"><summary>贼溜溜的小提醒</summary>${helpKeys.map(key=>{const t=TERMS[key];return `<p><strong>${t.name}：</strong>${t.definition}</p>${t.formula?`<p class="formula-line">${t.formula}</p>`:''}`;}).join('')}</details>`:'';
 s.reportLessonsSeen??=[];const firstReport=!s.reportLessonsSeen.includes(page),introKey=['balanceSheet','incomeStatement','cashflowStatement'][page];
 const reportIntro=firstReport&&s.journey!=='opening-cash-v2'?`<section class="report-introduction"><strong>${REPORT_NAMES[page]}</strong><p>${TERMS[introKey].definition}</p>${TERMS[introKey].formula?`<p class="formula-line">${TERMS[introKey].formula}</p>`:''}</section>`:'';
 if(firstReport)s.reportLessonsSeen.push(page);
 let body=reportIntro+learningHelp+`<form id="book-form" novalidate><section class="animated-statement ${page===0?'balance-statement':''}" aria-label="${REPORT_NAMES[page]}"><h3><span class="term-label">${REPORT_NAMES[page]}<button type="button" class="term-help" data-open-term="${['balanceSheet','incomeStatement','cashflowStatement'][page]}" aria-label="了解${REPORT_NAMES[page]}">?</button></span></h3><p class="muted">${page===0?'现在有什么、欠什么、剩下多少归所有者':page===1?'已经确认的营业收入、营业成本和损失':'现金实际从哪里来、到哪里去'}</p><div class="statement-meta"><span>编制单位：手打柠檬茶</span><span>${reportPeriod(s,page)}</span><span>单位：元</span></div>`;
 if(!rows.length)body+='<p class="muted empty-statement">相关交易发生后，新的条目会从这里展开。</p>';
 const renderRow=(row,i)=>{
  const change=p?.changes.find(c=>c.page===page&&c.key===row.key),field=p?.fields.find(f=>f.page===page&&f.key===row.key),issue=errors.find(e=>e.page===page&&e.key===row.key),id=fieldId(page,row.key);
  const editable=field&&!p.checked;
  const value=editable?`<div class="book-input-cell"><div class="book-input-line"><label class="input-control"><input id="${id}" data-book-field="${page}:${row.key}" type="number" step="0.01" inputmode="decimal" enterkeyhint="done" autocomplete="off" value="${esc(field.value)}" aria-label="${row.label}金额，元" aria-invalid="${!!issue}" aria-describedby="${id}-error">${page===0?'':'<span>元</span>'}</label><button type="button" class="field-hint-trigger" data-field-help aria-haspopup="dialog" aria-label="查看${row.label}的金额提示" hidden>提示</button></div><small id="${id}-error" class="field-error" ${issue?'':'hidden'}>${issue?.message||''}</small></div>`:`<strong>${money(row.value)}${row.calculated&&!row.detail&&!row.auxiliary?'<small class="auto-label">自动合计</small>':''}</strong>`;
  const term=row.key==='profit'&&page===0&&s.course?.totalWeeks===8?'retained':termForRow(row.key);
  return `<div class="book-row ${row.calculated&&!row.detail&&!row.auxiliary&&!row.subtotal?'total':''} ${row.detail?'statement-detail':''} ${row.auxiliary?'statement-auxiliary':''} ${row.subtotal?'statement-subtotal':''} ${row.net?'statement-net':''} ${change?.fresh?'new-report-row':change?'changed-report-row':''} ${first&&change?(change.fresh?'report-row-enter':'report-row-pulse'):''} ${issue?'invalid':''} ${editable&&pendingFields(s,page).some(f=>f.key===row.key)?'has-pending':''}" style="--row:${i}" data-book-row="${page}:${row.key}"><span><span class="term-label">${row.label}${row.auxiliary?'<small class="auxiliary-label">辅助计算</small>':''}${term?` <button type="button" class="term-help" data-open-term="${term}" aria-label="了解${TERMS[term].name}">?</button>`:''}</span>${change?.fresh?'<small class="new-row-badge">新增</small>':''}${change&&!change.fresh?`<small class="previous-value">原来 ${money(change.previous)}</small>`:''}</span>${value}${editable?`<div id="${id}-guide" class="book-math-guide" hidden></div>`:''}</div>`;
 };
 body+=(page===0?balanceSheetMarkup(rows,renderRow,r):page===1?incomeStatementMarkup(rows,renderRow):cashflowStatementMarkup(rows,renderRow))+'</section></form>';
 if(page===0)body+='<div class="book-equation">资产 ＝ 负债 ＋ 所有者权益</div>';
 if(page===1){const details=incomeExpenseDetails(s);if(details.length)body+=`<details class="result-detail"><summary>费用明细</summary>${details.map(row=>`<div class="transaction">${row.label}<span>${money(row.value)} 元</span></div>`).join('')}</details>`;body+='<p class="statement-note">毛利＝营业收入－营业成本；净利润＝毛利－费用。本篇费用汇总含已确认的损失，设备折旧计入营业成本，未模拟所得税。</p>'; }
 if(page===2)body+=`<p class="muted">期末现金余额＝期初现金余额＋现金流入－现金支出。各项支出按正数列示，非现金交易不计入本表。</p>`;
 body+=`<details class="result-detail"><summary>查看每笔交易来处</summary>${s.tx.map(t=>`<div class="transaction">${esc(t.label)}<span>现金 ${(t.delta.cash||0)>=0?'+':''}${money(t.delta.cash||0)} 元 · 利润 ${(t.delta.profit||0)>=0?'+':''}${money(t.delta.profit||0)} 元</span></div>`).join('')}</details>`;
 if(p?.previousDraft?.some(f=>String(f.value).trim()))body+=`<details class="result-detail"><summary>上版保留的填写</summary>${p.previousDraft.filter(f=>String(f.value).trim()).map(f=>`<p>${esc(f.label)}：${esc(f.value)} 元</p>`).join('')}<p>报表已简化，请核对当前条目；原有填写和交易保留。</p></details>`;
 const documentKey=(p?.id||s.tx.at(-1)?.id||'opening')+':'+page;
 $('book-body').innerHTML=body;if(documentKey!==lastDocument)$('book-body').scrollTop=0;lastDocument=documentKey;
 const needCheck=p?.fields.length&&!p.checked,unseen=p?.pages.some(v=>v!==page&&!p.seenPages.includes(v));
 const testButton=TEST_TOOLS&&p&&!p.checked?'<button type="button" class="mini-link test-fill" data-test-fill>测试 · 一键填表</button>':'';
 const checkButton='<button type="submit" form="book-form" class="primary-button" data-book-check>这一笔，记好了</button>';
 const continueButton=`<button type="button" class="primary-button" data-book-done>${unseen?'还有一页，翻过去看看':'合上账本'}</button>`;
 $('book-footer').innerHTML=p?`<div id="book-alert" role="status"></div><div class="book-footer-actions ${testButton?'has-test-fill':''}">${needCheck?checkButton:continueButton}${testButton}${['liquidation','results'].includes(s.stage)?'':'<div class="book-secondary-actions"><button type="button" class="mini-link" data-end-from-book>先收摊</button><button type="button" class="mini-link" data-restart>重新开张</button></div>'}</div>`:'<button type="button" class="primary-button" data-close="book">合上账本，继续经营</button>';
 if(p&&!p.seenPages.includes(page))p.seenPages.push(page);if(p?.automatic){p.animatedPages??=[];if(!p.animatedPages.includes(page))p.animatedPages.push(page);}
 paintBookErrors(s);
 const pending=pendingFields(s,page)[0];paginateBook(documentKey,pending?$(fieldId(page,pending.key)):null);
 return page;
}
export function paintBookErrors(s,edited=false){const p=s.pendingBook;if(!p)return;const errors=p.attempts&&!p.checked&&!p.reminder?bookIssues(s):[];
 for(const f of p.fields){const input=$(fieldId(f.page,f.key));if(!input)continue;const issue=errors.find(e=>e.page===f.page&&e.key===f.key);input.setAttribute('aria-invalid',String(!!issue));input.closest('[data-book-row]')?.classList.toggle('invalid',!!issue);const hint=$(fieldId(f.page,f.key)+'-error');if(hint){hint.hidden=!issue;hint.textContent=issue?.message||'';}input.closest('[data-book-row]')?.classList.toggle('has-pending',!p.checked&&pendingFields(s,f.page).some(v=>v.key===f.key));const trigger=input.closest('.book-input-cell')?.querySelector('.field-hint-trigger');if(trigger){trigger.hidden=!issue;trigger.dataset.helpCopy=issue?fieldGuide(s,f):'';}const guide=$(fieldId(f.page,f.key)+'-guide'),count=p.errorCounts?.[f.page+':'+f.key]||0;if(guide){guide.hidden=!(issue&&count>=2);guide.replaceChildren();if(issue&&count>=2){const copy=document.createElement('span');copy.className='guide-copy';copy.textContent=fieldGuide(s,f);const more=document.createElement('button');more.type='button';more.className='guide-expand';more.dataset.fieldHelp='';more.textContent='分步看看怎么算';guide.append(copy,more);}}}
 const box=$('book-alert');if(!box)return;
 box.setAttribute('role',errors.length?'alert':'status');
 if(p.reminder){const count=unfilledFields(s,p.page).length;box.innerHTML=`<div class="book-nudge">${REPORT_NAMES[p.page]}还有 ${count} 处待填，接着记就好。</div>`;}
 else if(errors.length)box.innerHTML=`<div class="entry-alert"><strong>${errors.length} 处金额需要修改。</strong> 再看看这几处。<button type="button" data-focus-book="${errors[0].page}:${errors[0].key}">去修改 ↓</button></div>`;
 else if(p.automatic){const sales=s.tx.filter(t=>p.id.split('|').includes(t.id)&&t.kind==='sale'),cash=sales.reduce((n,t)=>n+(t.delta.cash||0),0),gross=sales.reduce((n,t)=>n+t.revenue-t.cost,0);box.innerHTML=`<div class="book-success auto-book-success ${cash?'has-income':''}" role="status">${cash?`<span class="receipt-coin" aria-hidden="true">¥</span> 收到 ${money(cash)} 元 · 卖茶毛利 ${money(gross)} 元`:'✓ 日常账目已自动填好，报表已更新。'}</div>`;}
 else if(p.checked)box.innerHTML='<div class="book-success" role="status">✓ 新增金额核对正确，报表已更新。</div>';
 else if(edited&&p.attempts)box.innerHTML='<p class="entry-status">金额已修改，请重新核对。</p>';
 else box.textContent=p.notice||'';
 for(const button of document.querySelectorAll('#book-tabs [data-bookpage]')){const page=Number(button.dataset.bookpage),n=pendingFields(s,page).length;button.classList.toggle('has-pending',!!n);const badge=button.querySelector('[data-pending-count]');if(badge){badge.hidden=!n;badge.textContent=n+' 处待填';}}
}
export function focusBookField(s,page,key){const p=s.pendingBook,shown=document.querySelector('#book-tabs [aria-pressed="true"]')?.dataset.bookpage;if(p&&(p.page!==page||shown!==String(page))){p.page=page;drawBook(s,page);}const input=$(fieldId(page,key));refreshBookPages(input);revealBookNode(input);input?.focus({preventScroll:true});keepFieldVisible(input?.closest('.book-input-cell')||input,$('book-body'));}
