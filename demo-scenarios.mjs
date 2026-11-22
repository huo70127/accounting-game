import {eventRandom,repayment,backupDemand} from './dist/demo/random.js';
export function seedFor(predicate){for(let seed=0;seed<100000;seed++)if(predicate(seed))return seed;throw Error('Missing test scenario');}
const accepted=(seed,rate)=>eventRandom(seed,'main-customer:accept')<rate;
export const scenarios={
 cash:{choice:6000,seed:seedFor(s=>accepted(s,.45))},
 half:{choice:3000,seed:seedFor(s=>accepted(s,.75)&&repayment(s)==='ontime')},
 credit:{choice:0,seed:seedFor(s=>accepted(s,.95)&&repayment(s)==='ontime'&&eventRandom(s,'main-customer:advance')<.5)},
 failure:{choice:0,seed:seedFor(s=>accepted(s,.95)&&repayment(s)==='default')},
 late:{choice:3000,seed:seedFor(s=>accepted(s,.75)&&repayment(s)==='late')},
 default:{choice:3000,seed:seedFor(s=>accepted(s,.75)&&repayment(s)==='default')},
 none:{choice:6000,seed:seedFor(s=>!accepted(s,.45)&&backupDemand(s)===0)},
 backup4:{choice:6000,seed:seedFor(s=>!accepted(s,.45)&&backupDemand(s)===4)},
 backup8:{choice:6000,seed:seedFor(s=>!accepted(s,.45)&&backupDemand(s)===8)},
 early:{choice:3000,seed:1}
};
