import {clockView} from './rhythm.js';
const $=id=>document.getElementById(id);
export function waitingPanel(){return '<p class="order-idle">暂无订单</p>';}
const captions={morning:'等第一位街坊',noon:'午间的巷口',packing:'擦台，收拾一下',evening:'再等一会儿',opening2:'小摊开张啦',noon2:'又有街坊来了',afternoon2:'午后，歇一口气'};
export function renderInterlude(s,btn){const q=clockView(s).wait;const layer=$('sceneinterlude');layer.hidden=!q;if(!q){$('scenecontrols').innerHTML='';return;}$('scene-caption').textContent=q.called?'手打柠檬茶！':captions[q.id]||'街坊来来往往';$('scenecontrols').innerHTML=(q.kind==='packing'?'':btn('call',q.called?'叫卖中':'叫卖','',false,q.called));}
function blend(a,b,t){return a.map((v,i)=>Math.round(v+(b[i]-v)*t));}
export function paintStreet(s,paused=false){const w=clockView(s),scene=document.querySelector('.scene');
const stops=w.weather==='sunny'?[[480,[232,239,217]],[780,[246,237,206]],[960,[241,226,202]],[1110,[226,207,195]],[1170,[202,211,207]]]:[[480,[224,232,225]],[780,[226,231,222]],[960,[222,224,214]],[1110,[210,209,206]],[1170,[195,206,210]]];
let color=stops[0][1];for(let i=1;i<stops.length;i++){if(w.minute>=stops[i-1][0])color=blend(stops[i-1][1],stops[i][1],Math.min(1,(w.minute-stops[i-1][0])/(stops[i][0]-stops[i-1][0])));}
scene.style.backgroundColor=`rgb(${color.join(',')})`;scene.dataset.sky=w.weather;scene.dataset.night=String(w.minute>=1080);scene.dataset.pace=w.wait?.kind||'order';scene.dataset.closed=String(['close1','close2','end'].includes(s.phase));scene.dataset.waiting=String(!!w.wait);scene.classList.toggle('world-paused',paused);
scene.style.setProperty('--sun-x',`${12+w.progress*72}%`);scene.style.setProperty('--sun-y',`${12+Math.pow((w.progress-.45)*2,2)*30}px`);
$('clocktime').textContent=w.time;$('daypart').textContent=w.part;$('skyicon').textContent=w.minute>=1140?'☾':w.weather==='sunny'?'☀':'☁';$('dayfill').style.width=`${w.progress*100}%`;
$('weather').textContent=`第 ${s.day} 天 / 广州 · ${w.weather==='sunny'?'晴热':'多云'}`;
$('clockstate').textContent=paused?'已暂停 · 慢慢阅读':w.wait?'街坊来来往往':'处理眼前这笔生意';
const sun=document.querySelector('.sun');sun.textContent=w.minute>=1140?'☾':'☀';
const bubble=$('hawkingbubble');bubble.textContent='';bubble.classList.remove('visible');
if($('scene-waitfill')&&w.wait)$('scene-waitfill').style.width=`${(1-w.wait.remainingMs/w.wait.totalMs)*100}%`;
}
export function animateDelivery(count=1){if(document.body.classList.contains('no-motion'))return;const scene=document.querySelector('.scene');for(let i=0;i<count;i++){const cup=document.createElement('span');cup.className='served-cup';cup.setAttribute('aria-hidden','true');cup.style.setProperty('--i',i);scene.append(cup);setTimeout(()=>cup.remove(),1300);}}
