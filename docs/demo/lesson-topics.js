import {TERMS} from './learning.js';
const TOPICS={firstcash:['cash','capital'],loanquiz:['loan','liabilities'],fundingquiz:['ownership','debt'],inventory:['inventory'],payable:['payable'],revenue:['revenue'],cost:['cost'],margin:['gross'],cashflow:['payable'],collection:['receivable'],equipment:['equipment'],delaycheck:['receivable','badDebt'],baddebt:['badDebt'],'course-payable':['payable'],'course-receivable':['receivable'],'course-bulk':['gross'],'course-finance':['loan','interest'],'course-depreciation':['depreciation'],'course-payment':['payable'],'course-interest':['interestPayable'],'course-liquidity':['liquidity'],'course-collection':['receivable']};
export function primaryTerms(key,data){if(key==='course-collection'&&data.lesson?.terms.includes('badDebt'))return ['receivable','badDebt'];return (key.startsWith('course-spoil-')?['spoilage']:TOPICS[key]||data.lesson?.terms||[]).filter(k=>TERMS[k]);}
export function lessonStatus(s,q,getQuestion,stage=s.stage){
 if(s.lessonTopics?.[stage])return s.lessonTopics[stage];
 const known=new Set();for(const previous of Object.keys(s.lessonsSeen||{})){if(previous===stage)continue;const old=getQuestion({...s,stage:previous});for(const key of old?.termKeys||[])known.add(key);}
 const keys=q.termKeys||[];return {keys,newKeys:keys.filter(key=>!known.has(key))};
}
export const topicNames=keys=>keys.map(key=>TERMS[key].name).join('、');
