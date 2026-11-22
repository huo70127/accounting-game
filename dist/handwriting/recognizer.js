// Local digit inference. It receives strokes, never accounting answers or field labels.
export function bounds(strokes){
 let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;
 for(const stroke of strokes)for(const point of stroke.points){left=Math.min(left,point.x);right=Math.max(right,point.x);top=Math.min(top,point.y);bottom=Math.max(bottom,point.y);}
 if(left===Infinity)return null;
 return {left,right,top,bottom,width:right-left,height:bottom-top};
}
export function groupStrokes(strokes){
 const valid=strokes.filter(s=>s.points.length),all=bounds(valid);if(!all)return [];
 const tolerance=Math.max(2,all.height*.035),groups=[];
 for(const stroke of valid){
  let group={strokes:[stroke],box:bounds([stroke])};
  for(let i=groups.length-1;i>=0;i--){const other=groups[i],a=group.box,b=other.box;
   const overlap=Math.min(a.right,b.right)-Math.max(a.left,b.left);
   const tinyA=a.width<all.height*.18&&a.height<all.height*.18,tinyB=b.width<all.height*.18&&b.height<all.height*.18;
   if(overlap>=((tinyA||tinyB)?0:-tolerance)){group.strokes.push(...other.strokes);groups.splice(i,1);group.box=bounds(group.strokes);i=groups.length;}
  }groups.push(group);
 }
 return groups.sort((a,b)=>a.box.left-b.box.left).map(g=>({...g,key:g.strokes.map(s=>s.id).sort((a,b)=>a-b).join(','),ids:g.strokes.map(s=>s.id)}));
}
function segmentDistance(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);}
export function rasterize(group,thickness=.115){
 const box=group.box||bounds(group.strokes),pixels=new Float32Array(784),longest=Math.max(box.width,box.height,1),pen=longest*thickness,scale=20/(longest+pen),radius=pen*scale/2;
 const width=(box.width+pen)*scale,height=(box.height+pen)*scale;
 const map=p=>({x:(p.x-box.left+pen/2)*scale+(28-width)/2,y:(p.y-box.top+pen/2)*scale+(28-height)/2});
 for(const stroke of group.strokes){const points=stroke.points.map(map);for(let i=0;i<points.length;i++){
  const a=points[Math.max(0,i-1)],b=points[i],x0=Math.max(0,Math.floor(Math.min(a.x,b.x)-radius-1)),x1=Math.min(27,Math.ceil(Math.max(a.x,b.x)+radius+1)),y0=Math.max(0,Math.floor(Math.min(a.y,b.y)-radius-1)),y1=Math.min(27,Math.ceil(Math.max(a.y,b.y)+radius+1));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const alpha=Math.max(0,Math.min(1,radius+.5-segmentDistance(x,y,a,b)));pixels[y*28+x]=Math.max(pixels[y*28+x],alpha);}
 }}
 let total=0,cx=0,cy=0;for(let y=0;y<28;y++)for(let x=0;x<28;x++){const value=pixels[y*28+x];total+=value;cx+=x*value;cy+=y*value;}
 if(!total)return pixels;const dx=Math.round(13.5-cx/total),dy=Math.round(13.5-cy/total),centered=new Float32Array(784);
 for(let y=0;y<28;y++)for(let x=0;x<28;x++)if(x+dx>=0&&x+dx<28&&y+dy>=0&&y+dy<28)centered[(y+dy)*28+x+dx]=pixels[y*28+x];return centered;
}
export function decodeModel(metadata,buffer){
 if(metadata.format!==1||metadata.input!==784||metadata.hidden!==96||metadata.output!==10||buffer.byteLength!==305320)throw Error('Unsupported digit model');
 const view=new DataView(buffer),weights=new Float32Array(buffer.byteLength/4);for(let i=0;i<weights.length;i++)weights[i]=view.getFloat32(i*4,true);
 let offset=0;const take=n=>{const part=weights.subarray(offset,offset+n);offset+=n;return part;};return {w1:take(784*96),b1:take(96),w2:take(96*10),b2:take(10)};
}
export function predictDigit(pixels,model){
 const hidden=new Float64Array(model.b1);for(let i=0;i<784;i++){const value=pixels[i];if(!value)continue;for(let j=0;j<96;j++)hidden[j]+=value*model.w1[i*96+j];}
 const logits=new Float64Array(model.b2);for(let j=0;j<96;j++){const value=Math.max(0,hidden[j]);for(let k=0;k<10;k++)logits[k]+=value*model.w2[j*10+k];}
 const peak=Math.max(...logits),values=[...logits].map(v=>Math.exp(v-peak)),total=values.reduce((a,b)=>a+b,0);return values.map((v,digit)=>({text:String(digit),score:v/total})).sort((a,b)=>b.score-a.score);
}
let loading;
export function loadRecognizer(fetcher=fetch){
 if(!loading)loading=(async()=>{const metadataResponse=await fetcher(new URL('model.json',import.meta.url));if(!metadataResponse.ok)throw Error('Digit model unavailable');const metadata=await metadataResponse.json(),response=await fetcher(new URL('digits.f32',import.meta.url));if(!response.ok)throw Error('Digit weights unavailable');return decodeModel(metadata,await response.arrayBuffer());})().catch(error=>{loading=null;throw error;});return loading;
}
export function recognize(strokes,model,overrides={}){
 const groups=groupStrokes(strokes),all=bounds(strokes);if(!all)return {raw:'',tokens:[],candidates:[],uncertain:false};
 if(groups.length>10)throw Error('Write a shorter amount');
 const height=Math.max(...groups.map(g=>g.box.height),all.width*.12,1);
 const tokens=groups.map((g,index)=>{
  const b=g.box;let choices;
  if(b.width>Math.max(9,b.height*4)&&b.height<height*.22&&index===0)choices=[{text:'-',score:1}];
  else if(b.width<=Math.max(5,height*.22)&&b.height<=Math.max(5,height*.22)&&(groups.length===1||b.top+b.height/2>all.top+height*.62))choices=[{text:'.',score:1}];
  else{
   const regular=predictDigit(rasterize(g),model),thin=predictDigit(rasterize(g,.085),model);
   choices=regular.map(v=>({text:v.text,score:v.score*.65+thin.find(t=>t.text===v.text).score*.35})).sort((a,b)=>b.score-a.score).slice(0,3);
  }
  if(overrides[g.key]!==undefined)choices=[{text:overrides[g.key],score:1}];
  return {...g,choices};
 });
 let beam=[{text:'',score:1,picks:[]}];for(const token of tokens){const next=[];for(const prefix of beam)for(const choice of token.choices)next.push({text:prefix.text+choice.text,score:prefix.score*choice.score,picks:[...prefix.picks,{key:token.key,text:choice.text}]});beam=next.sort((a,b)=>b.score-a.score).slice(0,8);}
 const candidates=beam.filter((v,i,array)=>array.findIndex(other=>other.text===v.text)===i).slice(0,3);
 return {raw:candidates[0]?.text||'',tokens,candidates,uncertain:tokens.some(t=>t.choices[0].score<.7||t.choices.length>1&&t.choices[0].score-t.choices[1].score<.25)};
}
