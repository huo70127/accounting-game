import {MATERIALS,receive,afterPurchaseCups,suggestedCart} from './procurement.js';
import {businessDay} from './calendar.js';
import {workingDaysLeft} from './summer-rules.js';

// Ordinary storage is simplified to weekly cold-storage checks in this chapter.
// Previously posted loss entries stay in the journal; future purchases lose nothing.
export function enableWeeklyStock(s){
 const c=s.course;if(!c)return;
 for(const lot of s.stockLots||[])lot.expires=null;c.stockPolicyVersion=3;
 c.rain??={eligible:c.week<3||c.week===3&&businessDay(s)<=18,closedDays:[],quarantined:false,settled:false,quantity:0};
}
export const stockRisk=()=>({rate:0,weather:false,overstock:false});
export const storagePolicy=()=>false;
export const suggestedStock=(s,target=12)=>suggestedCart(s,target);
export const forecastCups=(s,cart)=>afterPurchaseCups(s,cart);
export function receiveStock(s,cart){receive(s,cart);return {rate:0,weather:false,overstock:false,cost:0,items:[]};}
export const rawCost=cart=>Object.entries(cart||{}).reduce((n,[key,quantity])=>n+(MATERIALS[key]?.life!==null?quantity*(MATERIALS[key]?.price||0):0),0);
export const weekStockTarget=s=>(s.course.upgrade?24:12)*workingDaysLeft(s);
