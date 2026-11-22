// Gesture-activated shared mixer. Recorded Foley and the approved E orchestral completion cue.
let context,bus,enabled=true,volume=.82,lastTap=-Infinity,epoch=0,lastCoins=-Infinity;
const playing=new Set(),samples=new Map();
let playbackSession=null;
try{enabled=localStorage.getItem('lemon-stall:sound')!=='off';const saved=localStorage.getItem('lemon-stall:volume');if(saved!==null&&Number.isFinite(Number(saved)))volume=Math.max(0,Math.min(1,Number(saved)));}catch{}
export function soundEnabled(){return enabled&&volume>0;}
export function audioVolume(){return volume;}
export function setAudioVolume(value){if(!Number.isFinite(Number(value)))return;volume=Math.max(0,Math.min(1,Number(value)));try{localStorage.setItem('lemon-stall:volume',String(volume));}catch{}if(bus){try{bus.gain.setValueAtTime(volume,context.currentTime);}catch{}}if(volume===0)silence();}
export function setSound(value){enabled=!!value;if(enabled&&volume===0)setAudioVolume(.82);try{localStorage.setItem('lemon-stall:sound',enabled?'on':'off');}catch{}if(!enabled)silence();}
function stopPlaying(){for(const item of playing){try{item.source.stop();}catch{}try{item.source.disconnect();item.gain.disconnect();}catch{}}playing.clear();}
export function silence(){epoch++;stopPlaying();try{context?.suspend()?.catch(()=>{});}catch{}releasePlaybackSession();}
const sourceURLs={discovery:new URL('./demo/assets/audio/concept-discovery.mp3',import.meta.url),coinsJar:new URL('./demo/assets/audio/coins-jar-pour.mp3',import.meta.url),coins:new URL('./demo/assets/audio/coins-glass-clinks.mp3',import.meta.url),complete:new URL('./demo/assets/audio/level-complete.mp3',import.meta.url)};
// Safari normally treats Web Audio as ambient sound, which follows the iPhone
// silent switch. Request media playback only from the existing gesture paths.
// Other browsers / restricted WKWebViews keep the original audio behavior.
function requestPlaybackSession(){
 try{
  const session=globalThis.navigator?.audioSession;if(!session)return;
  if(playbackSession&&playbackSession.session!==session)releasePlaybackSession();
  if(playbackSession&&session.type==='playback')return;
  const previous=playbackSession?.previous??session.type??'auto';
  session.type='playback';
  if(session.type==='playback')playbackSession={session,previous};
 }catch{} // The optional API must never prevent ordinary Web Audio playback.
}
function releasePlaybackSession(){
 const lease=playbackSession;playbackSession=null;if(!lease)return;
 try{if(lease.session.type==='playback')lease.session.type=lease.previous;}catch{}
}
function ensureContext(){
 const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return null;
 requestPlaybackSession();
 try{
 if(!context){context=new Audio();bus=context.createGain();bus.gain.setValueAtTime(volume,context.currentTime);if(context.createDynamicsCompressor){const limiter=context.createDynamicsCompressor();limiter.threshold.setValueAtTime(-3,context.currentTime);limiter.knee.setValueAtTime(3,context.currentTime);limiter.ratio.setValueAtTime(8,context.currentTime);limiter.attack.setValueAtTime(.003,context.currentTime);limiter.release.setValueAtTime(.12,context.currentTime);bus.connect(limiter);limiter.connect(context.destination);}else bus.connect(context.destination);}
 return context;
 }catch(error){releasePlaybackSession();throw error;}
}
function loadSample(kind){
 if(!sourceURLs[kind]||!context?.decodeAudioData||!context?.createBufferSource||typeof fetch!=='function')return Promise.resolve(null);
 if(!samples.has(kind)){const task=fetch(sourceURLs[kind]).then(r=>{if(!r.ok)throw Error('Audio asset unavailable');return r.arrayBuffer();}).then(bytes=>context.decodeAudioData(bytes)).catch(()=>null);samples.set(kind,task);}
 return samples.get(kind);
}
export function primeAudio(){if(!soundEnabled()||globalThis.document?.hidden)return;try{const ctx=ensureContext();if(!ctx)return;const resume=ctx.state==='running'?Promise.resolve():ctx.resume();resume.then(()=>{void loadSample('coins');void loadSample('complete');}).catch(()=>{});}catch{}}
function track(source,gain){const item={source,gain};playing.add(item);source.onended=()=>{playing.delete(item);try{source.disconnect();gain.disconnect();}catch{}};}
const scores={
 discovery:[[0,783.99,.14,.045],[.14,1046.5,.3,.055]],
 tap:[[0,660,.055,.068],[.025,880,.045,.032]],
 place:[[0,520,.075,.067],[.055,780,.11,.048]],
 retry:[[0,330,.12,.05],[.09,294,.15,.037]],
 success:[[0,523.25,.15,.082],[.09,659.25,.17,.075],[.19,783.99,.25,.074]],
 // A short two-beat fallback keeps completion feedback available when the sample cannot load.
 complete:[[0,392,.27,.07],[0,493.883,.27,.04],[0,587.33,.27,.035],[.33,523.251,.55,.085],[.33,659.255,.55,.05],[.33,783.991,.55,.04]],
 coins:[[0,1318,.12,.055],[.06,1760,.13,.045],[.13,2093,.17,.037]]
};
function synthesize(kind){const now=context.currentTime+.008;for(const [delay,freq,duration,level] of scores[kind]||scores.tap){const source=context.createOscillator(),gain=context.createGain(),at=now+delay;source.type='sine';source.frequency.setValueAtTime(freq,at);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(level*(kind==='complete'?.55:1),at+.006);gain.gain.exponentialRampToValueAtTime(.0001,at+duration);source.connect(gain);gain.connect(bus);track(source,gain);source.start(at);source.stop(at+duration+.02);}}
function sampled(buffer,kind){const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;gain.gain.setValueAtTime((kind==='coins'||kind==='coinsJar')?.96:kind==='discovery'?.62:kind==='complete'?.55:1,context.currentTime);source.connect(gain);gain.connect(bus);track(source,gain);source.start(context.currentTime+.006);}
export function playCue(kind='tap'){
 if(!soundEnabled()||globalThis.document?.hidden)return;
 const time=Date.now();if(kind==='tap'){if(time-lastTap<65)return;lastTap=time;}if(kind==='coins'){if(time-lastCoins<90)return;lastCoins=time;}
 try{
  const ctx=ensureContext();if(!ctx)return;
  if(kind==='complete'){epoch++;stopPlaying();}
  const ticket=epoch;
  const schedule=async()=>{
   if(ticket!==epoch||!soundEnabled()||ctx.state!=='running'||globalThis.document?.hidden)return;
   if(sourceURLs[kind]){let timeout;const buffer=await Promise.race([loadSample(kind),new Promise(resolve=>{timeout=setTimeout(()=>resolve(null),300);})]);clearTimeout(timeout);if(ticket!==epoch||!soundEnabled()||ctx.state!=='running'||globalThis.document?.hidden)return;if(buffer)sampled(buffer,kind);else synthesize(kind);}
   else synthesize(kind);
   void loadSample('coins');void loadSample('complete');
  };
  if(ctx.state==='running')void schedule().catch(()=>{});else ctx.resume().then(schedule).catch(()=>{});
 }catch{} // Missing audio support or an asset must never block the game.
}
export function initInteractions(){document.addEventListener('click',e=>{const button=e.target.closest('button');if(!button||button.disabled||button.id==='sound'||button.id==='journalcheck')return;playCue(button.dataset.material?'place':'tap');},true);document.addEventListener('visibilitychange',()=>{if(document.hidden)silence();});}
export function celebrateLesson(){const stage=document.getElementById('journalcelebration');if(!stage)return;stage.replaceChildren();for(let i=0;i<12;i++){const bit=document.createElement('i');bit.style.setProperty('--i',i);bit.style.setProperty('--x',`${(i-5.5)*19}px`);bit.style.setProperty('--r',`${(i%2?1:-1)*(80+i*23)}deg`);stage.append(bit);}}
