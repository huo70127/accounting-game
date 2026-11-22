// Event-keyed randomness: choices never advance a shared random cursor.
export function eventRandom(seed,key){let h=(seed>>>0)^2166136261;for(const ch of key){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}h+=0x6d2b79f5;h=Math.imul(h^(h>>>15),h|1);h^=h+Math.imul(h^(h>>>7),h|61);return ((h^(h>>>14))>>>0)/4294967296;}
export const ACCEPTANCE={6000:.45,3000:.75,0:.95};
export function repayment(seed){const n=eventRandom(seed,'main-customer:repayment');return n<.8?'ontime':n<.95?'late':'default';}
export function backupDemand(seed){const n=eventRandom(seed,'evening:walk-ins');return n<.35?0:n<.75?4:8;}
