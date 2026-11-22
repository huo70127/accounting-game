export const CHAPTER={id:'first-stall',title:'第一章 · 街坊的第一杯',setting:'广州 · 街坊巷口',character:'阿柠'};
// Products are data so later chapters can add tea varieties without changing the ledger.
export const PRODUCTS={lemonTea:{id:'lemonTea',name:'手打柠檬茶',ingredients:'柠檬、茶底、糖浆和杯子',cost:2,price:5,groupPrice:7}};
export const DAYS=[{title:'从零开始，摆个柠檬茶摊',weather:'广州 · 晴热',note:'先借到第一笔钱，再卖出第一杯茶。'},{title:'让小摊长大一点',weather:'广州 · 街坊渐多',note:'赚到的钱，和收到的钱，是两回事。'},{title:'今天，要兑现承诺',weather:'广州 · 新的一天',note:'一杯一杯，把自己的小生意做起来。'}];
export const RULES={cost:PRODUCTS.lemonTea.cost,price:PRODUCTS.lemonTea.price,groupPrice:PRODUCTS.lemonTea.groupPrice,machine:24,loan:12,interest:2,depreciation:4,familyLoan:10,openingCups:4};
// Only the authoring config exposes exact odds; the player sees street cues and risks.
export const EVENING_EVENT={id:'day1-evening',outcomes:[{cups:0,weight:35},{cups:1,weight:25},{cups:2,weight:25},{cups:3,weight:15}]};
export const PACE={first:2200,noon:3000,evening:3900,packing:2700,opening:1900,busy:1300,quiet:3100,cloudExtra:500};
