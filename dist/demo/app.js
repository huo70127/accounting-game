// The stall code is not loaded until all ten baseline questions are completed.
import {setupAssessment} from './assessment-ui.js';
let runtimeStarted=false;
const learning=setupAssessment({storage:globalThis.localStorage,onEnter:async()=>{
 if(runtimeStarted)return;
 const {startGame}=await import('./game.js');
 startGame(learning);runtimeStarted=true;
}});
await learning.start();
