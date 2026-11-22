// Six possible customer groups per day. Each group waits up to eight minutes.
// Faster equipment serves more people in that window; it cannot create demand or stock.
export const serviceMinutes=s=>s.course?.upgrade?2:4;
export const GROUP_WAIT=8;
export const GROUPS_PER_DAY=6;
export const serviceCapacity=s=>GROUPS_PER_DAY*Math.floor(GROUP_WAIT/serviceMinutes(s));
export function planService(s,demand,available,from,to){
 const groups=Math.min(GROUPS_PER_DAY,Math.ceil(demand/4)),events=[];let stock=available,lostToWait=0,lostToStock=0;
 for(let i=0;i<groups;i++){
  const requested=Math.floor(demand/groups)+(i<demand%groups?1:0),stocked=Math.min(requested,stock),quantity=Math.min(stocked,Math.floor(GROUP_WAIT/serviceMinutes(s))),arrival=Math.round(from+(to-from-10)*(i+1)/(groups+1));
  lostToWait+=stocked-quantity;lostToStock+=requested-stocked;stock-=quantity;
  if(quantity)events.push({minute:arrival+quantity*serviceMinutes(s),quantity,requested});
 }
 return {events,lostToWait,lostToStock,demand,stock};
}
