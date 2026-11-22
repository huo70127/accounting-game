// Preparation retains its historical journal dates; new games start trading on day 3.
export const calendarOffset=s=>s?.course?.calendarVersion===2?2:0;
export const courseDay=(s,day)=>day+calendarOffset(s);
export const businessDay=(s,day=s.day)=>day-calendarOffset(s);
export const weekEnd=s=>s.course.week*7+calendarOffset(s);
export const courseEnd=s=>(s.course?.totalWeeks||4)*7+calendarOffset(s);
export const isRestDay=(s,day=s.day)=>{
 const n=businessDay(s,day);if(n<=0)return false;
 const weekday=((n-1)%7+7)%7;
 if((s.course?.totalWeeks||4)===8&&n>=36){const schedule=s.course.summer?.schedule||'six';return schedule==='hire'?false:weekday>=(schedule==='five'?5:6);}
 return weekday===6;
};
export const weekday=(s,day=s.day)=>['周一','周二','周三','周四','周五','周六','周日'][((businessDay(s,day)-1)%7+7)%7];
export const calendarLabel=(s,day=s.day)=>calendarOffset(s)&&day<3?'开张前':`第 ${Math.floor((businessDay(s,day)-1)/7)+1} 周${weekday(s,day)}`;
