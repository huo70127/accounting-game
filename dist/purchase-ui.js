import {MATERIALS,RECIPE_COST,ensureStock,suggestedCart,quantities,quote,stockValue,possibleCups} from './materials.js';
import {formatMoney,yuan,cents} from './currency.js';
export function purchasePanel(s,target){ensureStock(s);const cart=suggestedCart(s,target);return `<div class="recipe-card"><strong>每杯手打柠檬茶 · 教学配方</strong><p>柠檬 50 克 + 干白茶叶 3 克 + 白砂糖 15 克<br>杯子 1 个 + 吸管 1 根 · 成本 ${formatMoney(yuan(RECIPE_COST))}</p><small>约 500 mL；水、冰暂不单独计价。以下是演示单价，并非市场报价。</small></div><div class="purchase-list">${Object.entries(MATERIALS).map(([key,m])=>`<div class="purchase-row"><div><strong>${m.name}</strong><small>${m.priceLabel}</small><small>${m.life===null?'包材 · 本章耐储存':'原料 · 教学保质期 '+m.life+' 天'}</small></div><div class="purchase-controls"><button type="button" data-material="${key}" data-change="-${m.step}" aria-label="减少${m.name}">−</button><label><input id="material-${key}" type="number" min="0" step="1" inputmode="numeric" value="${cart[key]}" aria-label="采购${m.name}数量"><span>${m.unit}</span></label><button type="button" data-material="${key}" data-change="${m.step}" aria-label="增加${m.name}">＋</button></div></div>`).join('')}</div><div class="purchase-summary"><strong id="purchase-total"></strong><span id="purchase-capacity"></span><small id="purchase-warning" role="status"></small></div>`;}
export function readCart(){const values=Object.entries(MATERIALS).map(([k])=>[k,document.getElementById('material-'+k)?.value]);if(values.some(([,v])=>v===undefined))return undefined;return Object.fromEntries(values.map(([k,v])=>[k,v===''?0:Number(v)]));}
export function paintPurchase(s,focusError=false){
 const cart=readCart(),el=document.getElementById('purchase-total');if(!cart||!el)return;
 const warning=document.getElementById('purchase-warning'),summary=el.closest('.purchase-summary'),capacity=document.getElementById('purchase-capacity');
 let firstInvalid;
 for(const [key,value] of Object.entries(cart)){const input=document.getElementById('material-'+key),invalid=!Number.isSafeInteger(value)||value<0;input?.setAttribute('aria-invalid',String(invalid));if(invalid&&!firstInvalid)firstInvalid=input;}
 const q=quote(cart);let error='';
 if(!q){el.textContent='采购数量需要调整';capacity.textContent='';error='请填写 0 或正整数，数量不能为负数或小数。';}
 else{
  el.textContent='本次采购 '+formatMoney(q.cost);
  const have=quantities(s),probe={stockLots:Object.entries(cart).map(([material,n])=>({material,quantity:n+have[material]})),readyCups:s.readyCups||0},cups=possibleCups(probe);
  capacity.textContent=`买后可做 ${cups} 杯 · 现制茶另须当天售完`;
  const cash=s.tx.reduce((n,t)=>n+cents(t.delta.cash||0),0);
  error=q.costFen>cash?'钱盒还差 '+formatMoney(yuan(q.costFen-cash))+'，请减少采购数量。':s.phase==='supplies'&&cups<4?'开摊先做 4 杯，请按配方补齐缺少的材料。':'';
 }
 warning.textContent=error||'按最少的那种材料决定能做几杯；多买的原料和包材会留下。';summary?.classList.toggle('has-error',!!error);
 if(focusError&&error){const target=firstInvalid||warning;target.setAttribute('tabindex','-1');target.focus({preventScroll:true});target.scrollIntoView({block:'center',behavior:'instant'});}
 return !error;
}
export function stockPanel(s){ensureStock(s);const q=quantities(s);return `<details class="stock-panel"><summary>我的库存 · ${formatMoney(yuan(stockValue(s)))} <small>原料、包材、现制茶分开看</small></summary><div class="stock-grid">${Object.entries(MATERIALS).map(([k,m])=>{const lots=s.stockLots.filter(l=>l.material===k),next=lots.length&&m.life!==null?Math.min(...lots.map(l=>l.expires)):null;return `<div><strong>${m.name}</strong><span>${q[k]} ${m.unit}</span><small>${m.category} · ${next?'第 '+next+' 天开门前到期':m.life===null?'本章耐储存':'暂无库存'}</small></div>`;}).join('')}<div><strong>已制作柠檬茶</strong><span>${s.readyCups||0} 杯</span><small>当天未售完即报损</small></div></div><p>柠檬、茶叶和糖属于原料；杯子、吸管属于包材，仍是存货。耐储存不等于固定资产。</p></details>`;}
export function stockForDay(s,day){if(day===s.day)return s;const h=s.stockHistory?.[day];return h?{...s,day,stockLots:h.stockLots,readyCups:h.readyCups}:null;}
