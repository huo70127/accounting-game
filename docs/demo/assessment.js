// Original general-accounting questions. The same fixed set is used before and after play.
export const ASSESSMENT_VERSION=2;
export const ASSESSMENT_SAVE_KEY='lemon-stall:learning-assessment:v2';
export const ASSESSMENT_QUESTIONS=[
 {id:'balance',concept:'资产负债表',title:'以下哪组项目应列在资产负债表上？',options:['现金、存货、借款','营业收入、营业成本、毛利','现金流入、现金流出、净利润'],correct:0,explain:'资产负债表反映某一时点的资产、负债和所有者权益。现金与存货是资产，借款是负债。'},
 {id:'equation',concept:'会计等式',title:'一家企业有 80 元资产、30 元负债，所有者权益是多少？',options:['110 元','50 元','80 元'],correct:1,explain:'资产＝负债＋所有者权益。所有者权益＝80－30＝50 元。'},
 {id:'loan',concept:'借款与收入',title:'企业借入 20 元，尚未发生销售。这笔借款直接带来多少营业收入？',options:['20 元','取决于什么时候还款','0 元'],correct:2,explain:'借款增加现金，也增加负债。借款本金不属于营业收入，不会直接增加利润。'},
 {id:'stock',concept:'存货与成本',title:'用现金买入 18 元商品，商品尚未售出。购入时应怎样记录？',options:['现金减少，费用增加','现金减少，存货增加','现金减少，营业收入增加'],correct:1,explain:'尚未售出的商品先作为存货。销售时，再将已售出商品的成本转为营业成本。'},
 {id:'credit',concept:'收入确认与应收账款',title:'已交付价值 30 元的商品，约定下月收款。交付时应怎样记录？',options:['确认营业收入和应收账款，现金不变','收到钱时才确认营业收入','确认营业收入，同时增加现金'],correct:0,explain:'按权责发生制，符合收入确认条件的商品交付即可确认收入。尚未收到的货款形成应收账款。'},
 {id:'collection',concept:'收回应收账款',title:'本月收到上月已确认收入的货款 30 元，这次会再增加净利润吗？',options:['会，再增加 30 元','会，再增加这批商品的毛利','不会，现金增加、应收账款减少'],correct:2,explain:'收入已经在上月确认。本次收款冲减应收账款，不会再次确认收入或利润。'},
 {id:'profit',concept:'毛利与净利润',title:'本期营业收入 50 元、营业成本 20 元，其他费用共 8 元。净利润是多少？',options:['30 元','22 元','42 元'],correct:1,explain:'毛利＝50－20＝30 元；净利润＝30－8＝22 元。这里假设没有其他损益和所得税。'},
 {id:'device',concept:'固定资产',title:'付现 40 元买入一台可使用多年的生产设备，购入时怎么记？',options:['现金减少，固定资产增加','立即确认 40 元费用','现金与净利润都不变，负债增加'],correct:0,explain:'购入时，现金转为固定资产；设备成本在使用期间按规则分摊，不在购入时一次全部扣减利润。'},
 {id:'depreciation',concept:'折旧与现金流量',title:'本期已售出产品分摊了 2 元生产设备折旧，这笔折旧会产生新的现金支出吗？',options:['会，同时减少现金和利润','不会，设备账面价值和利润也都不变','不会；设备账面价值减少，并影响本期成本和利润'],correct:2,explain:'折旧分摊设备成本，不是再次支付购置款。本题设备已用于当期售出产品，折旧计入其成本并减少利润。'},
 {id:'liquidity',concept:'利润与现金',title:'企业本期有净利润，但货款下月才能收到，借款今天到期。哪种说法正确？',options:['有利润就一定能按期还款','仍可能因现金不足而无法按期还款','应收账款到还款日会自动变成现金'],correct:1,explain:'净利润不等于可用现金。能否按期还款，要看到期时的现金余额和可实际取得的资金。'}
];
const blank=()=>({answers:[],done:false});
export function assessmentFor(s){if(!s.assessment||s.assessment.version!==ASSESSMENT_VERSION)s.assessment={version:ASSESSMENT_VERSION,pre:blank(),post:blank(),entered:false};return s.assessment;}
export function recordAssessment(s,phase,index,choice){if(!['pre','post'].includes(phase))return false;const a=assessmentFor(s);if(phase==='post'&&!a.pre.done)return false;const run=a[phase];if(run.done||index!==run.answers.length||index>=ASSESSMENT_QUESTIONS.length||!Number.isInteger(choice)||choice<0||choice>3)return false;run.answers.push(choice);run.done=run.answers.length===ASSESSMENT_QUESTIONS.length;return true;}
export const assessmentScore=run=>run?.done?ASSESSMENT_QUESTIONS.reduce((n,q,i)=>n+(run.answers[i]===q.correct?1:0),0):null;
export function validAssessment(a){return a?.version===ASSESSMENT_VERSION&&['pre','post'].every(phase=>{const run=a[phase];return run&&Array.isArray(run.answers)&&run.answers.length<=10&&run.answers.every(n=>Number.isInteger(n)&&n>=0&&n<=3)&&run.done===(run.answers.length===10);})&&(!a.post.answers.length||a.pre.done);}
export function loadAssessment(storage){try{const a=JSON.parse(storage.getItem(ASSESSMENT_SAVE_KEY));if(validAssessment(a))return {assessment:a};}catch{}return {assessment:assessmentFor({})};}
