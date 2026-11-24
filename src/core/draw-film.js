import {shotAt,transitionAlpha} from './timeline.js';
import {RENDERERS} from '../templates/registry.js';
import {drawChapter} from '../templates/blockchain-chapter.js';
import {text,roundedBox} from '../visual/primitives.js';
export function wrapCaption(value,max=34){
 const lines=[];let line='';
 for(const word of value.split(/\s+/)){if(line&&(line.length+1+word.length)>max){lines.push(line);line='';}line+=(line?' ':'')+word;}if(line)lines.push(line);return lines;
}
export function drawFilm(ctx,scene,timeline,frame,width,height){
 if(scene.version===1){RENDERERS[scene.template](ctx,frame/30,width,height,scene);return;}
 const a=shotAt(timeline,frame),s=scene.shots[a.index],p=a.progress;
 if(s.template==='blockchain-chapter')drawChapter(ctx,p,width,height,s,a.index,scene.shots.length);
 else RENDERERS[s.template](ctx,a.local/(a.shot.endFrame-a.shot.startFrame)*12,width,height,{copy:s.copy,captions:[]});
 const opacity=transitionAlpha(timeline,a.index,a.local);
 if(opacity>0){ctx.save();ctx.globalAlpha=opacity;ctx.fillStyle='#07111f';ctx.fillRect(0,0,width,height);ctx.restore();}
 if(a.caption){ctx.save();ctx.scale(width/720,height/1280);const lines=wrapCaption(a.caption),size=lines.length>3?24:29,h=lines.length*(size+9)+30;
 roundedBox(ctx,42,1171-h,636,h,14,'rgba(5,15,28,.93)','#567485');lines.forEach((l,i)=>text(ctx,l,360,1171-h+22+size/2+i*(size+9),size,'#f5f9ff',700,'Arial',600));ctx.restore();}
}
