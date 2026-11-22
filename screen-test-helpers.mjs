import assert from 'node:assert/strict';
export function reviewPendingReceipt(){const button=document.querySelector('[data-action="receipt-review"]');if(!button)return false;assert.equal(!!document.querySelector('#book')?.open,false,'sale facts precede the book');assert.ok(document.querySelector('.sale-confirmation'),'receipt is visible before accounting');showTarget(button);button.click();return true;}
// Follow the same visible page controls as a player; never click through a hidden beat.
export function showTarget(target){
 const find=selector=>document.querySelector(selector);
 if(target.closest('#purchase')&&!find('#purchase').open)find('[data-action="open-procurement"]').click();
 if(target.closest('#menu')&&!find('#menu').open)find('#openmenu').click();
 const page=target.closest('.screen-page');
 if(page?.hidden){
  const host=page.parentNode,pages=[...host.children],wanted=pages.indexOf(page),reading=!!host.closest('#reading'),scope=reading?'#reading-actions':'#scene-actions';
  for(let guard=0;page.hidden&&guard<100;guard++){
   const active=pages.findIndex(p=>!p.hidden),button=find(scope+(active<wanted?' [data-screen-next]':' [data-screen-back]'));assert.ok(button,'a hidden beat has a visible page control');assert.ok(!button.disabled);button.click();
  }assert.equal(page.hidden,false);
 }
 if(target.hidden&&target.closest('#scene-actions')){for(let guard=0;target.hidden&&guard<100;guard++){const next=find('#scene-actions [data-screen-next]');assert.ok(next,'final action is gated by readable beats');next.click();}assert.equal(target.hidden,false);}
 const row=target.closest('.book-row');
 if(row?.hidden){
  const back=find('[data-sheet-back]');while(back&&!find('[data-sheet-back]').disabled)find('[data-sheet-back]').click();
  for(let guard=0;row.hidden&&guard<100;guard++){const next=find('[data-sheet-next]');assert.ok(next&&!next.disabled,'a hidden report row is reachable by paging');next.click();}assert.equal(row.hidden,false);
 }
}
