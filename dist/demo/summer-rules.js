import {businessDay} from './calendar.js';
export const PARTNER_CASH=12000;
export const PLAYER_SHARE=75;
export const WAGE_PER_SHIFT=1200;
export const NIGHT_FEE=2400;
export const PASTRY_COST=200;
export const PASTRY_PRICE=300;
export const seasonWeeks=s=>s.course?.totalWeeks||4;
export const hasSummer=s=>seasonWeeks(s)===8;
export const partnered=s=>!!s.course?.summer?.partner;
export const nightToday=s=>!!s.course?.summer?.night?.joined&&businessDay(s)===48;
export function staffing(s,day=s.day){
 const n=businessDay(s,day),week=Math.floor((n-1)/7)+1,weekday=((n-1)%7+7)%7;
 if(!hasSummer(s)||week<6)return {open:weekday<6,helper:false,player:weekday<6};
 const schedule=s.course.summer?.schedule||'six';
 return {open:schedule==='hire'||weekday<(schedule==='five'?5:6),helper:schedule==='hire'&&weekday>=5,player:weekday<(schedule==='six'?6:5)};
}
export function resaleQuote(s,kind){
 const value=s.tx.reduce((n,t)=>n+(t.delta[kind]||0),0);
 if(!hasSummer(s))return Math.floor(value*.75);
 return Math.min(value,Math.floor(value*.75/100)*100);
}
export const workingDaysLeft=s=>{
 const day=businessDay(s),end=Math.ceil(day/7)*7;
 let count=0;for(let n=day;n<=end;n++)if(staffing(s,n+(s.course?.calendarVersion===2?2:0)).open)count++;
 return count;
};
