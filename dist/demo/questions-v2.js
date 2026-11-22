import {money,supplierBill,isOpeningChapter} from './accounting.js';
import {eventRandom} from './random.js';
import {primaryTerms,topicNames} from './lesson-topics.js';

export const LESSON_VERSION=2;
export const MAIN_QUESTIONS=['firstcash','loanquiz','fundingquiz','inventory','payable','revenue','cost','margin','cashflow','collection','equipment'];
export const CHALLENGE_IDS=['marginRate','expectedLoss'];

export function build(s,key,data){
 if(!data)return null;
 const count=data.choices.length;if(count<2||count>6)throw Error('选择题需要 2–6 个选项');
 const rotate=Math.floor(eventRandom(s.seed,'question:v2:'+key)*count);
 const options=data.choices.map((_,i)=>data.choices[(i+rotate)%count]);
 const termKeys=primaryTerms(key,data);return {...data,termKeys,concept:topicNames(termKeys)||data.concept,id:'v2:'+key+(data.revision?':'+data.revision:''),options:options.map(o=>o[0]),misconceptions:options.map(o=>o[1]),correct:(count-rotate)%count};
}
const choice=(text,why='')=>[text,why];
const lesson=(terms,extra='')=>({terms,extra});

export function question(s){
 const sale=s.tx.find(t=>t.kind==='sale'),qty=sale?.quantity||0,revenue=sale?.revenue||0,cost=sale?.cost||0,cash=sale?.delta.cash||0;
 const bill=money(supplierBill(s)),loan=isOpeningChapter(s)?32:20;
 const paid=s.tx.find(t=>['collect','late-collect'].includes(t.id))?.delta.cash||0;
 let data={
  firstcash:{concept:'第一笔出资',title:'这 12 元，该怎样记？',lead:'你把自己的 12 元零花钱放进小摊的钱盒，作为开摊的初始投资。',lesson:lesson(['cash','capital']),choices:[choice('现金增加，所有者投入资本增加'),choice('现金增加，营业收入增加','还没有卖出任何茶。这是你的出资，不是营业收入。'),choice('现金增加，借款本金增加','这笔钱是你投入的资金，不是向别人借、约定要归还的款项。')],explain:'小摊有了第一项资产：现金 12 元；同时有了所有者投入资本 12 元。资产＝负债＋所有者权益，这时就是 12＝0＋12。'},
  loanquiz:{concept:'第一笔借款',title:`父母借来的 ${loan} 元，属于什么？`,lead:`父母按预算借给小摊 ${loan} 元，约定结束经营时归还本金，不收利息。`,lesson:lesson(['loan','liabilities']),choices:[choice('借款本金，是一项负债'),choice('营业收入，是卖茶赚的钱','借来的钱增加现金，也增加还款义务；没有因此发生营业收入。'),choice('所有者投入资本，是父母入股','父母约定的是借款，不是入股。借钱与出资入股的权利和义务不同。')],explain:`现金增加 ${loan} 元，借款本金也增加 ${loan} 元。借款属于负债；要按约定偿还，不能当成营业收入。`},
  fundingquiz:{concept:'股权与债权',title:'谁有权参与剩余的钱的分配？',lead:'你出资 12 元，朋友出资 4 元，一起承担经营盈亏。父母另外借给摊位 20 元，收摊时需要先还借款。',lesson:lesson(['ownership','debt']),choices:[choice('还清债务后，你与朋友按持股比例分配'),choice('三个人按拿来的钱一起分股权','借款不计入投入资本。父母的债权与出资人的股权不能合在一起算持股比例。'),choice('朋友拿回固定的 4 元，不承担盈亏','这里约定的是入股，朋友参与剩余权益，也会承担经营亏损；不是固定要归还的借款。')],explain:'投入资本合计 16 元，你占 12÷16＝75%，朋友占 25%。父母持有的是债权；清算时先处理债务，剩余可分配资金再按持股比例分配。'},
  inventory:{concept:'认识存货',title:'货架上的茶料，是什么？',lead:'货架上有可做 12 杯茶的原料，采购成本共 24 元。还没有卖出去时，这 24 元属于哪一项？',lesson:lesson(['inventory']),choices:[choice('存货'),choice('营业成本','原料还没有售出，不能直接把全部备货成本计入营业成本。'),choice('应收账款','应收账款是顾客尚未付清的货款；货架上的茶料是存货。')],explain:'这 24 元是存货。卖出对应的茶，才把对应原料成本转入营业成本；剩下仍可使用的茶料继续作为存货。'},
  payable:{concept:'认识应付账款',title:'这张供应商账单，记在哪里？',lead:`摊位已经收到了供应商送来的货物，还有 ${bill} 元没有付清。这笔款项属于哪一项？`,lesson:lesson(['payable']),choices:[choice('应付账款'),choice('应收账款','这次是摊位欠供应商的钱。应收账款表示顾客欠摊位的钱，方向不同。'),choice('营业收入','欠供应商的款项是一项负债，不是卖茶取得的营业收入。')],explain:`摊位欠供应商的 ${bill} 元属于应付账款。已经拿到货、尚未付款，会形成这项负债。`},
  revenue:{concept:'营业收入',title:qty?'这笔交货确认多少营业收入？':'没有成交，营业收入是多少？',lead:qty?`本局已经交付 ${qty} 杯，每杯售价 5 元，当场收到 ${money(cash)} 元现金。请计算这笔营业收入。`:'本局没有成交，12 杯份茶料仍在货架上，原料采购成本共 24 元。',lesson:lesson(['revenue'],qty?'用实际交付的杯数计算，收款安排另看现金和应收账款。':'没有成交交货，不能把预计能卖的钱确认为营业收入。'),choices:qty?[choice(`${money(revenue)} 元`),choice(`${money(revenue-cost)} 元`,'你减去了营业成本，得到的是毛利。营业收入先按已交付货物的售价计算。'),choice(`${money(revenue/2)} 元`,'不能只确认这笔售价的一半。已交付货物对应的全部价款都计入营业收入。')]:[choice('0 元'),choice('24 元','24 元是原料存货的采购成本，不是营业收入。'),choice('60 元','60 元只是原计划的订单金额。没有成交交货，不能提前确认营业收入。')],explain:qty?`营业收入＝${qty}×5＝${money(revenue)} 元。${isOpeningChapter(s)?'这笔钱已经全部当场收到。':`其中收到现金 ${money(cash)} 元，尚未收到的 ${money(revenue-cash)} 元形成应收账款。`}`:'没有成交，营业收入为 0 元。仍能用于制作和销售的原料属于存货。'},
  cost:{concept:'营业成本的算法',title:'对应这次售出的营业成本是多少？',lead:qty?`本局卖出 ${qty} 杯茶，每杯消耗的原料成本是 2 元。`:'本局没有卖出茶，12 杯份原料的采购成本共 24 元，暂时还可以使用。',lesson:lesson(['cost']),choices:qty?[choice(`${money(cost)} 元`),choice(`${money(revenue)} 元`,'这个数是已交付茶的营业收入。营业成本要用每杯原料成本计算。'),choice(`${money(revenue-cost)} 元`,'这个数是营业收入扣除营业成本后的毛利，不是营业成本本身。')]:[choice('0 元'),choice('24 元','原料还没卖出，仍是存货，不能把全部采购成本当作已售出的营业成本。'),choice('60 元','这是原计划的销售价款，与没有成交时的营业成本无关。')],explain:qty?`营业成本＝${qty}×2＝${money(cost)} 元。未售出部分仍在存货中，不一起计入这笔营业成本。`:'没有售出，营业成本为 0 元，24 元仍作为存货；以后过期报损时另列损失。'},
  margin:{concept:'毛利的算法',title:'用刚才的营业收入和营业成本，算毛利。',lead:`本局这笔营业收入为 ${money(revenue)} 元，营业成本为 ${money(cost)} 元。`,lesson:lesson(['gross']),choices:qty?[choice(`${money(revenue-cost)} 元`),choice(`${money(revenue)} 元`,'你只用了营业收入，尚未减去对应的营业成本。'),choice(`${money(cost)} 元`,'你选的是营业成本。毛利要用营业收入减去营业成本。')]:[choice('0 元'),choice('亏损 24 元','尚未售出的原料仍是存货，不是现在已经发生的销售亏损。'),choice('36 元','这是原计划全部卖出时的毛利，不能当作本局已经发生的毛利。')],explain:`毛利＝营业收入－营业成本＝${money(revenue)}－${money(cost)}＝${money(revenue-cost)} 元。之后还要考虑坏账、报损等损失，才能得到本关净利润。`},
  cashflow:{concept:'应付账款',title:'付清供应商欠款，怎样记录？',lead:`本局已经用现金付清了原来记在账上的 ${bill} 元供应商欠款。请选择今天的账目变化。`,lesson:lesson(['payable','cash']),choices:[choice(`现金减少 ${bill} 元，应付账款减少 ${bill} 元`),choice(`现金减少 ${bill} 元，营业成本增加 ${bill} 元`,'这次是偿还已有欠款，不能因为付款而再记一次营业成本。'),choice(`现金减少 ${bill} 元，营业收入减少 ${bill} 元`,'偿还供应商欠款与卖茶确认的营业收入是不同的账目变化。')],explain:`付款让现金和应付账款各减少 ${bill} 元。货物的成本按是否已经售出来处理，不能在支付欠款时重复记录。`},
  collection:{concept:'收回应收账款',title:'这次回款带来哪些变化？',lead:`本局顾客已把剩余 ${money(paid)} 元货款付清。茶在此前已经交付。`,lesson:lesson(['receivable','cash']),choices:[choice('现金增加，应收账款减少'),choice('现金增加，营业收入再增加','茶已经交付时就确认了营业收入，现在不能把同一笔销售再记一次。'),choice('现金增加，应付账款增加','顾客还钱是收回应收账款，不是摊位又欠了供应商一笔钱。')],explain:`现金增加 ${money(paid)} 元，应收账款减少 ${money(paid)} 元。收回货款不会重复增加营业收入。`},
  equipment:{concept:'固定资产与处置损失',title:'如果现在收摊，卖掉设备对利润有何影响？',lead:'本局摊桌和压汁器的账面价值是 16 元，清算规则给出的回收金额是 12 元。只看这次设备处置。',lesson:lesson(['equipment']),choices:[choice('利润减少 4 元'),choice('利润增加 12 元','12 元是收到的现金。还要同时移出账面价值 16 元的设备，不能把收款全当作利润。'),choice('利润不变','回收金额低于设备账面价值，会产生设备处置损失。')],explain:'设备处置损失＝16－12＝4 元，利润因此减少 4 元。现金增加 12 元，同时设备资产减少 16 元；这不是卖茶的营业收入。'},
  delaycheck:{concept:'延期与坏账',title:'延期期间，这笔款项属于什么？',lead:'本局顾客说晚一周支付。目前尚未收到这笔货款，也没有确认无法偿还。',lesson:lesson(['receivable','badDebt']),choices:[choice('继续保留为应收账款'),choice('直接转为现金','承诺以后付钱不等于现金已经到账。'),choice('直接全部确认为坏账损失','本关把确认无法偿还的款项列为坏账损失；仅仅延期不直接作同样处理。')],explain:'延期期间应收账款继续保留；现金尚未增加，营业收入不再重复确认，也不直接因为延期就确认坏账损失。'},
  baddebt:{concept:'坏账损失',title:'确认收不回的货款，怎样记录？',lead:'本局顾客已经确认无法偿还剩余货款。这部分钱从未进入钱盒。',lesson:lesson(['badDebt','receivable']),choices:[choice('应收账款减少，坏账损失增加'),choice('应收账款减少，现金再减少','这部分钱从未进入钱盒，不能再从现金中扣一次。'),choice('应收账款不变，不记录损失','已经确认无法偿还，不能继续把它当作可以收回的应收账款。')],explain:'减少无法收回的应收账款，并确认坏账损失。已经收到的现金不再扣减，营业收入也不会重复确认。'},
 }[s.stage];
 if(isOpeningChapter(s)&&data){
  if(s.stage==='inventory')data={...data,choices:[choice('存货'),choice('现金','原料已经拿到货架上，钱已经付给店家，原料本身不是现金。'),choice('借款本金','借款本金是要归还父母的钱，货架上的茶料属于存货。')]};
  if(s.stage==='loanquiz')data={...data,choices:[choice('借款本金，是一项负债'),choice('营业收入，是卖茶赚的钱','还没有卖茶。这是按约定要归还的借款，不是营业收入。'),choice('你自己的投入资本','借来的钱要归还，不能和你自己的出资混为一谈。')]};
  if(s.stage==='revenue'&&qty)data={...data,lesson:lesson(['revenue'],'今天的客人都是当场付清。先算这笔卖茶取得的价款。'),choices:[choice(`${money(revenue)} 元`),choice(`${qty} 元`,'这是卖出的杯数。金额还要用杯数乘以每杯售价。'),choice('5 元','5 元是每杯售价，这次交付了不止一杯。')]};
  if(s.stage==='cost'&&qty)data={...data,choices:[choice(`${money(cost)} 元`),choice(`${money(revenue)} 元`,'这个数是营业收入，计算营业成本要用每杯原料成本。'),choice('2 元','2 元是每杯原料成本，还需要乘以这次实际卖出的杯数。')]};
  if(s.stage==='margin')data={...data,explain:`毛利＝营业收入－营业成本＝${money(revenue)}－${money(cost)}＝${money(revenue-cost)} 元。还要考虑后续费用或损失，才能得到本关净利润。`};
 }
 if(s.course&&s.stage==='inventory'){const purchase=s.tx.find(t=>t.id==='first-stock');const amount=money(purchase?.delta.inventory||0);data={...data,lead:`刚按配方采购的原料和包材共 ${amount} 元，还没有售出；它们在账上属于什么？`,explain:`这 ${amount} 元是存货。塑料杯、吸管也属于存货。只有实际售出消耗的部分才转为营业成本；剩余可用材料继续保留，过期的对应批次另行报损。`};}
 if(s.course&&data){data={...data,lead:data.lead.replaceAll('原料成本','原料和包材成本'),explain:data.explain.replaceAll('原料成本','原料和包材成本')};}
 if(s.course&&qty===1&&s.stage==='revenue')data={...data,choices:[choice('5 元'),choice('1 元','这是杯数，还需要乘以每杯售价。'),choice('2 元','这是对应的原料和包材成本，不是营业收入。')]};
 if(s.course&&qty===1&&s.stage==='cost')data={...data,choices:[choice('2 元'),choice('5 元','这是营业收入，不是营业成本。'),choice('3 元','这是毛利，需要把收入和成本分开。')]};
 if(s.stage==='loanquiz'&&s.answers?.loanquiz?.id!=='v2:loanquiz')data={...data,revision:'r2',choices:[choice('负债'),choice('营业收入','借来的钱增加现金，也增加了还款义务。卖茶交货取得的价款才是这里的营业收入。')]};
 return build(s,s.stage,data);
}

export function challenge(s,id){
 if(isOpeningChapter(s)&&id==='expectedLoss')return null;
 const sale=s.tx.find(t=>t.kind==='sale'),revenue=sale?.revenue||0,cost=sale?.cost||0;
 if(id==='marginRate'&&!revenue)return null;
 const data={
  marginRate:{concept:'毛利率',title:'本局这笔销售的毛利率是多少？',lead:`仍看本局：营业收入 ${money(revenue)} 元，营业成本 ${money(cost)} 元，毛利 ${money(revenue-cost)} 元。`,lesson:lesson(['marginRate']),choices:[choice('60%'),choice('40%','40% 是营业成本占营业收入的比例，不是毛利率。'),choice('150%','你用毛利除以营业成本，得到的是加价率口径；毛利率的分母是营业收入。')],explain:`毛利率＝${money(revenue-cost)}÷${money(revenue)}×100%＝60%。它表示每一元营业收入中毛利所占的比例。`},
  expectedLoss:{concept:'预期坏账损失',title:'本局这笔订单，预期坏账损失是多少？',lead:'回看本局接单时的 60 元订单：若约定先收 30 元，未收货款为 30 元。按事前给出的 5% 无法收回概率，成交后这部分货款的预期坏账损失是多少？',lesson:lesson(['expectedLoss']),choices:[choice('1.5 元'),choice('3 元','已经收到的 30 元不属于未收货款。要用未收的 30 元乘以 5%，不是全部售价 60 元。'),choice('30 元','30 元是全部未收货款，也是可能的坏账损失上限；预期损失还要乘以概率。')],explain:'预期坏账损失＝30×5%＝1.5 元。它是事前的平均风险估计，不是这一局必定损失 1.5 元。先收一半缩小风险金额，不会改变顾客本身的付款可靠度。'},
 }[id];
 return build(s,'challenge:'+id,data);
}
