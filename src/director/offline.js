import {retrieveAssets} from './catalog.js';
const beat=(heading,subheading,narration,assets)=>({heading,subheading,narration:[narration],assets});
// Finite, explicitly authored knowledge patterns; no claim of universal topic comprehension.
const patterns=[
 {match:/\b(network|internet|packet|computer messages|computer communication)\b/i,beats:[
 beat('A MESSAGE BEGINS','One device needs to reach another','A computer turns your message into digital data. To reach another device, that data needs a network.',['laptop','desktop-computer']),
 beat('BREAK INTO PACKETS','Small pieces travel independently','Network protocols divide data into manageable packets. Each packet carries information that helps it reach the destination.',['network-switch','server-rack']),
 beat('CHOOSE A PATH','Routers forward packets','Routers examine destination information and forward packets toward the next network. Different packets may take different paths.',['router','graph-network']),
 beat('ACROSS THE NETWORK','Links carry signals','Signals move over wired or wireless links. Network equipment passes the packets from one connection to the next.',['communication-tower','satellite-dish']),
 beat('REBUILD THE MESSAGE','Protocols manage delivery','At the destination, protocols can detect missing pieces and put received data in order, depending on the transport protocol.',['server-rack','data-storage']),
 beat('CONNECTION COMPLETE','Many systems cooperate','The result is communication between devices. Standards allow different computers and networks to work together.',['desktop-computer','smartphone'])
 ]},
 {match:/\b(solar|sunlight|photovoltaic)\b/i,beats:[
 beat('CAPTURE LIGHT','Solar cells collect energy','Photovoltaic cells convert a portion of incoming sunlight into electricity.',['solar-panel','energy-core']),
 beat('STORE ENERGY','Supply and demand vary','A battery can store electrical energy for use when sunlight is less available.',['battery-stack','power-supply']),
 beat('DELIVER POWER','Connect generation and demand','Electrical equipment connects the generated power to compatible loads and the grid.',['transformer','cottage'])
 ]},
 {match:/\b(molecule|molecular|water molecules)\b/i,beats:[
 beat('MATTER AT SMALL SCALE','Atoms are building blocks','Atoms combine into molecules through chemical bonds.',['atom-model','molecule-water']),
 beat('STRUCTURE MATTERS','Different arrangements','The atoms in a molecule and their arrangement help determine its properties.',['molecule-water','molecule-methane']),
 beat('MODEL THE INVISIBLE','A simplified representation','Molecular models help us reason about structures that we cannot see directly.',['molecule-dioxide','microscope'])
 ]},
 {match:/\b(bridge|bridges)\b/i,beats:[
 beat('CROSSING A GAP','Structures connect places','A bridge creates a route across an obstacle such as a river or valley.',['beam-bridge','rock-cluster']),
 beat('CARRY THE LOAD','Forces travel through the structure','Different bridge designs distribute loads through beams, arches, cables and supports.',['arch-bridge','suspension-bridge']),
 beat('BUILD FOR USE','Design meets the site','Engineers consider loads, materials and site conditions when choosing a bridge design.',['suspension-bridge','compact-car'])
 ]},
 {match:/\b(supply chain|logistics|shipping)\b/i,beats:[
 beat('FROM SOURCE','Goods enter a supply chain','A supply chain connects suppliers, production, storage and customers.',['factory','package']),
 beat('MOVE AND STORE','Coordinate inventory and transport','Warehouses hold goods while transport connects the different stages.',['warehouse','freight-truck']),
 beat('DELIVER VALUE','Coordinate supply with demand','Information about inventory and demand helps organizations plan deliveries and reduce delays.',['delivery-van','shipping-pallet'])
 ]}
];
const trunc=(s,n)=>s.length<=n?s:s.slice(0,n-1).trimEnd()+'…';
const roles=['Introduction','Context','Key idea','How it works','Connections','Implications','Summary'];
export function splitScript(text){
 const words=text.split(' '),out=[];let line='';
 for(const w of words){if(w.length>180)throw Error('request.script: individual word exceeds phrase limit');if(line&&(line.length+w.length+1>145||/[.!?]$/.test(line))){out.push(line);line='';}line+=(line?' ':'')+w;}if(line)out.push(line);return out;
}
function group(arr,n){return Array.from({length:n},(_,i)=>arr.slice(Math.floor(i*arr.length/n),Math.floor((i+1)*arr.length/n)));}
export function baseline(q){
 const nominal=Math.max(2,Math.min(30,Math.round(q.seconds/10)));
 let beats,kind='generic-question-outline';
 const pattern=patterns.find(p=>p.match.test(q.topic));
 if(q.script!==undefined){
  const phrases=splitScript(q.script),n=Math.max(1,Math.min(nominal,phrases.length));
  if(phrases.length>n*8)throw Error('request.script: too many phrases for requested duration');
  beats=group(phrases,n).map((narration,i)=>({heading:trunc(roles[Math.min(roles.length-1,Math.floor(i*roles.length/n))].toUpperCase(),42),subheading:trunc(narration[0],64),narration,assets:[]}));
  kind='supplied-script';
 }else if(pattern){
  const n=Math.min(nominal,pattern.beats.length);
  beats=group(pattern.beats,n).map(g=>({heading:g[0].heading,subheading:g[0].subheading,narration:g.flatMap(b=>b.narration),assets:g.flatMap(b=>b.assets).slice(0,3)}));kind='curated-topic-pattern';
 }else{
  const topic=trunc(q.topic,65),questions=['What is the central idea?','What are its main components?','How do those components relate?','What evidence would help us understand it?','What questions remain?','What should we remember?'];
  const n=Math.min(nominal,questions.length);
  beats=Array.from({length:n},(_,i)=>({heading:roles[i].toUpperCase(),subheading:trunc(q.topic,64),narration:[i===0?'Let us explore '+topic+'. '+questions[i]:questions[i]],assets:[]}));
 }
 const selection=beats.map(b=>retrieveAssets(q.topic+' '+b.heading+' '+b.narration.join(' '),8,[...b.assets,'retro-robot']));
 return {kind,beats,selection};
}
const cameras=['establishing','dolly-in','lateral-tracking','orbit','crane','reveal'];
export function offlineIR(q,plan){
 const n=plan.beats.length;
 return {version:1,title:trunc(q.topic,100),treatment:'A '+q.tone+' '+q.style+' for '+q.audience+'. '+(plan.kind==='generic-question-outline'?'Question-led outline, not factual topic synthesis.':'A structured sequence of explanatory beats.'),shots:plan.beats.map((b,i)=>{
  const selected=plan.selection[i],preferred=b.assets.filter((v,j,a)=>a.indexOf(v)===j);
  const objects=(preferred.length?preferred:selected.filter(o=>o.id!=='retro-robot').slice(0,1).map(o=>o.id)).slice(0,2);
  const assets=objects.map((asset,j)=>({asset,action:j===0?'presentation-turn':'idle',scale:objects.length===1?1.15:.86,x:objects.length===1?.5:j===0?-.1:1.35}));
  assets.push({asset:'retro-robot',action:i===0?'wave':i%2?'point':'inspect',x:-1.5,scale:.72});
  return {heading:b.heading,subheading:b.subheading,narration:b.narration,camera:cameras[(i+q.seed%cameras.length)%cameras.length],environment:q.style.toLowerCase().includes('warm')?'amber':i%2?'midnight':'laboratory',assets,effect:i%2?'cyan-aura':'gold-sparks',overlay:{type:'lower-third',slot:'lower',text:trunc(b.subheading,56),animation:'slide',start:.18,end:.93}};
 })};
}
