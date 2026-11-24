import {compilePackedShot,verifyPack} from '../foundry/packs.js';
import {validateProject} from '../core/timeline.js';
import {foundryShortlist} from './index.js';
export function compilePackedStory(story,packs,backend='cpu'){
 if(story.version!==1||!Array.isArray(story.shots)||story.shots.length!==6||!Array.isArray(story.packs)||story.packs.length!==2||packs.length!==2||!['cpu','three'].includes(backend))throw Error('packed story contract');
 if(new Set(story.packs).size!==2||new Set(packs.map(p=>p.id)).size!==2)throw Error('duplicate authored pack');
 for(const p of packs)verifyPack(p);
 if(!story.packs.every(id=>packs.some(p=>p.id===id)))throw Error('missing authored pack');
 if(story.packPins!==undefined){
  if(!Array.isArray(story.packPins)||story.packPins.length!==2||new Set(story.packPins.map(p=>p.id)).size!==2)throw Error('invalid pack pins');
  for(const pin of story.packPins){const p=packs.find(x=>x.id===pin.id);if(!p||p.revision!==pin.revision||p.digest!==pin.digest)throw Error('pinned pack dependency mismatch');}
 }
 for(const s of story.shots)if(typeof s.prop!=='string'||!packs.find(p=>p.id===story.packs[1]).entries.some(e=>e.id===s.prop))throw Error('missing authored prop '+s.prop);
 const pin=(pack,id,assetId,tracks,lod)=>{const p=packs.find(x=>x.id===pack),e=p?.entries.find(x=>x.id===id);if(!e)throw Error('missing authored asset '+id);return {id:assetId,pack,packDigest:p.digest,asset:id,revision:e.revision,digest:e.digest,tracks,lod}};
 const shots=story.shots.map((s,i)=>compilePackedShot({id:'shot-'+(i+1),template:'cinematic-graph',backend,durationFrames:150,transitionFrames:i?8:0,heading:s.heading,subheading:s.subheading,environment:s.environment,camera:{x:[[0,i%2?-1.1:1.4],[1,.25]],y:[[0,3.2],[1,2.7]],z:[[0,8.2],[1,7.3]],zoom:[[0,1150],[1,1300]]},cameraRig:{preset:'medium',framing:'medium',strength:.8,padding:.15},assets:[pin(story.packs[0],'retro-robot','explorer',{x:[[0,-1.1],[1,-.8]],scale:[[0,.88]],headYaw:[[0,-.15],[1,.25]]},1),pin(story.packs[1],s.prop,'relay',{x:[[0,.8]],scale:[[0,1.15]],yaw:[[0,s.yaw],[1,s.yaw+.5]]},0)],effects:[],narration:[s.narration],fidelity:{bloom:.2,atmosphere:.2,contactShadow:.7,surfaceDetail:.65,depthOfField:.04,motionBlur:0,grain:.08,grade:.25,particles:0,typography:1}},packs));
 return validateProject({version:2,id:story.id+'-'+backend+'-polished',title:story.title,voice:story.voice,shots});
}
export function packedDirectorSelection(query,registry){return foundryShortlist(query,registry)}
