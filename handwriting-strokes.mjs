const ellipse=(cx,cy,rx,ry)=>Array.from({length:41},(_,i)=>({x:cx+rx*Math.cos(i/40*Math.PI*2),y:cy+ry*Math.sin(i/40*Math.PI*2)}));
const p=list=>list.map(([x,y])=>({x,y}));
export const traces={
 0:[ellipse(40,60,25,45)],1:[p([[40,10],[40,105]])],
 2:[p([[10,25],[20,12],[40,8],[58,20],[62,36],[10,105],[65,105]])],
 3:[p([[10,13],[40,8],[61,22],[58,36],[31,55],[57,65],[62,84],[48,104],[12,104]])],
 4:[p([[55,8],[11,72],[66,72]]),p([[54,45],[54,108]])],
 5:[p([[65,10],[12,10],[12,52],[45,48],[65,62],[65,87],[45,105],[12,103]])],
 6:[p([[57,8],[30,20],[14,53],[12,83],[28,105],[52,104],[65,82],[57,62],[35,55],[16,65]])],
 7:[p([[10,10],[65,10],[25,107]])],8:[ellipse(40,36,24,26),ellipse(40,84,26,27)],
 9:[ellipse(36,35,25,27),p([[60,34],[57,80],[37,108]])]
};
export function amountStrokes(text,{scale=1,x=0,y=0}={}){
 let offset=0,id=0;const strokes=[];
 for(const character of text){const paths=character==='-'?[p([[5,55],[42,55]])]:character==='.'?[p([[12,105]])]:traces[character];
  for(const points of paths)strokes.push({id:++id,points:points.map(point=>({x:(point.x+offset)*scale+x,y:point.y*scale+y}))});offset+=character==='.'?35:character==='-'?65:90;
 }return strokes;
}
