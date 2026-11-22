import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeModel,predictDigit,recognize,groupStrokes,loadRecognizer} from './dist/handwriting/recognizer.js';
import {createField,blank,change,undo,redo,parseWrittenAmount,editKey} from './dist/handwriting/draft.js';
import {amountStrokes,traces} from './handwriting-strokes.mjs';

const metadata=JSON.parse(readFileSync('dist/handwriting/model.json')),file=readFileSync('dist/handwriting/digits.f32'),buffer=file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),model=decodeModel(metadata,buffer);
assert.ok(metadata.heldOutMNISTAccuracy>=.96);assert.equal(file.byteLength,305320);
assert.throws(()=>decodeModel({...metadata,input:100},buffer));assert.throws(()=>decodeModel(metadata,new ArrayBuffer(10)));
const fixtures=JSON.parse(readFileSync('design/handwriting-model-fixtures.json'));
for(const item of fixtures)assert.equal(Number(predictDigit(item.pixels.map(v=>v/255),model)[0].text),item.prediction,'browser inference agrees with the trained model on held-out images');
for(const digit of Object.keys(traces))assert.equal(recognize(amountStrokes(digit),model).raw,digit);
for(const amount of ['12','32','2.50','-16','0','0.5','-2.50'])for(const scale of [.6,1,1.8]){
 const strokes=amountStrokes(amount,{scale,x:13,y:27}),result=recognize(strokes,model);assert.equal(result.raw,amount,`vector fixture ${amount} at scale ${scale}`);assert.ok(result.candidates.length<=3);assert.equal(groupStrokes(strokes).length,amount.length);
}
assert.equal(recognize([],model).raw,'');
const ambiguous=recognize(amountStrokes('12'),model),alternate=ambiguous.candidates[1];assert.ok(alternate);
const overrides=Object.fromEntries(alternate.picks.map(p=>[p.key,p.text]));assert.equal(recognize(amountStrokes('12'),model,overrides).raw,alternate.text,'candidate overrides are preserved without using a correct answer');

const field=createField('one'),other=createField('two');
change(field,c=>{c.strokes=amountStrokes('12');c.raw='12';});const original=JSON.stringify(field.current);change(field,c=>Object.assign(c,blank()));assert.equal(field.current.raw,'');assert.ok(undo(field));assert.equal(JSON.stringify(field.current),original);assert.ok(redo(field));assert.equal(field.current.raw,'');assert.ok(undo(field));
change(field,c=>{c.raw='32';c.manual=true;});assert.equal(field.future.length,0);assert.ok(undo(field));assert.equal(field.current.raw,'12');assert.equal(field.current.manual,false);assert.equal(other.current.raw,'');
change(field,c=>{const ids=new Set(groupStrokes(c.strokes).at(-1).ids);c.strokes=c.strokes.filter(s=>!ids.has(s.id));});assert.equal(recognize(field.current.strokes,model).raw,'1');
assert.ok(undo(field));assert.equal(recognize(field.current.strokes,model).raw,'12');
for(const [raw,cents] of [['0',0],['12',1200],['2.50',250],['-16',-1600],['-2.5',-250],['999999.99',99999999]]){assert.equal(parseWrittenAmount(raw).ok,true);assert.equal(parseWrittenAmount(raw).cents,cents);}
for(const raw of ['','-','.','2.','2.333','1.2.3','1e2','Infinity','--2','1000000'])assert.equal(parseWrittenAmount(raw).ok,false);
assert.equal(editKey('','.'),'0.');assert.equal(editKey('-','.'),'-0.');assert.equal(editKey('12','sign'),'-12');assert.equal(editKey('-12','sign'),'12');assert.equal(editKey('1.25','9'),'1.25');assert.equal(editKey('12','evil'),'12');

let requests=0;const unavailable=async()=>{requests++;return {ok:false};};await assert.rejects(loadRecognizer(unavailable));
const fetcher=async url=>{requests++;return String(url).endsWith('model.json')?{ok:true,json:async()=>metadata}:{ok:true,arrayBuffer:async()=>buffer};};
const loaded=await loadRecognizer(fetcher);assert.equal(recognize(amountStrokes('32'),loaded).raw,'32');assert.equal(await loadRecognizer(fetcher),loaded);assert.equal(requests,3,'one failed request can retry, and a successful model stays cached');
console.log('Handwriting: held-out JS/Python inference parity, 0–9 vector fixtures, multi-digit / decimal / minus at three scales, candidate corrections, stroke undo / redo / clear / delete, independent fields, valid numeric editing and failed-model retry passed. This does not measure finger handwriting accuracy.');
