import {initInteractions,playCue,soundEnabled,setSound,celebrateLesson} from './interactions.js';
import {reportLayout,pageFor} from './report-layout.js';
import {balanceSheet,paintLoanEquation} from './balance-sheet.js';
import {ensureStock,possibleCups} from './materials.js';
import {purchasePanel,readCart,paintPurchase,stockPanel,stockForDay} from './purchase-ui.js';
import {formatMoney,sumMoney} from './currency.js';
import {queueLesson,renderLesson,drawLesson,submitEntries,finishLesson,lessonTargets,lessonIssues,paintLessonFeedback,focusLessonIssue} from './journal.js';
import {ensureWorld,advanceWait} from './rhythm.js';
import {waitingPanel,renderInterlude,paintStreet,animateDelivery} from './street.js';
import {loadGame,saveGame,envelope,restore} from './storage.js';
import {captureConcepts,showConcept,conceptExplanation,clearConcept} from './concepts.js';
import {start,act,balances,report,replay,needsReview} from './engine.js';
import {badge,statement,coins,silence,showChanges} from './feedback.js';
import {DAYS} from './events.js';
let saved=null,loadError=false;try{saved=await loadGame();}catch{loadError=true;}
let s=saved||start(),version=0,bookDay=1,page=0,sound=soundEnabled(),timer,saving=false,reviewing=false;
ensureWorld(s);ensureStock(s);
const $=id=>document.getElementById(id),money=formatMoney;
const btn=(a,text,sub='',primary=false,disabled=false)=>`<button data-action="${a}" data-version="${version}" class="${primary?'primary':''}" ${disabled?'disabled':''}>${text}${sub?`<small>${sub}</small>`:''}</button>`;
initInteractions();$('sound').textContent='声音 '+(sound?'开':'关');$('sound').setAttribute('aria-pressed',String(sound));
const choices=(...v)=>'<div class="choices">'+v.join('')+'</div>';
function feedback(){if(s.day===1){if(s.flags.credit==='refuse')return s.evening?`晚些时候实际卖出 ${s.evening.served} 杯，收摊报损 ${s.evening.spoiled} 杯。今天利润 ${report(s,1).profit} 元，钱盒 ${balances(s,1).cash} 元。`:'你选择了坚持现付，今天发生的交易都留在账本里。';return s.flags.credit==='deposit'?`今天赚了 ${report(s,1).profit} 元，先收的 3 元已经进了钱盒。原料和包材的余额可在库存里查看。`:`今天赚了 ${report(s,1).profit} 元，还有 15 元在欠条上，钱盒现有 ${money(balances(s,1).cash)}。`;}return s.channel==='group'?`团购比散客多赚 ${s.sold*2} 元，但要等到第 4 天才能收到钱。`:'每递出一杯，钱盒就多 5 元。这些现金可以用来还款。';}
function render(){version++;const b=balances(s),d=DAYS[s.day-1],cap=s.flags.machine?5:3;$('days').innerHTML=DAYS.map((d,i)=>`<span class="${i+1===s.day?'active':''}">0${i+1}　${['开张','做个选择','兑现承诺'][i]}</span>`).join('');$('weather').textContent=`第 ${s.day} 天 / ${d.weather}`;$('title').textContent=d.title;$('subtitle').textContent=d.note;$('cash').textContent=money(b.cash);$('growth').textContent=s.phase==='intro'?'一张旧桌子，等第一笔启动钱':`${b.profit<0?'累计亏损 '+money(-b.profit):'累计赚到 '+money(b.profit)} · ${s.flags.machine?'添了第一台摇茶机':'我的第一张摊桌'}`;$('cups').innerHTML=Array.from({length:Math.min(8,s.day===1&&['first','credit','dusk','evening'].includes(s.phase)?s.readyCups:possibleCups(s))},()=>'<span class="cup"></span>').join('');$('machine').innerHTML=s.flags.machine?'⚙<small>摇茶机</small>':'';$('note').innerHTML=b.receivable?`客人欠你的钱<br><strong>${money(b.receivable)}</strong><br>第 ${s.day===1?2:4} 天收款`:'';$('stocklabel').textContent=s.day===1&&['first','credit','dusk','evening'].includes(s.phase)?`现制茶 ${s.readyCups||0} 杯 · 当天售完`:`原料可现做 ${possibleCups(s)} 杯 · 可展开库存`;$('capacity').textContent=s.day===1?'小摊刚刚开张':`今天最多 ${cap} 杯`;
let html='',step='';switch(s.phase){case 'intro':step='巷口的第一天 · 口袋里 0 元';html='<div class="avatar">☺</div><h2>我也想摆个柠檬茶摊。</h2><p>你是阿柠，住在广州。天气热起来了，街坊都爱喝柠檬茶。<br>一张旧桌子有了，钱盒却空空的。</p><div class="warn">父母说：「先借你 10 元试试。免息，这三天不用急着还，但账上要记清楚。」</div>'+choices(btn('family','向父母借 10 元，开始我的小生意','借来的钱要还；不是赚到的钱',true));break;
case 'supplies':step='先采购，再开摊';html='<h2>第一批，计划做 4 杯。</h2>'+purchasePanel(s,4)+choices(btn('supplies','采购，手打 4 杯','材料不足或钱不够时不会扣款',true));break;
case 'first':step='第一笔生意';html='<div class="avatar">☺</div><h2>老板，来杯柠檬茶！</h2><p>你向父母借了 10 元，花 8 元做好第一批柠檬茶。<br>第一位街坊递来 5 元，等你把杯子递过去。</p><span class="tag">递出 1 杯 → 收到 5 元</span>'+choices(btn('serve','递杯，收下 5 元','钱盒会响起第一声',true));break;
case 'credit':step='一位有点特别的客人';html='<div class="avatar">☻</div><h2>剩下三杯，我都要。</h2><p>「我带给朋友喝。钱明天拿给你，行不行？」<br>天还没黑，巷口还有人来来往往。桌上的现制茶得今天卖掉。</p>'+choices(btn('full','好，记一张欠条','3 杯共 15 元，约定明天付'),btn('deposit','商量先付一点','先付 3 元，余款 12 元约定明天付'),btn('refuse','今天只收现钱','再等一等其他街坊，也可能等不到'));break;
case 'dusk':step='傍晚 · 再摆一会儿';html='<h2>「那我下次再来。」</h2><p>客人走了。你把桌上的茶摆整齐，望向巷口。<br>路过的人，有的放慢脚步，也有的匆匆赶路。</p><span class="tag">现制茶当天售完 · 晚些时候的客流不确定</span>'+choices(btn('wait','再等一会儿','',true));break;
case 'evening':{const e=s.evening,remaining=e.demand-e.served;step='傍晚 · 街坊巷口';html=e.demand===0?'<h2>街灯亮了，巷口渐渐安静。</h2><p>你等了一会儿，今晚没有其他客人停下来。<br>桌上的茶还在，冰却已经化了。</p>':remaining>0?`<div class="avatar">☺</div><h2>「还有茶吗？我们要 ${e.demand} 杯。」</h2><p>晚些时候，有街坊走过来，拿出了现金。<br>已经递出 ${e.served} 杯，还等着 ${remaining} 杯。</p>`:'<h2>「多谢，明天见！」</h2><p>客人拎着茶离开了，钱已经放进钱盒。<br>天色晚了，准备把摊桌收起来吧。</p>';html+=choices(remaining>0?btn('eveningCup','递出一杯，收下 5 元','',true):btn('finishEvening','收摊，处理今天剩下的茶','现制茶不留到明天',true));break;}
case 'supplier':step='收摊前 · 补一些明天的货';html='<h2>按配方，自己配货。</h2><p>未制作的原料按各自期限保存，杯子和吸管单独留存。</p>'+purchasePanel(s,5)+choices(btn('buy','按这张采购单付款','',true),btn('skip','今天先不补货'));break;
case 'close1':case 'close2':{step='收摊啦 · 先看看自己的结果';const r=report(s,s.day);html=`<h2>第 ${s.day} 天，辛苦啦。</h2><div class="metric">${money(r.profit)}<small>今天的利润</small></div><p>钱盒 ${money(b.cash)}　·　客人还欠 ${money(b.receivable)}</p><div class="warn">${feedback()}</div>`+choices(btn('ledger','翻开今天的三页账本','每一项都能找到对应交易'),btn('next',s.day===1?'休息一下，迎接第 2 天':'迎接第 3 天 · 处理到期付款','账目和实物都会留到明天',true));break;}
case 'collect':step='第 2 天 · 开门第一件事';html='<h2>'+(b.receivable?'昨天的客人来还钱了。':'昨天没有留下欠条。')+'</h2><p>'+(b.receivable?`「说好的，这是 ${b.receivable} 元。」<br>收款只把欠条变成现金，不会再赚一次。`:'桌上的杯子和钱盒都在，可以继续经营。')+'</p>'+choices(btn('collect',b.receivable?'收钱，收起欠条':'整理钱盒，准备开张','',true));break;
case 'prepare':step='开门前 · 看库存、配原料';html=`<h2>今天准备卖几杯？</h2><p>基础摊位最多卖 3 杯，摇茶机最多卖 5 杯。原料按配方匹配，包材会继续保留。</p>`+purchasePanel(s,5)+choices(btn('stock','按采购单补货',s.flags.stock2?'今天已经补过货':'',false,s.flags.stock2),btn('askloan',s.flags.loan?'已借 12 元':'借 12 元短期贷款','第 3 天开门前还本金 12 元 + 利息 2 元',false,s.flags.loan),btn('machine',s.flags.machine?'摇茶机已就位':'买摇茶机 · 24 元',s.flags.machine?'产能 5 杯':b.cash<24?`还差 ${money(24-b.cash)}`:'今天使用计提 4 元折旧',false,s.flags.machine||b.cash<24),btn('ready','备好了，开张','',true));break;
case 'channel':step='今天卖给谁？';html='<h2>两条路，一张摊桌。</h2><p>选定一个渠道，逐杯交付。今天最多交付 '+Math.min(cap,possibleCups(s))+' 杯。</p>'+choices(btn('walk','现场散客 · 每杯 5 元','杯子递出，现金到账',true),btn('group','活动团购 · 每杯 7 元','第 4 天统一付款'));break;
case 'confirm':step='签团购前 · 看看这条时间线';html='<h2>多赚一点，要等两天。</h2><div class="timeline">第 2 天 · 交杯、确认收入<br><strong>第 3 天 · '+(s.flags.loan?'必须还款 14 元':'没有短期贷款到期')+'</strong><br>第 4 天 · 团购款才到账</div><p>现在钱盒 '+money(b.cash)+'。欠条不能在第 3 天立即兑现。</p>'+choices(btn('confirm','确认签下团购欠条','我知道第 4 天才能收到钱',true),btn('back','再想想，重新选渠道'));break;
case 'sell':step=s.channel==='group'?'活动团购 · 杯子走了，钱盒没有响':'现场散客 · 一手递杯，一手收钱';html=`<h2>${s.channel==='group'?'给活动送去柠檬茶。':'客人排到摊前了。'}</h2><p>已交付 ${s.sold} / ${cap} 杯　·　可现做 ${possibleCups(s)} 杯<br>${s.channel==='group'?'每杯欠条 +7 元，第 4 天收款。':'每杯收到 5 元现金。'}</p>`+choices(btn('cup',s.channel==='group'?'递出一杯，记上欠条':'递出一杯，收下 5 元','',true,s.sold>=cap||possibleCups(s)<1),btn('close','今天收摊',s.sold===0?'也可以选择今天不卖':'翻开账本看看结果'));break;
case 'due':step='第 3 天 · 新销售开始之前';html='<h2>'+(s.flags.loan?'还款日到了。':'今天，依然可以开张。')+'</h2><p>'+(s.flags.loan?'借款本金 12 元，利息 2 元。<br>先兑现承诺，再开始新的生意。':'父母借的 10 元，本章不用归还。<br>你没有额外的短期贷款，今天没有到期付款。')+'</p><div class="metric">'+money(b.cash)+'<small>可立即使用的现金</small></div>'+(s.flags.loan?`<div class="timeline">今天到期 · 14 元<br>第 4 天到账 · ${b.receivable} 元</div>`:'')+choices(btn('repay',s.flags.loan?'打开钱盒，处理 14 元还款':'继续营业，看看结局','',true));break;
case 'end':step='三天的小小生意 · 你的结局';html=`<h2>${s.end==='failure'?'资金断裂 · Game Over':s.end==='success'?'扩张成功':'小摊继续营业'}</h2><p>${s.end==='failure'?`第 3 天开门前需付 14 元，现金 ${b.cash} 元，缺 ${14-b.cash} 元。<br>这是一次到期违约；资产与欠款都保留在账本里。`:s.end==='success'?`摇茶机和 5 杯现钱生意，让你还清了短期贷款。钱盒还剩 ${b.cash} 元；借父母的 10 元仍记在账上。`:'小摊没有违约。父母借的 10 元还记在账上，一杯一杯慢慢成长。'}</p><div class="warn">${s.flags.loan?(s.channel==='group'?'改变结果的一步：第 2 天接下团购。收入已经赚到，现金却要第 4 天才来。':'改变结果的一步：第 2 天选择现钱生意，现金赶在还款日前到账。'):'改变结果的一步：没有额外借短期贷款，就没有第 3 天的 14 元还款压力。'}</div>`+choices(btn('ledger','复盘三天账本',`现金 ${b.cash} · 应收 ${b.receivable} · 负债 ${sumMoney([b.debt,b.familyDebt,b.interest])}`),btn('replay','重玩第 2 天','恢复第 2 天开门前的全部账目',true),btn('restart','从头再来'));break;}
if(s.world.wait){step='接单台';html=waitingPanel(s,btn);}
$('step').textContent=step;$('actions').innerHTML=html;$('warehouse').innerHTML=s.phase==='intro'?'':stockPanel(s);paintPurchase(s);renderInterlude(s,btn);syncReading();paintStreet(s,isReading()||document.hidden);}

function toast(t){$('toast').textContent=t;$('toast').classList.add('show');clearTimeout(timer);timer=setTimeout(()=>$('toast').classList.remove('show'),2500);}
async function handleAction(e){const el=e.target.closest('[data-action]');if(saving||isReading()||!el||el.disabled||Number(el.dataset.version)!==version)return;clearConcept();let a=el.dataset.action;if(a==='ledger'){openBook();return;}if(a==='askloan'){const h='<h2>签一张清楚的借款单。</h2><p>现在收到 12 元。第 3 天开门前，归还本金 12 元和利息 2 元，共 14 元。团购款第 4 天才到账。</p>'+choices(btn('loan','签约，收到 12 元','我会在第 3 天开门前还 14 元',true),btn('cancel','暂时不借'));$('actions').innerHTML=h;return;}if(a==='cancel'){render();return;}if(a==='restart'){s=start();render();$('changefeed').replaceChildren();await persist();return;}if(a==='replay'){s=replay(s);render();$('changefeed').replaceChildren();await persist();return;}const beforeState=JSON.parse(JSON.stringify(s)),before=balances(s),qty=readCart();if(act(s,a,qty)){const after=balances(s);if(after.cash>before.cash&&sound)coins();if(!['arrive','call'].includes(a)){captureConcepts(beforeState,s);queueLesson(beforeState,s);}render();if(['serve','cup','eveningCup'].includes(a))animateDelivery();if(['full','deposit'].includes(a))animateDelivery(3);if(!['arrive','call'].includes(a)){showChanges(before,after);}if(a==='cup'||a==='serve'||a==='eveningCup')toast(after.cash>before.cash?'杯子递出去了，钱盒响了一声。':'杯子递出去了，桌上多了一笔欠条。');if(a==='finishEvening'&&s.evening.spoiled)toast(`${s.evening.spoiled} 杯现制茶报损，损失已记入今天的账本。`);if(a==='collect'&&before.receivable)toast('欠条换成现金，利润没有重复增加。');await persist();}else{playCue('retry');if(['supplies','buy','stock'].includes(a))paintPurchase(s,true);toast('这笔交易暂时无法完成，请检查库存和现金。');}}
$('actions').addEventListener('click',handleAction);$('scenecontrols').addEventListener('click',handleAction);
function isReading(){return !!$('ledger').open||!!$('conceptnotice').open||!!$('journal').open;}
function syncReading(){if(s.pendingLesson){clearConcept();renderLesson(s);}else if(needsReview(s)){clearConcept();openBook(true);}else if(s.pendingConcepts)showConcept(s);}
function openBook(daily=false){if(s.pendingLesson||(!daily&&$('conceptnotice').open))return;clearConcept();reviewing=daily;bookDay=s.day;page=daily?1:0;drawBook();if(!$('ledger').open)$('ledger').showModal();$('ledger').scrollTop=0;paintStreet(s,true);}
async function dismissLedger(){if(s.pendingLesson)return;if(reviewing)act(s,'review');reviewing=false;$('ledger').close();render();await persist();}
async function dismissConcept(){s.pendingConcepts=null;clearConcept();render();await persist();}
$('book').onclick=()=>openBook();$('cashbox').onclick=()=>openBook();$('note').onclick=()=>openBook();
$('closebook').onclick=dismissLedger;$('closebookbottom').onclick=dismissLedger;$('closeconcept').onclick=dismissConcept;
$('ledger').addEventListener('cancel',e=>{e.preventDefault();void dismissLedger();});
$('conceptnotice').addEventListener('cancel',e=>{e.preventDefault();void dismissConcept();});
$('sound').onclick=()=>{sound=!sound;setSound(sound);$('sound').textContent='声音 '+(sound?'开':'关');$('sound').setAttribute('aria-pressed',String(sound));if(sound)playCue('success');else silence();};$('motion').onclick=()=>{document.body.classList.toggle('no-motion');$('motion').textContent=document.body.classList.contains('no-motion')?'动画已跳过':'跳过动画';};
function drawBook(){const r=report(s,bookDay),b=r.b;
$('booktitle').textContent=reviewing?`第 ${s.day} 天 · ${s.phase==='end'?'到期结算':'收摊账本'}`:'小摊账本';
$('closebookbottom').textContent=reviewing?'合上账本 · 今天辛苦了':'合上账本，继续经营';
$('bookreview').hidden=!reviewing;
if(reviewing)$('bookreview').innerHTML=`<div class="review-stamp">今日已收摊 · 亲手记对 ${(s.journalLog||[]).filter(v=>v.day===bookDay).length} 笔</div><div class="review-totals"><div><small>现在的资产</small><strong>${money(sumMoney([b.cash,b.inventory,b.receivable,b.equipment]))}</strong></div><div><small>今天的利润</small><strong>${money(r.profit)}</strong></div><div><small>钱盒余额</small><strong>${money(b.cash)}</strong></div></div><p class="review-feedback">${s.day===3?(s.end==='failure'?'今天到期的款项未能付清，本金和应付利息仍保留在账上。':'今天的到期付款已处理，资产和欠款都记在这里。'):feedback()}</p>`+(s.pendingConcepts?conceptExplanation(s.pendingConcepts.keys):'');
$('daytabs').innerHTML=(reviewing?[s.day]:Array.from({length:s.day},(_,i)=>i+1)).map(day=>`<button data-day="${day}" class="${bookDay===day?'selected':''}">第 ${day} 天</button>`).join('');
$('tabs').innerHTML=['现在有什么、欠什么','今天赚多少','钱从哪来、到哪去'].map((t,i)=>`<button data-page="${i}" class="${page===i?'selected':''}">${t}</button>`).join('');
let h=reportLayout(s,bookDay,page);
if(page===0){const stock=stockForDay(s,bookDay);if(stock)h+=stockPanel(stock);}
h+='<h3 style="margin-top:25px">交易来处</h3>';const relevant=page===0?s.tx.filter(t=>t.day<=bookDay):r.ts;h+=relevant.map(t=>`<div class="transaction">第 ${t.day} 天 · ${t.label}<span>${Object.entries(t.delta).map(([k,v])=>({cash:'现金',inventory:'存货',receivable:'应收',equipment:'设备',debt:'短期借款本金',familyDebt:'欠父母的钱',interest:'应付利息',capital:'投入',profit:'利润'}[k])+` ${v>=0?'+':''}${v}`).join('　')}</span></div>`).join('')||'<p>今天还没有交易。</p>';$('pages').innerHTML=h;}
$('daytabs').onclick=e=>{if(e.target.dataset.day){bookDay=Number(e.target.dataset.day);drawBook();}};$('tabs').onclick=e=>{if(e.target.dataset.page){page=Number(e.target.dataset.page);drawBook();}};render();

async function persist(quiet=false){saving=true;if(!quiet)$('savestatus').textContent='正在保存…';try{await saveGame(s);$('savestatus').textContent='已自动保存到此浏览器';}catch{$('savestatus').textContent='自动保存不可用，请导出存档备份';}finally{saving=false;}}
$('savestatus').textContent=loadError?'本地进度暂时无法读取，可导入备份':saved?'已恢复上次的小摊 · 继续经营吧':'进度会自动保存在此浏览器';
$('exportsave').onclick=()=>{const blob=new Blob([JSON.stringify(envelope(s),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='柠檬茶小摊-存档.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('importsave').onclick=()=>{if(!saving)$('savefile').click();};
$('savefile').onchange=async e=>{const file=e.target.files[0];if(!file||saving)return;saving=true;try{if(file.size>256000)throw Error('存档文件过大');const next=restore(JSON.parse(await file.text()));clearConcept();s=next;render();$('changefeed').replaceChildren();await persist();toast('小摊回来了，继续经营吧。');}catch{toast('无法读取这份存档，当前进度保持不变。');}finally{saving=false;e.target.value='';}};

let lastTick=performance.now(),lastWaitSave=0,ticking=false;
async function tickStreet(){const now=performance.now(),elapsed=Math.min(250,now-lastTick);lastTick=now;
 if(ticking||saving)return;const paused=!!document.hidden||isReading();paintStreet(s,paused);
 if(paused||!s.world.wait)return;ticking=true;
 try{const done=advanceWait(s,elapsed);paintStreet(s,false);if(done){act(s,'arrive');render();await persist(true);}else if(now-lastWaitSave>1000){lastWaitSave=now;await persist(true);}}finally{ticking=false;}
}
setInterval(()=>{void tickStreet();},100);
document.addEventListener?.('visibilitychange',()=>{lastTick=performance.now();paintStreet(s,!!document.hidden||isReading());if(document.hidden&&!saving)void persist(true);});
globalThis.addEventListener?.('pagehide',()=>{if(!saving)void persist(true);});

let draftTimer;
$('journalform').addEventListener('input',e=>{const p=s.pendingLesson,field=e.target.dataset.field,index=Number(e.target.dataset.entry);if(!p||p.status!=='editing'||!p.draft[index]||!p.editable.includes(index)||field!=='amount')return;p.draft[index][field]=String(e.target.value).slice(0,30);paintLoanEquation(s);paintLessonFeedback(s,{edited:true});clearTimeout(draftTimer);draftTimer=setTimeout(()=>{if(!saving)void persist(true);},400);});
$('journalform').addEventListener('submit',async e=>{
 e.preventDefault();if(saving||!s.pendingLesson||s.pendingLesson.status==='correct')return;
 clearTimeout(draftTimer);const p=s.pendingLesson,result=submitEntries(s,p.draft);
 if(!result.ok){const issues=lessonIssues(s),first=issues.find(v=>v.page===p.page)||issues[0];if(first)p.page=first.page;}
 drawLesson(s);
 if(result.ok){playCue('success');celebrateLesson();$('journaldone').focus({preventScroll:true});$('journaldone').scrollIntoView({block:'nearest',behavior:'instant'});}
 else{playCue('retry');focusLessonIssue(s);}
 await persist();
});
$('journalfeedback').addEventListener('click',e=>{const button=e.target.closest('[data-fix-amount]');if(button)focusLessonIssue(s,Number(button.dataset.fixAmount));});
async function continueLesson(){if(saving||!finishLesson(s))return;if(needsReview(s))playCue('complete');if(!needsReview(s))s.pendingConcepts=null;$('journal').close();render();await persist();}
$('journaldone').onclick=continueLesson;
$('journal').addEventListener('cancel',e=>{
 e.preventDefault();
 if(s.pendingLesson?.status==='correct'){void continueLesson();return;}
 playCue('retry');
 $('journalfeedback').innerHTML='<p class="lesson-edited">先补全并核对这笔账，就能继续。填错不会扣钱。</p>';
 const input=$('journalrows').querySelector('input');
 if(input){input.focus({preventScroll:true});input.scrollIntoView({block:'center',behavior:'instant'});}
});

$('actions').addEventListener('input',()=>paintPurchase(s));
$('actions').addEventListener('click',e=>{const button=e.target.closest('[data-material]');if(!button||isReading()||saving)return;const input=$('material-'+button.dataset.material);if(!input)return;input.value=Math.max(0,Number(input.value||0)+Number(button.dataset.change));paintPurchase(s);});

$('journaltabs').addEventListener('click',e=>{const tab=e.target.closest('[data-report]');if(!tab||!s.pendingLesson||saving)return;s.pendingLesson.page=Number(tab.dataset.report);drawLesson(s);});
