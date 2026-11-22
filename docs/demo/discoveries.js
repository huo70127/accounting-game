import {report,reportAvailable,isOpeningChapter,money} from './accounting.js';
export const DISCOVERIES={
 balanceSheet:{page:0,label:'新账页',title:'资产负债表',description:'它像小摊在这一刻的合影：有什么、欠什么，以及剩下多少归出资人。',color:'blue'},
 equation:{page:0,label:'一条很重要的关系',title:'资产 ＝ 负债 ＋ 所有者权益',description:'同一摊东西，从两边看。左边是我们拥有什么，右边是这些东西来自借款，还是属于出资人。',color:'yellow'},
 cashflow:{page:2,label:'又多了一张账页',title:'现金流量表',description:'钱盒什么时候响了、钱又花到哪里去？它只跟着实际收付的现金走。',color:'blue'},
 income:{page:1,label:'第一杯茶卖出去了',title:'利润表',description:'这段时间卖茶取得多少营业收入、用了多少营业成本，最后赚了还是亏了，这张表慢慢算给你看。',color:'coral'},
};
export function nextDiscovery(s){if(!isOpeningChapter(s))return null;return Object.keys(DISCOVERIES).find(key=>reportAvailable(s,DISCOVERIES[key].page)&&!s.discoverySeen?.[key])||null;}
export function discoveryNumbers(s,key){const r=report(s);if(key==='equation')return [{label:'资产',amount:money(r.assets)},{label:'负债',amount:money(r.liabilities)},{label:'所有者权益',amount:money(r.equity)}];return [];}
