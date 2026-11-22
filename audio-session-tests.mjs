import assert from 'node:assert/strict';

const storage=new Map(),events=[],contexts=[];let serial=0,clock=1000,beforeConstruct=()=>{};
globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value))};
globalThis.document={hidden:false};Date.now=()=>clock;
globalThis.fetch=async()=>{throw Error('offline fixture');};
class Param{setValueAtTime(){}linearRampToValueAtTime(){}exponentialRampToValueAtTime(){}}
class Context{
 constructor(){beforeConstruct();this.state='suspended';this.currentTime=1;this.destination={};contexts.push(this);}
 createGain(){return {gain:new Param(),connect(){},disconnect(){}};}
 createOscillator(){return {frequency:new Param(),connect(){},disconnect(){},start(){events.push('sound');},stop(){}};}
 resume(){this.state='running';return Promise.resolve();}suspend(){this.state='suspended';return Promise.resolve();}
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function navigator(value){Object.defineProperty(globalThis,'navigator',{configurable:true,value});}
function session(initial='auto'){
 let type=initial;const changes=[];return {changes,get type(){return type;},set type(value){changes.push(value);type=value;}};
}
async function fresh(nav){navigator(nav);storage.clear();document.hidden=false;globalThis.AudioContext=Context;beforeConstruct=()=>{};clock+=1000;return import(`./dist/interactions.js?session-fixture=${++serial}`);}

const supported=session(),audio=await fresh({audioSession:supported});
assert.equal(supported.changes.length,0,'loading the page does not claim media playback');
audio.setSound(false);audio.primeAudio();audio.playCue('coins');assert.deepEqual(supported.changes,[]);
audio.setSound(true);beforeConstruct=()=>assert.equal(supported.type,'playback','request the playback category before constructing Web Audio');audio.primeAudio();await flush();assert.equal(supported.type,'playback');
clock+=100;audio.playCue('tap');await flush();assert.equal(events.length,2);assert.deepEqual(supported.changes,['playback'],'subsequent cues do not repeatedly rewrite the category');
audio.setSound(false);assert.equal(supported.type,'auto');assert.equal(contexts.at(-1).state,'suspended');
audio.setSound(true);assert.equal(supported.type,'auto','turning on the preference alone does not acquire playback');audio.primeAudio();assert.equal(supported.type,'playback');
audio.setAudioVolume(0);assert.equal(supported.type,'auto');assert.equal(audio.soundEnabled(),false);
audio.setSound(true);audio.primeAudio();assert.equal(supported.type,'playback');document.hidden=true;audio.silence();assert.equal(supported.type,'auto');const count=events.length,changes=supported.changes.length;audio.primeAudio();audio.playCue('complete');await flush();assert.equal(events.length,count);assert.equal(supported.changes.length,changes);
document.hidden=false;audio.primeAudio();assert.equal(supported.type,'playback');audio.setSound(false);

const ambient=session('ambient'),ambientAudio=await fresh({audioSession:ambient});ambientAudio.primeAudio();assert.equal(ambient.type,'playback');ambientAudio.silence();assert.equal(ambient.type,'ambient','release restores the prior category instead of assuming auto');
ambientAudio.primeAudio();ambient.type='transient';ambientAudio.silence();assert.equal(ambient.type,'transient','release does not overwrite a subsequent category selected by the host');

for(const nav of [{},{get audioSession(){throw Error('restricted getter');}},{audioSession:{get type(){return 'auto';},set type(value){throw Error('restricted setter');}}},{audioSession:{get type(){return 'auto';},set type(value){}}}]){
 const fallback=await fresh(nav),before=events.length;fallback.playCue('tap');await flush();assert.equal(events.length,before+2,'missing, blocked and ignored audio-session APIs retain existing audio');fallback.silence();
}

const noContextSession=session(),noContext=await fresh({audioSession:noContextSession});delete globalThis.AudioContext;noContext.primeAudio();noContext.playCue('complete');assert.deepEqual(noContextSession.changes,[],'no media-session claim without a usable Web Audio API');
const brokenSession=session(),broken=await fresh({audioSession:brokenSession});globalThis.AudioContext=class{constructor(){throw Error('unavailable audio device');}};broken.primeAudio();assert.equal(brokenSession.type,'auto','failed construction releases the playback category');
console.log('Audio session: gesture-only playback before context creation, stable cue category, mute / zero volume / background release, foreground reactivation, prior category preservation, and unsupported / restricted / absent-audio fallbacks passed. iPhone silent-switch output still requires real-device verification.');
