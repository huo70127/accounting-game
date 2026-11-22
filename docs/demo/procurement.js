import {calendarLabel} from './calendar.js';
// The recipe / lot model uses syrup in the four-week game. Historical life values
// remain readable; stock policy 3 uses weekly storage checks and rain quarantine.
export const MATERIALS={
 lemon:{name:'柠檬',unit:'克',recipe:50,price:2,step:50,life:2,priceLabel:'10 元 / 500 克'},
 tea:{name:'茶叶',unit:'克',recipe:3,price:20,step:3,life:30,priceLabel:'10 元 / 50 克'},
 sugar:{name:'糖浆',unit:'毫升',recipe:15,price:1,step:15,life:7,priceLabel:'5 元 / 500 毫升'},
 cup:{name:'塑料杯',unit:'个',recipe:1,price:20,step:1,life:null,priceLabel:'0.20 元 / 个'},
 straw:{name:'吸管',unit:'根',recipe:1,price:5,step:1,life:null,priceLabel:'0.05 元 / 根'}
};
export const RECIPE_COST=Object.values(MATERIALS).reduce((sum,m)=>sum+m.recipe*m.price,0);
export const dateLabel=(day,s)=>s?calendarLabel(s,day):`第 ${Math.floor((day-1)/7)+1} 周${['周一','周二','周三','周四','周五','周六','周日'][(day-1)%7]}`;
export const quantities=s=>Object.fromEntries(Object.keys(MATERIALS).map(key=>[key,(s.stockLots||[]).filter(l=>l.material===key&&!l.quarantined).reduce((sum,l)=>sum+l.quantity,0)]));
export const stockValue=s=>(s.stockLots||[]).reduce((sum,l)=>sum+l.quantity*MATERIALS[l.material].price,0)+(s.course?.summer?.pastryStock||0)*200;
export function possibleCups(s){const q=quantities(s);return Math.min(...Object.entries(MATERIALS).map(([key,m])=>Math.floor(q[key]/m.recipe)));}
export function suggestedCart(s,target=12){const have=quantities(s);return Object.fromEntries(Object.entries(MATERIALS).map(([key,m])=>[key,Math.max(0,target*m.recipe-have[key])]));}
export function quote(cart){if(!cart||Object.keys(cart).some(key=>!MATERIALS[key]))return null;let cost=0;const quantities={};for(const [key,m] of Object.entries(MATERIALS)){const raw=cart[key]??0,n=raw===''?0:Number(raw);if(!Number.isSafeInteger(n)||n<0||n>100000)return null;quantities[key]=n;cost+=n*m.price;}return {cost,quantities};}
export function afterPurchaseCups(s,cart){const q=quote(cart);if(!q)return 0;return possibleCups({stockLots:[...(s.stockLots||[]),...Object.entries(q.quantities).map(([material,quantity])=>({material,quantity}))]});}
export function receive(s,cart){const q=quote(cart);if(!q)throw Error('采购数量无效');s.stockLots??=[];for(const [material,quantity] of Object.entries(q.quantities)){const m=MATERIALS[material];if(quantity)s.stockLots.push({material,quantity,received:s.day,expires:m.life===null||s.course?.stockPolicyVersion===3?null:s.day+m.life});}}
export function consume(s,count){if(!Number.isInteger(count)||count<0||possibleCups(s)<count)return false;for(const [key,m] of Object.entries(MATERIALS)){let left=m.recipe*count;for(const lot of s.stockLots.filter(l=>l.material===key&&!l.quarantined).sort((a,b)=>(a.expires??Infinity)-(b.expires??Infinity)||a.received-b.received)){const taken=Math.min(left,lot.quantity);lot.quantity-=taken;left-=taken;}}s.stockLots=s.stockLots.filter(l=>l.quantity>0);return true;}
export function expire(s,includeQuarantined=false){const bad=(s.stockLots||[]).filter(l=>includeQuarantined&&l.quarantined||l.expires!==null&&l.expires<=s.day),cost=bad.reduce((sum,l)=>sum+l.quantity*MATERIALS[l.material].price,0);s.stockLots=(s.stockLots||[]).filter(l=>!bad.includes(l));return {cost,reason:bad.some(l=>l.quarantined)?'rain':'expiry',items:bad.map(l=>({name:MATERIALS[l.material].name,quantity:l.quantity,unit:MATERIALS[l.material].unit}))};}
export function validateStock(s){if(!s.course)return;const ledger=s.tx.reduce((sum,t)=>sum+(t.delta.inventory||0),0);if(!Array.isArray(s.stockLots)||s.stockLots.length>200||s.stockLots.some(l=>!MATERIALS[l.material]||!Number.isSafeInteger(l.quantity)||l.quantity<0||!Number.isInteger(l.received)||l.received>s.day||l.received<1||l.expires!==null&&(!Number.isInteger(l.expires)||l.expires<=l.received))||ledger!==stockValue(s))throw Error('原料明细与存货账目不一致');}
