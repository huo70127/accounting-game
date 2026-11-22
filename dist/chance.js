export function createSeed(){if(globalThis.crypto?.getRandomValues)return crypto.getRandomValues(new Uint32Array(1))[0];return (Date.now()^Math.floor(Math.random()*0x100000000))>>>0;}
function legacySeed(s){let n=2166136261;for(const c of JSON.stringify(s.tx))n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return n;}
export function draw(s,event){
 // The generator state is part of the save, including saves made before the draw.
 s.rngState=((s.rngState??legacySeed(s))+0x6D2B79F5)>>>0;
 let x=s.rngState;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);
 const roll=((x^(x>>>14))>>>0)/4294967296;
 let cursor=roll*event.outcomes.reduce((sum,v)=>sum+v.weight,0);
 for(const option of event.outcomes){cursor-=option.weight;if(cursor<0)return option.cups;}
 return event.outcomes.at(-1).cups;
}
