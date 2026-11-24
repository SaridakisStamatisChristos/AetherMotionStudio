import {localArm,recipeSpec} from '../visual/catalog-rig.js';
import {rx,ry,rz,add,sub,norm,cross} from '../visual/vectors.js';
export const HERO_PROFILE='foundry-af04';
const PI=Math.PI,T=2*PI,identity=p=>p,rotate=(p,o,a,axis=rx)=>add(axis(sub(p,o),a),o);
const rows=[
['retro-robot','characters','Retro explorer robot','retro-lab','head,left-hand,right-hand'],
['industrial-robot','characters','Industrial helper robot','retro-lab','head,left-hand,right-hand'],
['astronaut','characters','Astronaut','science-studio','helmet,left-hand,right-hand'],
['scientist','characters','Stylized scientist','retro-lab','head,left-hand,right-hand'],
['crt-monitor','technology','CRT computer','retro-lab','screen,controls'],
['laptop','technology','Modern laptop','premium-product','screen,keyboard,hinge'],
['server-rack','technology','Server rack','retro-lab','front-panel'],
['robot-arm','technology','Articulated robotic arm','retro-lab','tool,base'],
['armchair','everyday','Leather armchair','everyday','seat'],
['desk','everyday','Wooden writing desk','retro-lab','worktop'],
['dslr-camera','everyday','Classic camera','premium-product','lens,shutter'],
['mechanical-watch','everyday','Mechanical wristwatch','premium-product','crown,dial'],
['townhouse','architecture','Modern house','smart-city','entry'],
['skyscraper','architecture','Brutalist tower','smart-city','entry'],
['temple','architecture','Classical temple','smart-city','entry'],
['laboratory-module','architecture','Industrial laboratory module','retro-lab','entry,worktop'],
['oak-tree','nature','Detailed oak tree','smart-city','trunk'],
['pine-tree','nature','Pine tree','smart-city','trunk'],
['rock-cluster','nature','Rocky terrain','science-studio','surface'],
['island','nature','Miniature island','science-studio','shore'],
['sports-car','vehicles','Sports car','smart-city','driver'],
['pickup-truck','vehicles','Utility truck','smart-city','bed'],
['airplane','vehicles','Airplane','smart-city','cockpit'],
['sailboat','vehicles','Sailboat','smart-city','deck'],
['dna-helix','science','DNA double helix','science-studio','axis'],
['atom-model','science','Atom model','retro-lab','nucleus'],
['microscope','science','Microscope','retro-lab','stage,eyepiece'],
['space-telescope','science','Space telescope','science-studio','aperture'],
['gold-bars','business','Gold bullion','premium-product','top'],
['vault-door','business','Bank vault','smart-city','handle'],
['shipping-container','business','Shipping container','smart-city','doors'],
['kpi-dashboard','business','Premium dashboard kiosk','retro-lab','screen']];
export const HERO_REGISTRY=Object.freeze(Object.fromEntries(rows.map(([id,category,name,pack,anchors])=>[id,Object.freeze({id,category,name,pack,revision:'hero-1.0.0',anchors:Object.freeze(['origin','ground',...anchors.split(',')]),provenance:'original procedural design',license:'project-policy',quality:'candidate'})])));
export const HERO_IDS=Object.freeze(rows.map(x=>x[0]));
export const HERO_NEW_IDS=Object.freeze(['mechanical-watch','laboratory-module','space-telescope','shipping-container']);
export const HERO_PACKS=Object.freeze(Object.fromEntries([...new Set(rows.map(x=>x[3]))].map(p=>[p,Object.freeze(rows.filter(r=>r[3]===p).map(r=>r[0]))])));
export function heroDefinition(id,pose={}){
 if(!Object.hasOwn(HERO_REGISTRY,id))throw Error('unknown hero');
 const parts=[],anchors={origin:[0,0,0],ground:[0,0,0]},names=new Set();
 function part(name,shape,at,size,role,rotation=[0,0,0],tf=identity,pivot=at){if(names.has(name))throw Error('duplicate component '+name);names.add(name);const rot=q=>rz(ry(rx(q,rotation[0]),rotation[1]),rotation[2]),origin=tf(at),axes=[0,1,2].map(j=>{const v=[0,0,0];v[j]=size[j];return sub(tf(add(at,rot(v))),origin)});parts.push({name,shape,origin,axes,role,pivot:tf(pivot)});}
 const shape=t=>(...args)=>part(args[0],t,...args.slice(1)),b=shape('bevel'),q=shape('box'),s=shape('sphere'),c=shape('cylinder'),r=shape('ring'),w=shape('wedge'),roof=shape('roof'),cone=shape('cone');
 const an=(k,v)=>{anchors[k]=v},front=[PI/2,0,0],side=[0,0,PI/2];
 function rod(n,a,z,d,m){const v=sub(z,a),len=Math.hypot(...v),y=norm(v),x=norm(cross(y,Math.abs(y[1])>.9?[0,0,1]:[0,1,0])),zz=cross(x,y);if(names.has(n)||len<1e-6)throw Error('invalid rod '+n);names.add(n);parts.push({name:n,shape:'cylinder',origin:a.map((v,i)=>(v+z[i])/2),axes:[x.map(v=>v*d),y.map(v=>v*len),zz.map(v=>v*d)],role:m,pivot:a});}
 switch(id){
 case 'retro-robot':{
 const ht=v=>add(ry(rz(v,pose.headRoll??0),pose.headYaw??0),[0,1.81,0]);
 b('torso',[0,.91,0],[.78,.68,.57],'coral');b('chest-bezel',[0,.94,.30],[.49,.34,.08],'dark');b('indicator',[0,.98,.35],[.25,.055,.025],'cyan');c('neck',[0,1.29,0],[.31,.16,.31],'steel');
 for(const j of [-1,1]){const k=j===1?'r':'l',leg=v=>add(rx(v,j*(pose.walking??0)*.4),[j*.22,.62,0]),arm=v=>add(rz(rx(v,-.22*j*(pose.walking??0)-.52*(pose.open??0)*(j===1?1:0)+(j===1?(pose.armPitch??0):0)),j*(.19+.25*(pose.open??0)+(j===1?(pose.armSpread??0):0))),[j*.49,1.18,0]);
 b(k+'-shin',[0,-.21,0],[.27,.55,.29],'dark',undefined,leg,[0,0,0]);b(k+'-boot',[0,-.47,.11],[.38,.19,.55],'steel',undefined,leg,[0,0,0]);s(k+'-shoulder',[0,0,0],[.27,.27,.27],'steel',undefined,arm);b(k+'-arm',[0,-.20,0],[.23,.45,.25],'steel',undefined,arm,[0,0,0]);b(k+'-hand',[0,-.48,.02],[.28,.23,.28],'ivory',undefined,arm,[0,0,0]);for(const f of [-1,1])b(k+'-finger'+f,[f*(.13-.055*(pose.grip??.3)),-.59,.07],[.065,.13,.075],'dark',undefined,arm,[0,-.48,.02]);an(k==='r'?'right-hand':'left-hand',arm([0,-.48,.02]));}
 b('head',[0,0,0],[1.08,.86,.88],'ivory',undefined,ht,[0,0,0]);b('face-gasket',[0,0,.448],[.94,.72,.075],'dark',undefined,ht);b('face-panel',[0,0,.49],[.81,.60,.045],'coral',undefined,ht);
 for(const j of [-1,1]){b('eye'+j,[j*.21,.105,.522],[.13,.24*(j===-1?(pose.blink??1):1),.023],'cyan',undefined,ht);c('ear'+j,[j*.56,.04,-.04],[.28,.10,.28],'steel',side,ht);for(let i=0;i<3;i++)b('vent'+j+i,[j*.40,-.13+i*.07,-.45],[.075,.022,.018],'dark',undefined,ht);}
 b('mouth',[0,-.15,.522],[.44,.12,.024],'dark',undefined,ht);for(let i=0;i<5;i++)b('grille'+i,[-.16+i*.08,-.145,.54],[.045,.048,.016],'ivory',undefined,ht);c('antenna',[.1,.49,-.07],[.055,.21,.055],'steel',undefined,ht);s('antenna-tip',[.1,.61,-.07],[.12,.12,.12],'amber',undefined,ht);an('head',ht([0,0,0]));break;}
 case 'industrial-robot':case 'astronaut':case 'scientist':{
 const spec=recipeSpec(id),[width,h]=spec.args,robot=id==='industrial-robot',astro=id==='astronaut',body=robot?'amber':'ivory',trim=robot?'dark':'blue';
 b('pelvis',[0,h*.47,0],[width*.64,h*.20,.43],trim);b('torso',[0,h*.66,0],[width*.90,h*.33,.53],body);b('chest-panel',[0,h*.68,.285],[width*.58,h*.18,.06],trim);
 for(let i=0;i<3;i++)b('chest-detail'+i,[-width*.19+i*width*.19,h*.69,.325],[.07,.08,.025],robot?'cyan':astro?'amber':'steel');
 for(const j of [-1,1]){const k=j===1?'r':'l',leg=v=>rotate(v,[j*width*.23,h*.44,0],j*(pose.walking??0)*.26);b(k+'-thigh',[j*width*.23,h*.34,0],[width*.31,h*.25,.32],trim,undefined,leg,[j*width*.23,h*.44,0]);s(k+'-knee',[j*width*.23,h*.22,.02],[.22,.23,.22],robot?'steel':body,undefined,leg);b(k+'-shin',[j*width*.23,h*.12,0],[width*.29,h*.19,.31],body,undefined,leg);b(k+'-boot',[j*width*.23,.10,.10],[width*.38,.20,.47],'dark',undefined,leg);
 const {shoulder,hand}=localArm(spec.family,spec.args,j,pose),elbow=shoulder.map((v,i)=>(v+hand[i])/2);s(k+'-joint',shoulder,[.30,.30,.30],robot?'steel':body);rod(k+'-upper',shoulder,elbow,width*.27,body);s(k+'-elbow',elbow,[.20,.20,.20],trim);rod(k+'-forearm',elbow,hand,width*.25,body);s(k+'-glove',hand,[.21,.22,.20],robot?'steel':astro?'dark':'skin');an(j===1?'right-hand':'left-hand',hand);}
 if(robot){b('head',[0,h*.88,0],[width*.76,h*.23,.54],'amber');b('visor',[0,h*.90,.28],[width*.62,.18,.06],'dark');for(const j of [-1,1])b('optic'+j,[j*width*.16,h*.90,.322],[.11,.07,.025],'cyan');b('backpack',[0,h*.66,-.34],[width*.64,.47,.22],'steel');}
 else if(astro){s('helmet',[0,h*.89,0],[width*.81,h*.28,.70],'ivory');s('visor',[0,h*.90,.22],[width*.70,h*.20,.45],'visor');r('neck-seal',[0,h*.77,0],[.56,.31,.54],'dark');b('life-support',[0,h*.66,-.36],[width*.65,.55,.30],'ivory');for(const j of [-1,1])c('tank'+j,[j*.17,h*.65,-.52],[.19,.46,.19],'steel');}
 else{s('head',[0,h*.89,0],[.40,.49,.39],'skin');s('hair',[0,h*.99,-.025],[.43,.22,.42],'dark');for(const j of [-1,1]){r('spectacle'+j,[j*.095,h*.91,.183],[.16,.16,.16],'dark',front);s('eye'+j,[j*.095,h*.91,.201],[.042,.040,.025],'dark');}b('glasses-bridge',[0,h*.91,.207],[.065,.025,.02],'dark');b('tie',[0,h*.70,.302],[.07,.25,.035],'coral');for(const j of [-1,1])w('lapel'+j,[j*.14,h*.71,.292],[.18,.34,.035],'steel',[0,0,j*.15]);}
 an(astro?'helmet':'head',[0,h*.89,0]);break;}
 case 'crt-monitor':
 b('foot',[0,.075,0],[.78,.15,.63],'dark');c('swivel',[0,.18,0],[.40,.15,.40],'steel');b('cabinet',[0,.74,-.08],[1.19,1.01,.83],'ivory');b('front-frame',[0,.74,.36],[1.13,.91,.12],'dark');b('screen',[0,.78,.435],[.91,.68,.085],'screen');for(let i=0;i<5;i++)b('scanline'+i,[0,.54+i*.105,.482],[.80,.013,.01],'cyan');for(let i=0;i<6;i++)q('side-vent'+i,[.601,.45+i*.075,-.09],[.016,.025,.49],'dark');for(let i=0;i<3;i++)c('button'+i,[.27+i*.10,.30,.439],[.055,.045,.055],'steel',front);b('power-led',[-.37,.30,.44],[.048,.035,.025],'cyan');an('screen',[0,.78,.48]);an('controls',[.37,.30,.45]);break;
 case 'laptop':{
 b('base',[0,.066,.16],[1.55,.132,1.02],'steel');b('keyboard-well',[0,.14,.10],[1.31,.035,.63],'dark');for(let row=0;row<4;row++)for(let col=0;col<9;col++)b('key'+row+'-'+col,[-.55+col*.137,.165,-.12+row*.135],[.112,.033,.105],'rubber');b('touchpad',[0,.14,.49],[.45,.026,.25],'blue');const hinge=[0,.14,-.34],tf=v=>rotate(v,hinge,-.17-(pose.open??0)*.4);c('hinge',hinge,[.085,1.25,.085],'dark',side);b('lid',[0,.65,-.34],[1.55,1.02,.11],'steel',undefined,tf,hinge);b('bezel',[0,.65,-.272],[1.47,.95,.045],'dark',undefined,tf,hinge);b('display',[0,.66,-.24],[1.32,.78,.025],'screen',undefined,tf,hinge);b('status',[0,.27,-.218],[.68,.035,.016],'cyan',undefined,tf);an('screen',tf([0,.66,-.22]));an('keyboard',[0,.18,.1]);an('hinge',hinge);break;}
 case 'server-rack':
 b('plinth',[0,.08,0],[.97,.16,.86],'dark');b('housing',[0,1.14,0],[.93,2.12,.84],'steel');b('inset',[0,1.13,.432],[.78,1.94,.06],'dark');for(let row=0;row<7;row++){const y=.27+row*.255;b('blade'+row,[0,y,.48],[.70,.215,.085],'blue');for(let i=0;i<4;i++)q('vent'+row+'-'+i,[-.25+i*.105,y,.53],[.075,.105,.015],'dark');b('handle'+row,[.27,y,.55],[.075,.15,.05],'steel');b('led'+row,[.17,y+.055,.535],[.035,.025,.015],row%3?'cyan':'amber');}for(const j of [-1,1])b('rail'+j,[j*.42,1.13,.49],[.055,1.95,.05],'steel');an('front-panel',[0,1.13,.55]);break;
 case 'robot-arm':{
 c('base',[0,.10,0],[.78,.20,.78],'dark');c('turret',[0,.28,0],[.57,.22,.57],'steel');const a=[0,.47,0],el=[-.30,.98,.04],tip=[.32,1.45-(pose.open??0)*.36,.22];s('shoulder',a,[.32,.32,.32],'steel');rod('lower-link',a,el,.27,'amber');s('elbow',el,[.33,.33,.33],'dark');rod('upper-link',el,tip,.22,'amber');s('wrist',tip,[.25,.25,.25],'steel');rod('tool-neck',tip,add(tip,[.18,-.16,.04]),.13,'dark');for(const j of [-1,1])b('jaw'+j,add(tip,[.23,-.23,j*.095]),[.21,.11,.07],'steel',[0,0,-.65]);an('tool',add(tip,[.32,-.23,0]));an('base',[0,.2,0]);break;}
 case 'armchair':
 for(const x of [-1,1])for(const z of [-1,1])b('leg'+x+z,[x*.42,.12,z*.38],[.13,.24,.13],'wood');b('seat-frame',[0,.30,0],[1.09,.24,1.02],'leather');b('seat-cushion',[0,.45,.10],[.83,.24,.77],'leather-light');b('back',[0,.83,-.39],[1.06,.90,.25],'leather',[.12,0,0]);b('back-cushion',[0,.85,-.20],[.82,.67,.27],'leather-light',[.12,0,0]);for(const j of [-1,1]){b('arm'+j,[j*.49,.68,.07],[.25,.43,.94],'leather');b('arm-pad'+j,[j*.49,.88,.10],[.28,.13,.90],'leather-light');}for(let i=0;i<3;i++)s('tuft'+i,[-.23+i*.23,.93,-.034],[.052,.052,.027],'wood');an('seat',[0,.58,.10]);break;
 case 'desk':
 b('worktop',[0,.94,0],[1.70,.12,.93],'wood');b('front-edge',[0,.925,.48],[1.74,.075,.04],'wood-dark');for(const x of [-1,1])for(const z of [-1,1])b('leg'+x+z,[x*.73,.45,z*.35],[.14,.90,.14],'wood-dark');b('modesty-panel',[0,.66,-.38],[1.39,.37,.095],'wood');for(let i=0;i<2;i++){b('drawer'+i,[-.43,.76-i*.16,.19],[.69,.15,.52],'wood');b('pull'+i,[-.43,.76-i*.16,.47],[.22,.04,.065],'steel');}b('crossbrace',[0,.28,-.36],[1.42,.10,.10],'wood-dark');an('worktop',[0,1,0]);break;
 case 'dslr-camera':
 b('body',[0,.41,0],[1.12,.73,.44],'dark');b('top-plate',[0,.79,0],[1.13,.12,.45],'steel');b('grip',[.46,.39,.14],[.29,.60,.46],'rubber');w('viewfinder',[0,.89,-.03],[.42,.22,.32],'dark');c('lens-base',[-.09,.45,.31],[.61,.20,.61],'steel',front);c('lens-barrel',[-.09,.45,.51],[.57,.28,.57],'dark',front);r('focus-ring',[-.09,.45,.58],[.64,.26,.64],'rubber',front);c('lens-front',[-.09,.45,.72],[.56,.09,.56],'steel',front);s('optical-glass',[-.09,.45,.781],[.45,.45,.10],'visor');for(const j of [-1,1])c('dial'+j,[j*.34,.88,-.03],[.17,.08,.17],'dark');b('shutter',[.43,.87,.14],[.10,.055,.10],'steel');b('rear-screen',[0,.43,-.24],[.61,.38,.025],'screen');an('lens',[-.09,.45,.83]);an('shutter',[.43,.90,.14]);break;
 case 'mechanical-watch':
 for(const j of [-1,1]){b('strap'+j,[0,.12,j*.59],[.48,.24,.65],'leather');for(let i=0;i<3;i++)q('stitch'+j+'-'+i,[.18,.247,j*(.40+i*.16)],[.022,.012,.08],'ivory');}c('case',[0,.26,0],[.87,.25,.87],'steel');r('bezel',[0,.39,0],[.88,.20,.88],'gold');c('dial',[0,.395,0],[.68,.04,.68],'dark');for(let i=0;i<12;i++){const a=i*T/12;b('marker'+i,[.275*Math.sin(a),.426,.275*Math.cos(a)],[.035,.028,.09],'ivory',[0,a,0]);}b('hour-hand',[.065,.444,.045],[.17,.025,.047],'gold',[0,-.6,0]);b('minute-hand',[-.08,.463,.06],[.25,.022,.032],'ivory',[0,.55,0]);c('pivot',[0,.472,0],[.065,.025,.065],'gold');c('crown',[.48,.26,0],[.15,.13,.15],'steel',side);an('crown',[.55,.26,0]);an('dial',[0,.49,0]);break;
 case 'townhouse':
 b('slab',[0,.07,0],[2.12,.14,1.50],'concrete');b('lower',[0,.55,0],[1.96,.82,1.29],'ivory');b('upper',[-.37,1.28,-.10],[1.18,.65,1.13],'concrete');b('cantilever',[.36,1.10,.12],[1.44,.10,1.37],'wood-dark');b('roof',[-.37,1.65,-.10],[1.34,.12,1.27],'dark');b('door',[-.64,.45,.665],[.32,.68,.04],'wood');for(let i=0;i<3;i++){b('window'+i,[.03+i*.33,.56,.666],[.27,.63,.045],'visor');b('upper-window'+i,[-.73+i*.36,1.31,.483],[.27,.39,.04],'visor');}for(const j of [-1,1])b('side-window'+j,[j*.995,.55,-.12],[.04,.57,.76],'visor');an('entry',[-.64,.15,.77]);break;
 case 'skyscraper':
 b('foundation',[0,.08,0],[1.44,.16,1.28],'concrete');b('core',[0,1.38,0],[1.12,2.44,.96],'concrete');for(let i=0;i<7;i++){const y=.29+i*.32;b('floor'+i,[0,y,0],[1.27,.10,1.09],'stone');for(const j of [-1,1]){b('front-window'+i+j,[j*.27,y+.13,.495],[.35,.18,.035],'visor');b('side-window'+i+j,[j*.575,y+.13,0],[.035,.18,.65],'visor');}}for(const j of [-1,1])b('buttress'+j,[j*.53,1.34,.51],[.17,2.38,.18],'concrete');b('penthouse',[0,2.69,0],[.64,.22,.53],'dark');b('entry',[0,.27,.58],[.32,.42,.06],'visor');an('entry',[0,.16,.65]);break;
 case 'temple':
 for(let i=0;i<3;i++)b('step'+i,[0,.055+i*.095,0],[2.18-i*.18,.11,1.59-i*.15],'stone');b('cella',[0,.77,0],[1.28,.93,.75],'ivory');for(const j of [-1,1])for(let i=0;i<4;i++){const x=-.77+i*.513,z=j*.51;c('column-base'+j+i,[x,.29,z],[.24,.09,.24],'stone');c('column'+j+i,[x,.74,z],[.16,.83,.16],'ivory');c('capital'+j+i,[x,1.18,z],[.25,.12,.25],'stone');}b('entablature',[0,1.31,0],[1.88,.20,1.27],'ivory');roof('pediment',[0,1.54,0],[1.94,.29,1.33],'stone');b('ridge',[0,1.69,0],[.08,.07,1.35],'ivory');b('entry',[0,.68,.40],[.31,.65,.05],'dark');an('entry',[0,.27,.72]);break;
 case 'laboratory-module':
 b('foundation',[0,.08,0],[2.23,.16,1.62],'dark');b('shell',[0,.79,0],[2.13,1.30,1.49],'ivory');b('roof',[0,1.47,0],[2.25,.15,1.58],'steel');for(const j of [-1,1])b('corner'+j,[j*1.04,.79,.74],[.13,1.32,.13],'amber');b('airlock',[.65,.69,.78],[.54,1.10,.08],'dark');b('airlock-window',[.65,.87,.835],[.34,.33,.035],'visor');b('observation-window',[-.38,.88,.78],[1.12,.61,.08],'visor');for(let i=0;i<3;i++)b('mullion'+i,[-.78+i*.38,.88,.835],[.055,.61,.035],'steel');for(let i=0;i<5;i++)b('roof-vent'+i,[-.60+i*.30,1.57,-.30],[.19,.09,.42],'dark');an('entry',[.65,.16,.87]);an('worktop',[-.38,.83,.88]);break;
 case 'oak-tree':
 c('trunk',[0,.60,0],[.26,1.20,.25],'wood-dark');for(let i=0;i<6;i++){const a=i*T/6,end=[.48*Math.cos(a),1.43+(i%2)*.12,.46*Math.sin(a)];rod('branch'+i,[0,.81+i*.04,0],end,.11,'wood-dark');s('crown'+i,add(end,[0,.13,0]),[.82,.78,.78],i%2?'leaf':'leaf-light');}s('crown-top',[0,1.88,0],[.94,.76,.91],'leaf');for(let i=0;i<4;i++){const a=i*T/4;rod('root'+i,[0,.13,0],[.32*Math.cos(a),.05,.32*Math.sin(a)],.10,'wood-dark');}an('trunk',[0,.35,0]);break;
 case 'pine-tree':
 c('trunk',[0,.54,0],[.19,1.08,.19],'wood-dark');for(let i=0;i<5;i++){const d=1.16-i*.17;cone('bough'+i,[0,.80+i*.28,0],[d,.70,d],i%2?'pine':'leaf');}an('trunk',[0,.25,0]);break;
 case 'rock-cluster':
 w('base',[0,.14,0],[1.84,.28,1.40],'stone');for(let i=0;i<8;i++){const a=i*2.4,d=.38+(i%3)*.11;w('boulder'+i,[Math.cos(a)*.48,.23+d*.34,Math.sin(a)*.42],[d,.49+d*.3,d*.86],i%3?'stone':'concrete',[.10*(i%3),a,.15*(i%2)]);}an('surface',[0,.25,0]);break;
 case 'island':
 w('bedrock',[0,.20,0],[2.14,.40,1.73],'stone');s('sand',[0,.38,0],[2.13,.35,1.64],'sand');s('meadow',[-.10,.52,-.05],[1.72,.36,1.23],'leaf');s('hill',[-.28,.69,-.17],[.87,.55,.79],'leaf-light');for(let i=0;i<3;i++){const x=.22+i*.20,z=-.28+i*.09;rod('palm'+i,[x,.55,z],[x-.07,.99+i*.05,z],.06,'wood-dark');for(let j=0;j<5;j++){const a=j*T/5;rod('frond'+i+'-'+j,[x-.07,.99+i*.05,z],[x-.07+.22*Math.cos(a),.92+i*.05,z+.22*Math.sin(a)],.055,'pine');}}an('shore',[.88,.42,0]);break;
 case 'sports-car':case 'pickup-truck':{
 const truck=id==='pickup-truck',color=truck?'blue':'coral',length=truck?2.04:1.97;
 b('chassis',[0,.28,0],[1.00,.27,length],'dark');b('body',[0,.43,0],[1.06,.32,length-.06],color);w('hood',[0,.54,.57],[1.02,.20,.75],color);w('cabin',[0,truck?.83:.70,truck?.18:-.12],[.82,truck?.58:.38,truck?.75:.84],'visor');b('roof',[0,truck?1.12:.89,truck?.18:-.12],[.74,.10,.56],color);for(const j of [-1,1]){for(const z of [-1,1]){const at=[j*.52,.235,z*.65];c('tyre'+j+z,at,[.47,.20,.47],'rubber',side);c('rim'+j+z,[j*.635,.235,z*.65],[.30,.06,.30],'steel',side);c('hub'+j+z,[j*.675,.235,z*.65],[.10,.025,.10],'dark',side);}b('headlight'+j,[j*.32,.48,.97],[.27,.11,.065],'ivory');b('taillight'+j,[j*.36,.46,-.97],[.23,.09,.05],'coral');b('mirror'+j,[j*.52,.72,.25],[.18,.095,.15],color);b('door-line'+j,[j*.54,.48,.08],[.018,.021,.52],'dark');}
 if(truck){b('bed-floor',[0,.58,-.63],[.82,.09,.62],'steel');for(const j of [-1,1])b('bed-wall'+j,[j*.45,.68,-.63],[.12,.29,.69],color);b('tailgate',[0,.68,-.95],[.86,.29,.09],color);an('bed',[0,.65,-.63]);}else{b('spoiler',[0,.71,-.80],[.94,.08,.23],'dark');b('front-grille',[0,.38,1.0],[.49,.13,.04],'dark');an('driver',[0,.68,.08]);}break;}
 case 'airplane':
 s('fuselage',[0,.56,0],[.43,.50,2.18],'ivory');s('nose',[0,.59,.95],[.38,.40,.49],'ivory');s('cockpit',[0,.73,.66],[.36,.25,.40],'visor');for(const j of [-1,1]){roof('wing'+j,[j*.67,.48,-.03],[1.36,.75,.09],'ivory',[PI/2,0,j*-.35]);s('engine'+j,[j*.51,.32,.05],[.25,.25,.63],'steel');c('inlet'+j,[j*.51,.32,.36],[.18,.045,.18],'dark',front);roof('tailplane'+j,[j*.32,.59,-.82],[.70,.40,.07],'ivory',[PI/2,0,j*-.32]);}roof('vertical-tail',[0,.92,-.79],[.64,.65,.10],'blue',[0,PI/2,0]);for(let i=0;i<5;i++)for(const j of [-1,1])b('window'+j+i,[j*.216,.61,.32-i*.16],[.018,.085,.09],'visor');for(const j of [-1,1])c('wheel'+j,[j*.20,.12,-.11],[.24,.09,.24],'rubber',side);an('cockpit',[0,.73,.72]);break;
 case 'sailboat':
 w('hull',[0,.275,0],[.93,.55,1.63],'blue');b('deck',[0,.59,0],[.82,.10,1.40],'wood');b('cabin',[0,.73,-.30],[.48,.23,.47],'ivory');c('mast',[0,1.35,.02],[.057,1.50,.057],'steel');rod('boom',[0,.92,.02],[0,.92,-.64],.045,'wood');roof('mainsail',[0,1.42,-.32],[.78,1.02,.038],'ivory',[0,PI/2,0]);roof('jib',[0,1.18,.34],[.60,.68,.035],'sand',[0,-PI/2,0]);rod('stay',[0,2.10,.02],[0,.69,.67],.016,'steel');an('deck',[0,.65,.30]);break;
 case 'dna-helix':{
 c('stand',[0,.085,0],[.86,.17,.86],'dark');const steps=14,point=(i,j)=>[.36*Math.cos(i*.66+j*PI),.25+i*.125,.36*Math.sin(i*.66+j*PI)];for(let i=0;i<steps;i++){const a=point(i,0),z=point(i,1);s('sugar-a'+i,a,[.13,.13,.13],'blue');s('sugar-b'+i,z,[.13,.13,.13],'coral');rod('base-a'+i,a,a.map((v,k)=>(v+z[k])/2),.066,i%2?'gold':'cyan');rod('base-b'+i,z,a.map((v,k)=>(v+z[k])/2),.066,i%2?'cyan':'gold');if(i+1<steps)for(const j of [0,1])rod('backbone'+j+'-'+i,point(i,j),point(i+1,j),.075,j?'coral':'blue');}an('axis',[0,1.05,0]);break;}
 case 'atom-model':
 c('base',[0,.08,0],[.82,.16,.82],'dark');c('stem',[0,.33,0],[.10,.39,.10],'steel');{const center=[0,1.06,0];for(let i=0;i<6;i++){const a=i*T/6;s('nucleon'+i,add(center,[.15*Math.cos(a),.08*(i%2?1:-1),.15*Math.sin(a)]),[.24,.24,.24],i%2?'coral':'gold');}for(let j=0;j<3;j++){const rot=[PI/2,j*PI/3,j*.33];r('orbit'+j,center,[1.46,.07,1.46],'steel',rot);const a=.7+j*2.1,pt=rz(ry(rx([.52*Math.cos(a),0,.52*Math.sin(a)],rot[0]),rot[1]),rot[2]);s('electron'+j,add(center,pt),[.19,.19,.19],'cyan');}an('nucleus',center);}break;
 case 'microscope':
 b('foot',[0,.12,0],[.95,.24,.92],'dark');b('base-inset',[0,.24,0],[.76,.08,.72],'ivory');rod('back-support',[0,.25,-.27],[0,1.17,-.29],.24,'ivory');rod('arch',[0,1.17,-.29],[0,1.39,.10],.23,'ivory');b('stage',[0,.68,.10],[.67,.09,.57],'dark');b('slide',[0,.735,.10],[.38,.025,.18],'visor');c('illuminator',[0,.35,.10],[.24,.15,.24],'cyan');c('objective',[0,.92,.10],[.18,.27,.18],'steel');c('tube',[0,1.23,.10],[.25,.42,.25],'dark');c('eyepiece',[0,1.51,.10],[.32,.17,.32],'rubber');for(const j of [-1,1])c('focus'+j,[j*.19,1.0,-.23],[.27,.13,.27],'steel',side);an('stage',[0,.74,.10]);an('eyepiece',[0,1.60,.10]);break;
 case 'space-telescope':
 c('stand',[0,.09,0],[.91,.18,.91],'dark');b('mount',[0,.44,0],[.42,.64,.44],'steel');c('tube',[0,1.07,0],[.74,1.36,.74],'ivory',front);c('rear',[0,1.07,-.71],[.71,.15,.71],'gold',front);r('aperture',[0,1.07,.69],[.80,.19,.80],'steel',front);c('mirror',[0,1.07,.63],[.60,.06,.60],'visor',front);for(const j of [-1,1]){rod('boom'+j,[j*.32,1.05,0],[j*.72,1.05,0],.065,'steel');b('solar-panel'+j,[j*.95,1.05,0],[.74,.055,.93],'blue');for(let k=0;k<4;k++)q('panel-line'+j+k,[j*.95,1.085,-.33+k*.22],[.70,.012,.018],'gold');}an('aperture',[0,1.07,.79]);break;
 case 'gold-bars':
 for(let row=0;row<2;row++)for(let i=0;i<3-row;i++){const x=(i-(2-row)/2)*.44,y=.115+row*.21;w('ingot'+row+i,[x,y,0],[.42,.23,.86],'gold');b('stamp'+row+i,[x,y+.119,0],[.20,.012,.34],'gold-dark');for(let j=0;j<3;j++)q('stamp-line'+row+i+j,[x,y+.128,-.10+j*.10],[.12,.010,.018],'gold');}an('top',[0,.45,0]);break;
 case 'vault-door':
 b('housing',[0,.88,0],[1.66,1.76,.65],'concrete');c('door-frame',[0,.93,.36],[1.43,.17,1.43],'steel',front);c('door',[0,.93,.46],[1.29,.15,1.29],'dark',front);r('seal',[0,.93,.55],[1.27,.18,1.27],'steel',front);for(let i=0;i<8;i++){const a=i*T/8;c('bolt'+i,[.55*Math.cos(a),.93+.55*Math.sin(a),.60],[.11,.075,.11],'gold',front);}r('handwheel',[0,.93,.68],[.61,.21,.61],'steel',front);for(let i=0;i<3;i++){const a=i*T/3;rod('spoke'+i,[0,.93,.70],[.25*Math.cos(a),.93+.25*Math.sin(a),.70],.055,'steel');}c('hub',[0,.93,.73],[.16,.13,.16],'gold',front);for(const j of [-1,1])b('hinge'+j,[.77,.93+j*.47,.43],[.20,.22,.29],'steel');an('handle',[0,.93,.79]);break;
 case 'shipping-container':
 b('floor',[0,.08,0],[1.24,.16,2.19],'dark');b('shell',[0,.67,0],[1.22,1.20,2.16],'coral');b('roof',[0,1.31,0],[1.28,.12,2.20],'steel');for(const j of [-1,1]){for(let i=0;i<11;i++)b('rib'+j+'-'+i,[j*.625,.68,-.98+i*.196],[.055,1.09,.065],'coral-dark');b('corner'+j,[j*.57,.69,1.10],[.13,1.22,.14],'steel');b('door'+j,[j*.30,.68,1.10],[.55,1.10,.065],'coral');c('lockbar'+j,[j*.29,.68,1.16],[.043,1.04,.043],'steel');b('handle'+j,[j*.29,.53,1.20],[.22,.055,.07],'steel');}an('doors',[0,.65,1.23]);break;
 case 'kpi-dashboard':
 b('base',[0,.095,0],[.91,.19,.64],'dark');b('pedestal',[0,.57,0],[.36,.78,.36],'steel');b('shell',[0,1.30,0],[1.34,.95,.24],'dark');b('glass',[0,1.30,.14],[1.19,.79,.045],'screen');for(let i=0;i<5;i++){const h=.13+i*.064;b('bar'+i,[-.42+i*.14,1.04+h/2,.169],[.09,h,.022],i%2?'gold':'cyan');}b('horizontal',[.25,1.53,.173],[.43,.025,.020],'cyan');for(let i=0;i<3;i++)b('metric'+i,[.25,1.42-i*.085,.174],[.35-i*.065,.028,.020],'steel');b('bottom-controls',[0,.87,.15],[.69,.055,.03],'blue');an('screen',[0,1.30,.19]);break;
 default:throw Error('missing recipe');
 }
 for(const n of HERO_REGISTRY[id].anchors)if(!Object.hasOwn(anchors,n))throw Error('missing anchor '+n);if(parts.length<3||parts.length>160)throw Error('hero component budget');return {parts,anchors};
}
