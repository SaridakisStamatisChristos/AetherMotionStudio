import {compactIdentities} from '../core/identity.js';
const trunc=(s,n)=>s.length<=n?s:s.slice(0,n-1).trimEnd()+'…';
export function deliveryBeats(q){
 const cast=compactIdentities(q),c=cast.find(x=>x.kind==='character'),p=cast.find(x=>x.kind==='prop'),[a,b]=cast.filter(x=>x.kind==='environment');
 const beat=(heading,subheading,narration)=>({heading,subheading:trunc(subheading,64),narration:[trunc(narration,180)],assets:[]});
 return [
 beat('THE ASSIGNMENT',a.name,c.name+' receives a mission at '+a.name+'. The task is to deliver '+p.name+' safely to '+b.name+'.'),
 beat('PICK UP',p.name,c.name+' reaches for '+p.name+' and takes hold. The journey can now begin.'),
 beat('THE JOURNEY',b.name,c.name+' carries '+p.name+' to '+b.name+'. The same companion and cargo continue into a new place.'),
 beat('CHECK THE CARGO','Prepare for delivery',c.name+' checks '+p.name+' before the final handoff. Everything is ready to complete the mission.'),
 beat('MISSION COMPLETE','Delivery secured',c.name+' releases '+p.name+' at the destination. The journey is complete, and the cargo is safe.')];
}
export function applyIdentityStory(q,plan,ir){
 const cast=compactIdentities(q),characters=cast.filter(d=>d.kind==='character'),props=cast.filter(d=>d.kind==='prop'),locations=cast.filter(d=>d.kind==='environment');
 for(const [i,s] of ir.shots.entries()){
  const c=characters[0],p=props[0],delivery=q.story==='delivery',loc=locations[delivery&&i>=2?1:0],variant=delivery&&i>=3&&c.variants.includes('active')?'active':'base';
  const action=delivery?['idle','reach','walk','carry','release'][i]:(c.rig.channels.includes('walking')&&i%2?'walk':'idle');
  s.assets=[{identity:c.id,variant,action,x:-.45,scale:1.15}];
  if(delivery){
   const prop={identity:p.id,variant:'base',action:'presentation-turn',x:.65,scale:.6};
   if(i>=1){prop.action='idle';prop.hold={holder:c.id,anchor:'right-hand',start:i===1?.28:0,end:i===4?.72:1,offset:[.04,-.08,.08]};}
   s.assets.push(prop);
  }else for(const d of [...characters.slice(1),...props].slice(0,2))s.assets.push({identity:d.id,variant:'base',action:'presentation-turn',x:s.assets.length===1?1.2:-1.8,scale:.85});
  s.environment=loc.environment;s.location=loc.id;s.events=[];
  if(delivery&&i===2)s.events.push({type:'move',from:locations[0].id,to:loc.id});
  if(delivery&&i===3&&variant!=='base')s.events.push({type:'variant',identity:c.id,from:'base',to:variant});
  if(delivery&&i===1)s.events.push({type:'pickup',prop:p.id,holder:c.id,anchor:'right-hand',at:.28});
  if(delivery&&i===4)s.events.push({type:'release',prop:p.id,holder:c.id,anchor:'right-hand',at:.72});
  if(delivery){s.camera=['establishing','dolly-in','lateral-tracking','orbit','pull-back'][i];s.overlay={type:'lower-third',slot:'lower',text:trunc(c.name+' / '+loc.name,56),start:.18,end:.9,animation:'slide'};}
 }
 return ir;
}
