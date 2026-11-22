import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const storage=new Map(),contexts=[],events=[],requests=[];let now=1000;
Date.now=()=>now;
globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,String(v))};
globalThis.document={hidden:false};
class Param{value=0;setValueAtTime(v){this.value=v;}linearRampToValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}}
class Source{constructor(kind){this.kind=kind;this.frequency=new Param();this.started=false;this.stops=0;}connect(node){this.output=node;}disconnect(){}start(at){this.started=true;events.push({kind:this.buffer?.kind||this.kind,at,source:this});}stop(){this.stops++;}}
class Context{
 constructor(){this.state='suspended';this.currentTime=1;this.destination={};this.gains=[];this.resumes=0;contexts.push(this);}
 resume(){this.resumes++;this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}
 createGain(){const n={gain:new Param(),connect(){},disconnect(){}};this.gains.push(n);return n;}
 createOscillator(){return new Source('tone');}createBufferSource(){return new Source('sample');}
 decodeAudioData(bytes){return Promise.resolve({kind:new Uint8Array(bytes)[0]===1?'coins':'complete',duration:1.4});}
}
globalThis.AudioContext=Context;
globalThis.fetch=async url=>{requests.push(String(url));const data=new Uint8Array([String(url).includes('coins-glass-clinks')?1:2]);return {ok:true,arrayBuffer:async()=>data.buffer};};
const audio=await import('./dist/interactions.js?audio-tests');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
audio.setSound(false);audio.playCue('coins');assert.equal(contexts.length,0);assert.equal(requests.length,0);
audio.setSound(true);audio.playCue('tap');await flush();assert.equal(events.length,2);assert.equal(contexts[0].resumes,1);assert.equal(audio.audioVolume(),.82);assert.ok(requests.some(url=>url.endsWith('/demo/assets/audio/coins-glass-clinks.mp3')));assert.ok(requests.some(url=>url.endsWith('/demo/assets/audio/level-complete.mp3')));
now+=100;audio.playCue('coins');await flush();assert.equal(events.at(-1).kind,'coins');assert.equal(events.filter(e=>e.kind==='tone').length,2,'ready Foley does not use oscillator coin beeps');
audio.setAudioVolume(.95);assert.equal(contexts[0].gains[0].gain.value,.95);assert.equal(storage.get('lemon-stall:volume'),'.95'.replace(/^\./,'0.'));
const coin=events.at(-1).source;audio.playCue('complete');await flush();assert.equal(events.at(-1).kind,'complete');assert.equal(events.at(-1).source.output.gain.value,.55,'celebration is quieter without lowering all effects');assert.ok(coin.stops>=1,'completion cuts off a prior coin tail');
const count=events.length;audio.playCue('complete');audio.setSound(false);await flush();assert.equal(events.length,count,'a pending sound is cancelled by mute');
audio.setSound(true);document.hidden=true;audio.playCue('coins');audio.playCue('complete');await flush();assert.equal(events.length,count);document.hidden=false;
now+=100;audio.playCue('coins');audio.playCue('coins');await flush();assert.equal(events.length,count+1,'duplicate cash triggers are coalesced');
audio.setAudioVolume(0);assert.equal(audio.soundEnabled(),false);audio.playCue('place');await flush();assert.equal(events.length,count+1);audio.setSound(true);assert.equal(audio.audioVolume(),.82);
// Network/codec failures keep a two-beat completion fallback and never block the UI.
globalThis.fetch=async()=>{throw Error('offline');};const fallback=await import('./dist/interactions.js?audio-fallback-tests');const before=events.length;fallback.playCue('complete');await flush();const notes=events.slice(before);assert.equal(notes.length,6);assert.equal(new Set(notes.map(n=>n.at.toFixed(3))).size,2);
for(const file of ['dist/demo/assets/audio/coins-glass-clinks.mp3','dist/demo/assets/audio/level-complete.mp3','dist/demo/assets/companions-approved.png'])assert.ok(existsSync(file)&&readFileSync(file).length>10000);
console.log('Audio: louder persisted master gain, real sample playback/preload, two-beat fallback, mute/hide cancellation, zero volume, duplicate suppression and deployable assets passed.');
