import React,{useLayoutEffect,useRef} from 'react';
import {AbsoluteFill,Composition,registerRoot,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {Audio} from '@remotion/media';
import {draw as robot} from './templates/robot-treasure.js';
import {draw as orbit} from './templates/orbit-explainer.js';
import {FORMAT,validateScene} from './core/contract.js';
import baseline from '../examples/robot-treasure.json';
const renderers={'robot-treasure':robot,'orbit-explainer':orbit};
function Film({scene}){validateScene(scene);const frame=useCurrentFrame();const {fps,width,height}=useVideoConfig();const ref=useRef(null);
 useLayoutEffect(()=>{const ctx=ref.current.getContext('2d');ctx.clearRect(0,0,width,height);renderers[scene.template](ctx,frame/fps,width,height,scene)},[frame,fps,width,height,scene]);
 return <AbsoluteFill><canvas ref={ref} width={width} height={height}/><Audio src={staticFile('audio/'+scene.id+'.wav')}/></AbsoluteFill>;
}
function Root(){return <Composition id="AetherFilm" component={Film} defaultProps={{scene:baseline}} fps={FORMAT.fps} durationInFrames={FORMAT.frames} width={FORMAT.width} height={FORMAT.height}/>};registerRoot(Root);
