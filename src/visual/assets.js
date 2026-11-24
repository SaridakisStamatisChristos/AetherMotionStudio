import {add,rx,ry,rz} from './vectors.js';
export function transformAt(origin,yaw=0,scale=1){
 return p=>add(ry(p.map(x=>x*scale),yaw),origin);
}
export function retroRobot(box,{origin,yaw=0,scale=1,walking=0,open=0,headRoll=0,headYaw=0,blink=1}){
 const robot=transformAt(origin,yaw,scale);
 const metal='#b9c7c9',dark='#364657',coral='#b6523e',cream='#e5d9bd';
 for(const s of [-1,1]){const swing=s*walking*.4,leg=p=>robot(add(rx(p,swing),[s*.22,.62,0]));box([0,-.21,0],[.27,.55,.29],dark,leg);box([0,-.47,.11],[.38,.19,.55],metal,leg)}
 box([0,.91,0],[.78,.68,.57],coral,robot);box([0,.93,.30],[.46,.32,.04],dark,robot);box([0,.98,.33],[.22,.035,.025],'#54e5da',robot,true);box([0,1.29,0],[.34,.15,.33],dark,robot);
 for(const s of [-1,1]){const arm=p=>robot(add(rz(rx(p,-.22*s*walking-.52*open*(s===1?1:0)),s*(.19+.25*open)),[s*.49,1.18,0]));box([0,-.20,0],[.23,.45,.25],metal,arm);box([0,-.48,.02],[.28,.23,.28],cream,arm)}
 const head=p=>robot(add(ry(rz(p,headRoll),headYaw),[0,1.81,0]));
 box([0,0,0],[1.08,.86,.88],cream,head);box([0,0,.45],[.93,.72,.045],dark,head,false,.25);box([0,0,.48],[.80,.60,.032],coral,head,false,.5);box([-.21,.105,.505],[.115,.25*blink,.018],'#bffdf5',head,true,.8);box([.21,.105,.505],[.115,.25,.018],'#bffdf5',head,true,.8);box([0,-.15,.505],[.42,.115,.018],dark,head,false,.8);for(let i=0;i<5;i++)box([-.16+i*.08,-.145,.52],[.055,.047,.014],cream,head,true,1.1);box([-.575,.06,-.05],[.085,.29,.36],coral,head);box([.1,.49,-.07],[.055,.21,.055],metal,head);box([.1,.61,-.07],[.12,.12,.12],'#ffd076',head,true);

}
export function treasureChest(box,{origin,yaw=0,scale=1,open=0}){
 const chest=transformAt(origin,yaw,scale);
 const wood='#a85e32',wood2='#8e4828',gold='#e5ac45';
 box([0,.16,0],[1.66,.25,1.17],wood2,chest);box([0,.50,.55],[1.66,.68,.15],wood,chest);box([0,.50,-.55],[1.66,.68,.15],wood2,chest);for(const s of [-1,1]){box([s*.76,.50,0],[.15,.68,1.08],wood,chest);box([s*.58,.51,.635],[.13,.70,.035],gold,chest);box([s*.58,.51,-.635],[.13,.70,.035],gold,chest)}box([0,.84,.55],[1.74,.09,.18],gold,chest);box([0,.84,-.55],[1.74,.09,.18],gold,chest);for(const s of [-1,1])box([s*.76,.84,0],[.18,.09,1.1],gold,chest);box([0,.59,.645],[.26,.28,.07],gold,chest);box([0,.58,.69],[.07,.11,.022],dark,chest);
 const lid=p=>chest(add(rx(p,-open*1.93),[0,.89,-.57]));box([0,.09,.55],[1.76,.22,1.25],wood,lid);box([0,.22,.55],[1.63,.085,1.11],wood2,lid);for(const s of [-1,1])box([s*.58,.25,.55],[.14,.065,1.26],gold,lid);box([0,.08,1.19],[1.77,.19,.06],gold,lid);box([0,-.035,.55],[1.48,.04,1.04],'#ffe29a',lid,true);

 return chest;
}
export function energyCore(box,{origin,yaw=0,scale=1,pulse=0}){
 const tf=transformAt(origin,yaw,scale);
 box([0,.1,0],[1.5,.2,1.5],'#24394e',tf);
 box([0,.28,0],[1.12,.16,1.12],'#59788a',tf);
 const floating=p=>tf(add(ry(rz(p,.23),yaw*2),[0,1.05+pulse*.08,0]));
 box([0,0,0],[.82,.82,.82],'#36a6bb',floating);
 for(const side of [-1,1]){
  box([side*.424,0,0],[.025,.58,.58],'#9afaff',floating,true,.04);
  box([0,0,side*.424],[.58,.58,.025],'#9afaff',floating,true,.04);
 }
 return tf;
}
export const ASSETS=Object.freeze({'retro-robot':retroRobot,'treasure-chest':treasureChest,'energy-core':energyCore});
export function emitAsset(id,box,pose){
 if(!Object.hasOwn(ASSETS,id))throw Error('Unknown asset: '+id);
 return ASSETS[id](box,pose);
}
