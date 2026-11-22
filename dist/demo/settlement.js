import {hasSummer} from './summer-rules.js';
const STEPS={
 receivable:{kind:'receivable',engineStep:0,title:'处理应收账款',action:'处理这笔应收账款',debt:false},
 inventory:{kind:'inventory',engineStep:1,title:'清理原材料和包材存货',action:'清售剩余原料和包材',debt:false},
 equipment:{kind:'equipment',engineStep:2,title:'出售摊桌和压汁器',action:'出售摊桌和压汁器',debt:false},
 payable:{kind:'payable',engineStep:3,title:'偿还应付账款',action:'偿还供应商款项',debt:true},
 loan:{kind:'loan',engineStep:4,title:'归还借款本金',action:'归还借款本金',debt:true},
 wages:{kind:'wages',engineStep:6,title:'支付应付职工薪酬',action:'支付已确认的工资',debt:true},
 interest:{kind:'interest',engineStep:5,title:'支付应付利息',action:'支付已计提利息',debt:true}
};
export function settlementSteps(s){
 const first=s.journey==='opening-cash-v2'&&!(s.course?.week>1),keys=first?['inventory','equipment','loan']:s.course?.week>1?['receivable','inventory','equipment','payable','loan','interest']:s.journey==='from-zero-v1'||s.tx.some(t=>t.delta.loan)?['receivable','inventory','equipment','payable','loan']:['receivable','inventory','equipment','payable'];
 if(hasSummer(s)&&s.course.week>=6)keys.splice(3,0,'wages');
 return keys.map(key=>key==='loan'&&!s.course?.loan?{...STEPS.loan,title:'归还父母借款本金',action:'归还父母借款本金'}:STEPS[key]);
}
