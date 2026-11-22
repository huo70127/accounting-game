import assert from 'node:assert/strict';
import {nextDiscovery} from './dist/demo/discoveries.js';
import {start as engineStart,act,question,validate} from './dist/demo/engine.js';
const start=seed=>engineStart(seed,4);
export function drain(s){const p=s.pendingBook;if(!p)return;for(let key=nextDiscovery(s);key;key=nextDiscovery(s))assert.ok(act(s,'discover',key));if(p.preview)assert.ok(act(s,'receipt-review'));if(!p.checked){for(const f of p.fields)f.value=String(f.target/100);if(p.fields.length)assert.ok(act(s,'book-check'));}p.seenPages=[...p.pages];assert.ok(act(s,'book-done'));}
export function prepared(seed=0,target='dailyOpen'){
 const s=start(seed);
 for(let guard=0;guard<180;guard++){
  if(s.stage===target&&!s.pendingBook)return s;
  if(s.pendingBook){drain(s);continue;}
  const q=question(s);if(q){if(!s.lessonsSeen[s.stage])assert.ok(act(s,'learn'));act(s,'pick',q.correct);act(s,'answer',q.correct);assert.ok(act(s,'next'));continue;}
  const action=({welcome:'next',budget:'next',pocket:'invest',parents:'borrow',stall:'buy-stall',stallbought:'next',supply:'buy-stock',idle:'skip-wait',walkin:'serve-cash',delivery:'next',betweenCustomers:'next',cashReceipt:'next',dayEnd:'next',stockout:'next',review:'keep-stall',daySummary:'next-week'})[s.stage];assert.ok(action,s.stage);assert.ok(act(s,action));validate(s);
 }throw Error('opening did not reach the test target');
}
export function scheduler(){let next=0;const jobs=new Map();return {jobs,schedule:fn=>{jobs.set(++next,fn);return next;},cancel:id=>jobs.delete(id),tick(){const [id,fn]=jobs.entries().next().value||[];assert.ok(fn,'a foreground frame is scheduled');jobs.delete(id);fn();}};}
