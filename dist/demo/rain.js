import {businessDay} from './calendar.js';
import {expire} from './procurement.js';

export const isRainDay=s=>s.course?.rain?.eligible&&s.course.week===3&&[16,17,18].includes(businessDay(s));
export const rainDayNumber=s=>businessDay(s)-15;
export function quarantineRainStock(s){
 const rain=s.course.rain;if(rain.quarantined)return;
 const lots=s.stockLots.filter(l=>l.material==='lemon'&&!l.quarantined),total=lots.reduce((n,l)=>n+l.quantity,0);
 // Half of the remaining lemons, rounded down to 50 g: exactly 1 yuan per 50 g.
 let remaining=Math.floor(total/100)*50;rain.quantity=remaining;rain.beforeQuantity=total;rain.quarantined=true;
 const held=[];for(const lot of lots){const quantity=Math.min(remaining,lot.quantity);if(quantity){lot.quantity-=quantity;remaining-=quantity;held.push({...lot,quantity,quarantined:true});}}
 s.stockLots=s.stockLots.filter(l=>l.quantity>0).concat(held);
}
export function settleRainStock(s){
 const rain=s.course.rain;if(!rain?.eligible||rain.settled||s.course.week!==3)return null;
 if(!rain.closedDays.length&&!rain.quarantined){rain.settled=true;return null;}
 const loss=expire(s,true);rain.settled=true;rain.loss=loss.cost;
 return {...loss,reason:'rain',quantity:rain.quantity||0,beforeQuantity:rain.beforeQuantity||0};
}
