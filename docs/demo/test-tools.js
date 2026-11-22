// Temporary review build switch. Set false for the public release.
export const TEST_TOOLS=true;
export function fillCurrentBook(s,act,money){
 if(!TEST_TOOLS||!s.pendingBook||s.pendingBook.checked)return false;
 const p=s.pendingBook;
 for(const field of p.fields)field.value=money(field.target);
 // Only this transaction is filled and checked. No page acknowledgement,
 // question, business decision, time advance, or journal posting is skipped.
 s.testBookFills=(s.testBookFills||0)+1;
 return act(s,'book-check');
}
