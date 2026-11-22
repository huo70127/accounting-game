const copy=value=>JSON.parse(JSON.stringify(value));
export function blank(){return {strokes:[],overrides:{},raw:'',manual:false,confirmed:false};}
export function createField(name){return {name,current:blank(),past:[],future:[],revision:0,job:0,result:null,busy:false,surface:null};}
export function change(field,edit){field.past.push(copy(field.current));if(field.past.length>40)field.past.shift();field.future=[];edit(field.current);field.current.confirmed=false;field.revision++;field.result=null;}
export function undo(field){if(!field.past.length)return false;field.future.push(copy(field.current));field.current=field.past.pop();field.revision++;field.result=null;return true;}
export function redo(field){if(!field.future.length)return false;field.past.push(copy(field.current));field.current=field.future.pop();field.revision++;field.result=null;return true;}
export function parseWrittenAmount(raw){
 if(!/^-?\d{1,6}(?:\.\d{1,2})?$/.test(raw))return {ok:false};
 const negative=raw[0]==='-',parts=raw.replace('-','').split('.'),cents=Number(parts[0])*100+Number((parts[1]||'').padEnd(2,'0'));
 return {ok:true,cents:negative?-cents:cents,text:(negative&&cents?'-':'')+String(Number(parts[0]))+(parts[1]!==undefined?'.'+parts[1]:'')};
}
export function editKey(value,key){
 if(key==='sign')return value.startsWith('-')?value.slice(1):'-'+value;
 if(key==='.')return value.includes('.')?value:(value===''?'0.':value==='-'?'-0.':value+'.');
 if(!/^\d$/.test(key)||value.replace(/[-.]/g,'').length>=8)return value;
 const next=value+key;return /^-?\d{0,6}(?:\.\d{0,2})?$/.test(next)?next:value;
}
