import {ASSESSMENT_QUESTIONS,ASSESSMENT_SAVE_KEY,assessmentFor,recordAssessment,assessmentScore,loadAssessment} from './assessment.js';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function setupAssessment({storage,onEnter,onReturn=()=>{}}){
 const host=document.getElementById('assessment-page'),holder=loadAssessment(storage);let phase='pre',review=null,pick=null,visible=true,storageOK=true,entering=false;
 const a=()=>assessmentFor(holder);
 function save(){try{storage.setItem(ASSESSMENT_SAVE_KEY,JSON.stringify(a()));storageOK=true;}catch{storageOK=false;}}
 function lock(){visible=true;document.body.classList.add('learning-locked');host.hidden=false;for(const node of document.querySelectorAll('.site-header,.app-shell'))node.inert=true;document.title=phase==='pre'?'会计知识 · 学前测验':'会计知识 · 学后测验';}
 function unlock(){visible=false;host.hidden=true;document.body.classList.remove('learning-locked');for(const node of document.querySelectorAll('.site-header,.app-shell'))node.inert=false;document.title='手打柠檬茶 · 圆滚滚和贼溜溜的夏天';}
 function draw(){const profile=a(),run=profile[phase],done=run.done,index=run.answers.length,q=ASSESSMENT_QUESTIONS[index],pre=assessmentScore(profile.pre),post=assessmentScore(profile.post);
 let body='',footer='',count=done?10:index+1;
 if(done&&phase==='pre'){
  body='<div class="assessment-ready" aria-hidden="true">✓</div><h1 id="assessment-title" tabindex="-1">十道题，已经记下了。</h1><p class="assessment-lead">先保留这次的答案。接下来，从一张空摊桌开始，把这些概念亲手用一遍。</p><p class="assessment-note">经营结束后会再做同样十道题，再一起看答案和两次成绩。</p>';
  footer='<button type="button" class="primary-button" data-assessment-enter>进入柠檬茶摊</button>';
 }else if(done){
  const difference=post-pre,feedback=difference>0?`这次比学前多答对 ${difference} 题。`:difference===0?'两次分数相同，可以对照看看哪些概念更清楚了。':'这次的分数比学前低，看看哪些概念还需要再练一次。';
  body=`<h1 id="assessment-title" tabindex="-1">看看这一路的收获。</h1><p class="assessment-lead">同样的十道题，两次独立作答。</p><div class="assessment-scores"><div><span>学前测验</span><strong>${pre}<small> / 10</small></strong></div><span aria-hidden="true">→</span><div><span>学后测验</span><strong>${post}<small> / 10</small></strong></div></div><p class="assessment-progress-note" role="status">${feedback}</p>`;
  if(review!==null){const question=ASSESSMENT_QUESTIONS[review],answer=n=>n===3?'暂时不确定':question.options[n];body+=`<section class="assessment-review"><span>${review+1} / 10 · ${question.concept}</span><h2>${question.title}</h2><p>学前：${esc(answer(profile.pre.answers[review]))}<br>学后：${esc(answer(profile.post.answers[review]))}</p><p><strong>正确答案：${question.options[question.correct]}</strong></p><p>${question.explain}</p><div class="assessment-review-nav"><button type="button" class="secondary-button" data-assessment-review="${review-1}" ${review===0?'disabled':''}>上一题</button><button type="button" class="secondary-button" data-assessment-review="${review+1}" ${review===9?'disabled':''}>下一题</button></div></section>`;}
  else body+='<button type="button" class="secondary-button" data-assessment-review="0">逐题对照答案与讲解</button>';
  footer='<button type="button" class="primary-button" data-assessment-return>收好成绩，查看经营结果</button>';
 }else{
  body=`<p class="assessment-question-count">第 ${index+1} 题 / 共 10 题</p><h1 id="assessment-title" tabindex="-1">${q.title}</h1><p class="assessment-note">${phase==='pre'?'按现在的理解作答，不确定也可以如实选择。':'用现在的理解再答一次，全部完成后再公布答案。'}</p><div class="assessment-options">${[...q.options,'暂时不确定'].map((option,i)=>`<button type="button" class="secondary-button ${pick===i?'selected':''}" data-assessment-choice="${i}" data-assessment-index="${index}" aria-pressed="${pick===i}"><span>${String.fromCharCode(65+i)}</span>${option}</button>`).join('')}</div>`;
  footer=`<button type="button" class="primary-button" data-assessment-next data-assessment-index="${index}" ${pick===null?'disabled':''}>${index===9?'完成测验':'下一题'}<span aria-hidden="true"> →</span></button>`;
 }
 host.innerHTML=`<div class="assessment-shell"><header class="assessment-header"><span class="assessment-wordmark">会计入门</span><span>${phase==='pre'?'学前测验':'学后测验'}</span></header><nav class="assessment-journey" aria-label="学习流程"><span class="${phase==='pre'?'current':''}">01 学前测验</span><i></i><span>02 经营体验</span><i></i><span class="${phase==='post'?'current':''}">03 学后对照</span></nav><div class="assessment-progress" role="progressbar" aria-label="测验进度" aria-valuemin="0" aria-valuemax="10" aria-valuenow="${run.answers.length}"><i style="width:${run.answers.length*10}%"></i></div><main class="assessment-body">${body}</main><footer class="assessment-footer"><p>${storageOK?'作答自动保存在本机 · 完成十题后继续':'本机保存暂不可用，请保持本页面开启'}</p>${footer}</footer></div>`;
 }
 async function enter(){if(entering||!a().pre.done)return;entering=true;a().entered=true;save();try{unlock();await onEnter();}catch{lock();draw();const note=host.querySelector('.assessment-footer p');if(note)note.textContent='加载暂未完成，请再点一次继续。';}finally{entering=false;}}
 host.addEventListener('click',event=>{const button=event.target.closest('button');if(!button||button.disabled||!visible)return;
  if(button.hasAttribute('data-assessment-choice')){if(Number(button.dataset.assessmentIndex)!==a()[phase].answers.length)return;pick=Number(button.dataset.assessmentChoice);draw();return;}
  if(button.hasAttribute('data-assessment-next')){if(pick===null)return;const index=Number(button.dataset.assessmentIndex);if(recordAssessment(holder,phase,index,pick)){pick=null;save();draw();host.querySelector('h1')?.focus?.({preventScroll:true});}return;}
  if(button.hasAttribute('data-assessment-enter')){void enter();return;}
  if(button.hasAttribute('data-assessment-return')){if(!a().post.done)return;unlock();onReturn();return;}
  if(button.hasAttribute('data-assessment-review')&&a().post.done){const index=Number(button.dataset.assessmentReview);if(Number.isInteger(index)&&index>=0&&index<10){review=index;draw();}return;}
 });
 function finish(){if(!a().pre.done)return;phase='post';pick=null;review=null;lock();save();draw();}
 function restart(){holder.assessment=null;assessmentFor(holder);save();globalThis.location?.reload?.();}
 return {start:async()=>{if(a().pre.done&&a().entered)await enter();else{lock();draw();}},finish,restart,active:()=>visible,postComplete:()=>a().post.done,profile:()=>structuredClone(a())};
}
