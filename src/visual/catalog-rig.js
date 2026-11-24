import {RECIPES} from './catalog-data.js';
import {add,rx,ry,rz} from './vectors.js';
const specs=new Map(Object.values(RECIPES).flat().map(([id,family,args])=>[id,Object.freeze({family,args:Object.freeze([...args])})]));
export const recipeSpec=id=>specs.get(id);
export const hasHands=id=>id==='retro-robot'||['robot','human'].includes(recipeSpec(id)?.family);
export function localArm(family,args,s,pose){
 const [w,h]=args,open=pose.open??0;
 const shoulder=family==='robot'?[s*w*.63,h*.64,0]:[s*w*.57,h*.78,0];
 const rest=family==='robot'?[s*w*(.78+.28*open),h*(.35+.14*open),.08]:[s*w*(.65+open*.2),h*(.45+open*.2),.12];
 const pitch=s===1?(pose.armPitch??0):0,spread=s===1?(pose.armSpread??0):0;
 return {shoulder,hand:pitch||spread?add(rz(rx(rest.map((v,i)=>v-shoulder[i]),pitch),spread),shoulder):rest};
}
export function catalogHandAnchor(id,pose,s=1){
 const q=recipeSpec(id);if(!q||!hasHands(id))throw Error('unsupported hand anchor');
 const {hand}=localArm(q.family,q.args,s,pose),p=pose.params??{};
 return add(ry(hand.map((v,i)=>v*(pose.scale??1)*([p.width??1,p.height??1,p.depth??1][i])),pose.yaw??0),pose.origin??[0,0,0]);
}
export function recipeRig(id){
 const family=recipeSpec(id)?.family??'legacy',root=['x','y','z','yaw','scale'],arm=['armPitch','armSpread','grip'];
 const channels=id==='retro-robot'?[...root,'walking','open','headRoll','headYaw','blink',...arm]:id==='treasure-chest'?[...root,'open']:id==='energy-core'?[...root,'pulse']:family==='robot'?[...root,'walking','open','blink',...arm]:family==='human'?[...root,'walking','open',...arm]:family==='animal'?[...root,'walking']:root;
 const components=hasHands(id)?[{id:'root',parent:null},{id:'body',parent:'root'},{id:'head',parent:'body'},{id:'left-arm',parent:'body'},{id:'left-hand',parent:'left-arm'},{id:'right-arm',parent:'body'},{id:'right-hand',parent:'right-arm'}]:[{id:'root',parent:null}];
 return {family,channels,anchors:hasHands(id)?['right-hand','left-hand']:['origin'],components};
}
