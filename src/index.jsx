import React,{useLayoutEffect,useMemo,useRef} from 'react';
import {AbsoluteFill,Composition,registerRoot,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {FORMAT} from './core/contract.js';
import {validateProject,filmFrames} from './core/timeline.js';
import {createThreeBackend} from './visual/three-backend.js';
import {drawFilm} from './core/draw-film.js';
import baseline from '../examples/robot-treasure.json';
function Film({scene,timeline=null}){useMemo(()=>{validateProject(scene);filmFrames(scene,timeline)},[scene,timeline]);const frame=useCurrentFrame();const {width,height}=useVideoConfig();const ref=useRef(null),three=useRef(null);
 useLayoutEffect(()=>()=>{three.current?.dispose();three.current=null},[]);
 useLayoutEffect(()=>{const ctx=ref.current.getContext('2d');ctx.clearRect(0,0,width,height);if(scene.version===2&&scene.shots.some(s=>s.template==='cinematic-graph'&&s.backend==='three')&&!three.current)three.current=createThreeBackend();drawFilm(ctx,scene,timeline,frame,width,height,three.current)},[frame,width,height,scene,timeline]);
 return <AbsoluteFill><canvas ref={ref} width={width} height={height}/><Audio src={staticFile('audio/'+scene.id+'.wav')}/></AbsoluteFill>;
}
function metadata({props}){validateProject(props.scene);return {durationInFrames:filmFrames(props.scene,props.timeline)};}
function Root(){return <Composition id="AetherFilm" component={Film} defaultProps={{scene:baseline,timeline:null}} calculateMetadata={metadata} fps={FORMAT.fps} durationInFrames={FORMAT.frames} width={FORMAT.width} height={FORMAT.height}/>};registerRoot(Root);
