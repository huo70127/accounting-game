import {validateStock} from './materials.js';
import {isMoney} from './currency.js';
import {validateLesson} from './journal.js';
import {checkWorld} from './rhythm.js';
import {validate,balances} from './engine.js';
const PHASES=['intro','supplies','first','credit','dusk','evening','supplier','close1','collect','prepare','channel','confirm','sell','close2','due','end'];
const ACCOUNTS=['cash','inventory','receivable','equipment','debt','familyDebt','interest','capital','profit'];
export function checkState(value,depth=0){
 if(depth>1||!value||typeof value!=='object'||!PHASES.includes(value.phase)||![1,2,3].includes(value.day)||!Array.isArray(value.tx)||value.tx.length>1000||!value.flags||typeof value.flags!=='object'||Array.isArray(value.flags)||!Number.isInteger(value.sold)||value.sold<0||value.sold>5||![null,'walk','group'].includes(value.channel)||![null,'success','failure','continue'].includes(value.end))throw Error('存档格式不正确');
 if(value.rngState!==undefined&&(!Number.isInteger(value.rngState)||value.rngState<0||value.rngState>4294967295))throw Error('随机进度不正确');
 if(value.evening!==undefined&&value.evening!==null){const e=value.evening;if(!Number.isInteger(e.demand)||e.demand<0||e.demand>3||!Number.isInteger(e.served)||e.served<0||e.served>e.demand||!Number.isInteger(e.spoiled)||e.spoiled<0||e.spoiled+e.served>3)throw Error('晚客记录不正确');}
 if(value.phase==='evening'&&!value.evening)throw Error('缺少晚客记录');
 if(value.pendingConcepts){const p=value.pendingConcepts;if(!Array.isArray(p.keys)||p.keys.length>20||p.keys.some(k=>!['spoilage','familyDebt','inventory','receivable','equipment','debt','interest','depreciation','revenue','cost','profit','投资','还款'].includes(k))||!Number.isInteger(p.txStart)||p.txStart<0||p.txStart>value.tx.length||p.day!==value.day)throw Error('概念阅读进度不正确');}
 validateLesson(value);
 if(value.world)checkWorld(value.world,value.day);
 const ids=new Set(),prefix={tx:[]};
 for(const t of value.tx){
  if(!t||typeof t.id!=='string'||ids.has(t.id)||typeof t.label!=='string'||t.label.length>300||/[<>]/.test(t.label)||![1,2,3].includes(t.day)||t.day>value.day||!['经营','筹资','投资','非现金','还款'].includes(t.flow)||!t.delta||typeof t.delta!=='object'||Array.isArray(t.delta))throw Error('交易记录不完整');
  if(t.kind!==undefined&&!['sale','spoilage'].includes(t.kind))throw Error('交易种类不正确');
  ids.add(t.id);for(const [k,v] of Object.entries(t.delta))if(!ACCOUNTS.includes(k)||!isMoney(v))throw Error('交易金额不正确');
  prefix.tx.push(t);validate(prefix);
 }
 validateStock(value);
 if(value.stockHistory){for(const [day,h] of Object.entries(value.stockHistory)){if(![1,2,3].includes(Number(day))||!h)throw Error('库存历史不正确');validateStock({...value,day:Number(day),tx:value.tx.filter(t=>t.day<=Number(day)),stockLots:h.stockLots,readyCups:h.readyCups});}}
 const b=balances(value);if(ACCOUNTS.filter(k=>k!=='profit').some(k=>b[k]<0))throw Error('账目余额不正确');
 if(value.snapshot)checkState(value.snapshot,depth+1);
 return value;
}
export function envelope(s){return {format:'lemon-tea-stall',version:1,savedAt:new Date().toISOString(),state:JSON.parse(JSON.stringify(checkState(s)))};}
export function restore(record){if(!record||record.format!=='lemon-tea-stall'||record.version!==1)throw Error('这不是当前版本的柠檬茶存档');return JSON.parse(JSON.stringify(checkState(record.state)));}
let database;
function db(){return database ||= new Promise((resolve,reject)=>{if(!globalThis.indexedDB){reject(Error('浏览器未提供本地存储'));return;}const request=indexedDB.open('lemon-tea-stall',1);request.onupgradeneeded=()=>request.result.createObjectStore('saves');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('请关闭其他游戏标签页后重试'));});}
export async function loadGame(){const d=await db();const record=await new Promise((resolve,reject)=>{const req=d.transaction('saves','readonly').objectStore('saves').get('current');req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});return record?restore(record):null;}
export async function saveGame(s){const record=envelope(s),d=await db();return new Promise((resolve,reject)=>{const tx=d.transaction('saves','readwrite');tx.objectStore('saves').put(record,'current');tx.oncomplete=()=>resolve(record.savedAt);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('保存未完成'));});}
