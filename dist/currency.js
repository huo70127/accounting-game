export const cents=value=>Math.round(Number(value)*100);
export const yuan=value=>value/100;
export const isMoney=value=>typeof value==='number'&&Number.isFinite(value)&&Number.isSafeInteger(cents(value))&&Math.abs(value*100-cents(value))<0.00001;
export const sumMoney=values=>yuan(values.reduce((n,v)=>n+cents(v||0),0));
export const formatMoney=value=>'¥ '+(Number.isInteger(value)?value:Number(value).toFixed(2));
