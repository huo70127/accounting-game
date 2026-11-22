import {MATERIALS,RECIPE_COST,quote,quantities,possibleCups,afterPurchaseCups,dateLabel} from './procurement.js';
import {forecastCups} from './stock-policy.js';
import {balances,money} from './accounting.js';
const $=id=>document.getElementById(id),esc=value=>String(value).replaceAll('&','&amp;').replaceAll('\"','&quot;').replaceAll('<','&lt;');let page=0,count=5;
export function recipeMarkup(){return `<div class="recipe-note"><h3>每杯手打柠檬茶</h3><p>柠檬 50 克＋茶叶 3 克＋糖浆 15 毫升<br>塑料杯 1 个＋吸管 1 根</p><p>接单后现打现卖，不储存成品茶。每杯消耗的原料和包材成本 ${money(RECIPE_COST)} 元。水和冰暂不单独计价；单价和保质期均为本局游戏规则。</p></div>`;}
export function stockMarkup(s){const pastry=s.course?.summer?.pastryStock||0;const have=quantities(s);return Object.entries(MATERIALS).map(([key,m])=>{const lots=(s.stockLots||[]).filter(l=>l.material===key),held=lots.filter(l=>l.quarantined).reduce((n,l)=>n+l.quantity,0),expires=lots.filter(l=>l.expires!==null).map(l=>l.expires);return `<section class="stock-item"><h3>${m.name} <strong>${have[key]+held} ${m.unit}</strong></h3><p>${m.life===null?'包材，本局不设到期日':s.course?.stockPolicyVersion===3?'本章妥善冷藏、干燥保存，按周盘点':expires.length?`${dateLabel(Math.min(...expires),s)} 开门前到期`:'暂时没有库存'}。</p>${held?`<p>其中 ${held} ${m.unit} 已隔离、暂停使用，周末盘点。</p>`:''}<p>账面成本 ${money(lots.reduce((sum,l)=>sum+l.quantity*m.price,0))} 元。</p></section>`;}).join('')+(s.course?.summer?.partner?`<section class="stock-item"><h3>点心原料 <strong>${pastry} 份</strong></h3><p>共同摊位的原料，每份账面成本 2 元，合计 ${money(pastry*200)} 元。按当日订单小批制作。</p></section>`:'')+`<p>这是原材料和包材，接到订单后才现打柠檬茶。可用材料按配方可做 ${possibleCups(s)} 杯；没有成品茶库存，杯子和吸管不跟原料一起报损。</p>`;}
export function drawPurchase(s){
 page=0;$('purchase-title').textContent=s.course.week===1?'去把开摊的东西买齐':'补一批原料和包材';
 $('purchase-rows').innerHTML=Object.entries(MATERIALS).map(([key,m])=>`<section class="ingredient-row" data-ingredient-row="${key}"><div><strong>${m.name}</strong><small>${m.priceLabel}</small><small>${m.life===null?'包材 · 本局耐储存':s.course?.stockPolicyVersion===3?'冷藏、干燥保存 · 周末盘点':`游戏保质期 ${m.life} 天`}</small></div><div class="ingredient-controls"><button type="button" data-ingredient="${key}" data-step="-${m.step}" aria-label="减少${m.name}">−</button><label><input type="number" id="ingredient-${key}" data-purchase-field="${key}" inputmode="numeric" min="0" step="1" autocomplete="off" value="${esc(s.course.cart[key])}" aria-label="采购${m.name}数量"><span>${m.unit}</span></label><button type="button" data-ingredient="${key}" data-step="${m.step}" aria-label="增加${m.name}">＋</button></div></section>`).join('');
 $('purchase-payment').innerHTML=s.course.week>1&&s.stage==='weekPurchase'?`<span>付款方式</span>${[['cash','现结'],['half','先付一半'],['credit','赊购']].map(([value,label])=>`<button type="button" data-payment="${value}" aria-pressed="${s.course.payment===value}">${label}</button>`).join('')}`:'<span>这批采购，当场付清。</span>';
 paintPurchase(s);turnPurchase(0);
}
export function paintPurchase(s){
 const q=quote(s.course.cart),b=balances(s),ratio=s.stage==='dailyOpen'||s.course.week===1||s.course.payment==='cash'?1:s.course.payment==='half'?.5:0,paid=q?Math.ceil(q.cost*ratio):0,cups=q?forecastCups(s,q.quantities):0;
 $('purchase-cash').textContent=`钱盒 ${money(b.cash)} 元`;
 $('purchase-total').textContent=q?`采购 ${money(q.cost)} 元 · 买后可做 ${cups} 杯`:'请把数量改为 0 或正整数';
 $('purchase-payment-note').textContent=q?(q.cost>paid?`现在付 ${money(paid)} 元，余款 ${money(q.cost-paid)} 元于第 4 周周二支付。`:`现在付 ${money(paid)} 元，没有新增应付账款。`):'';
 let error=!q?'数量需要是 0 或正整数。':paid>b.cash?`钱盒还差 ${money(paid-b.cash)} 元，可以少买一点${s.course.week>1?'或调整付款方式':''}。`:cups<1?'按配方还做不了一杯，看看缺哪种材料。':'';
 $('purchase-notice').textContent=error||'可以按一周备货，已有材料会抵扣；数量也能自己调。';$('confirm-purchase').disabled=!!error;
 for(const [key] of Object.entries(MATERIALS)){const input=$('ingredient-'+key),value=Number(s.course.cart[key]||0);if(input)input.setAttribute('aria-invalid',String(!Number.isSafeInteger(value)||value<0||value>100000));}
 for(const button of $('purchase-payment').querySelectorAll('[data-payment]'))button.setAttribute('aria-pressed',String(button.dataset.payment===s.course.payment));
 return !error;
}
export function turnPurchase(delta=0){
 const host=$('purchase-rows');if(!host?.children.length)return;const active=document.activeElement?.dataset?.purchaseField,rows=[...host.children],height=host.clientHeight||Math.max(90,(window.visualViewport?.height||window.innerHeight||800)-280);
 count=Math.max(1,Math.min(5,Math.floor(height/86)));if(active&&delta===0){const index=rows.findIndex(row=>row.dataset.ingredientRow===active);if(index>=0)page=Math.floor(index/count);}
 page=Math.max(0,Math.min(Math.ceil(rows.length/count)-1,page+delta));rows.forEach((row,i)=>row.hidden=Math.floor(i/count)!==page);
 $('purchase-pages').innerHTML=`<button type="button" data-purchase-turn="-1" ${page===0?'disabled':''}>‹ 上页</button><span>${page+1} / ${Math.ceil(rows.length/count)}</span><button type="button" data-purchase-turn="1" ${page===Math.ceil(rows.length/count)-1?'disabled':''}>下页 ›</button>`;
}
