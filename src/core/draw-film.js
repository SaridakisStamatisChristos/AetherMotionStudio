import {shotAt,transitionAlpha} from './timeline.js';
import {RENDERERS} from '../templates/registry.js';
import {drawGraph} from '../visual/draw-graph.js';
import {drawChapter} from '../templates/blockchain-chapter.js';
import {text,roundedBox} from '../visual/primitives.js';
export function wrapCaption(value,max=34){
 const lines=[];let line='';
 for(const word of value.split(/\s+/)){if(line&&(line.length+1+word.length)>max){lines.push(line);line='';}line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;
}
export function drawFilm(ctx,scene,timeline,frame,width,height,three=null){
 if(scene.version===1){RENDERERS[scene.template](ctx,frame/30,width,height,scene);return;}
 const a=shotAt(timeline,frame),s=scene.shots[a.index],p=a.progress;
 if(s.template==='blockchain-chapter')drawChapter(ctx,p,width,height,s,a.index,scene.shots.length);
 else if(s.template==='cinematic-graph')drawGraph(ctx,p,width,height,s,three,a.shot.endFrame-a.shot.startFrame);
 else RENDERERS[s.template](ctx,a.local/(a.shot.endFrame-a.shot.startFrame)*12,width,height,{copy:s.copy,captions:[]});
 const incoming=a.shot.transitionFrames,outgoing=timeline.shots[a.index+1]?.transitionFrames??0,n=a.shot.endFrame-a.shot.startFrame;
 const inAlpha=incoming?Math.max(0,1-a.local/incoming):0,outAlpha=outgoing?Math.max(0,1-(n-1-a.local)/outgoing):0;
 const style=(inAlpha>=outAlpha?s.transition:scene.shots[a.index+1]?.transition)??'fade';
 const opacity=transitionAlpha(timeline,a.index,a.local);
 if(opacity>0){ctx.save();ctx.fillStyle='#07111f';if(style==='wipe'||style==='slide'){const w=width*opacity;ctx.fillRect(inAlpha>=outAlpha?0:width-w,0,w,height);}else if(style==='match'){ctx.globalAlpha=opacity*.36;ctx.fillRect(0,0,width,height);}else{ctx.globalAlpha=opacity;ctx.fillRect(0,0,width,height);}ctx.restore();}
 if(a.caption){ctx.save();ctx.scale(width/720,height/1280);const lines=wrapCaption(a.caption),size=lines.length>3?24:29,h=lines.length*(size+9)+30;
 roundedBox(ctx,42,1171-h,636,h,14,'rgba(5,15,28,.93)','#567485');lines.forEach((l,i)=>text(ctx,l,360,1171-h+22+size/2+i*(size+9),size,'#f5f9ff',700,'Arial',600));ctx.restore();}
}
