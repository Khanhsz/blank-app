import React,{Component,Suspense,useEffect,useMemo,useState} from "react";
import {useFrame,useThree} from "@react-three/fiber";
import {Html,useGLTF} from "@react-three/drei";
import {AssetRegistry} from "./AssetRegistry";
import {CityCampaignMedia} from "./CityCampaignMedia";
import {BrickhouseCampaignMedia} from "./BrickhouseCampaignMedia";
import type {District} from "./WorldScene";

type Props={building:District;selected:boolean;onSelect:(id:string)=>void;quality:"high"|"low";fallback:React.ReactNode};
class AssetErrorBoundary extends Component<{fallback:React.ReactNode;children:React.ReactNode},{error:boolean}>{
 state={error:false};
 static getDerivedStateFromError(){return {error:true}}
 componentDidCatch(error:Error){console.warn("GLB fallback activated:",error.message)}
 render(){return this.state.error?this.props.fallback:this.props.children}
}
/** LOD tracks camera without changing existing CameraControls or world coordinates. */
export function LODManager({x,z,quality,selected,onLOD}:{x:number;z:number;quality:"high"|"low";selected:boolean;onLOD:(lod:0|1)=>void}){
 const camera=useThree(x=>x.camera);
 let elapsed=0;
 useFrame((_,dt)=>{
  elapsed+=dt;if(elapsed<.5)return;elapsed=0;
  const d=Math.hypot(camera.position.x-x,camera.position.z-z,camera.position.y*.66);
  onLOD(quality==="high"&&(selected||d<66)?0:1);
 });
 return null;
}
function ModelGeometry({id,lod,dimensions,height,tier=1}:{id:string;lod:0|1;dimensions:[number,number,number];height:number;tier?:number}){
 // useGLTF delegates loading to GLTFLoader and caches by exact versioned URL.
 const src=AssetRegistry.get(id);
 if(!src)throw Error("Unregistered asset "+id);
 const gltf=useGLTF(AssetRegistry.url(id,lod,tier));
 const scene=useMemo(()=>gltf.scene.clone(true),[gltf.scene]);
 const scale:[number,number,number]=[dimensions[0]/src.width,height/src.height,dimensions[2]/src.depth];
 return <primitive object={scene} scale={scale} dispose={null}/>;
}
export function BuildingInteraction({b,selected,onSelect,quality}:{b:District;selected:boolean;onSelect:(id:string)=>void;quality:"high"|"low"}){
 const [hot,setHot]=useState(false);
 const [near,setNear]=useState(false);
 const camera=useThree(s=>s.camera);
 const [lod,setLod]=useState<0|1>(quality==="high"&&selected?0:1);
 const onHover=(yes:boolean)=>{setHot(yes);document.body.style.cursor=yes?"pointer":"auto"};
 useEffect(()=>()=>{document.body.style.cursor="auto"},[]);
 // At high-angle city overview, do not draw 27 overlapping HTML nameplates.
 // Nearby, hovered, selected and current HQ buildings remain discoverable.
 const nearbyRef=React.useRef(0);
 useFrame((_,dt)=>{
  nearbyRef.current+=dt;
  if(nearbyRef.current<.45)return;
  nearbyRef.current=0;
  const dist=Math.hypot(camera.position.x-b.x,camera.position.z-b.z,camera.position.y*.68);
  const visibility=dist<54;
  setNear(prev=>prev===visibility?prev:visibility);
 });
 const showLabel=selected||hot||near||b.occupied||(b.id==="agency"&&!b.locked);
 return <group position={[b.x,0,b.z]}>
  <LODManager x={b.x} z={b.z} quality={quality} selected={selected} onLOD={next=>setLod(prev=>prev===next?prev:next)}/>
  <ModelGeometry id={b.id} lod={lod} tier={b.tier} height={b.h} dimensions={[b.w,b.h,b.d]}/>
  {b.id==="office-brick"?<BrickhouseCampaignMedia b={b} lod={lod} onSelect={onSelect}/>:<CityCampaignMedia b={b} lod={lod} onSelect={onSelect}/>}
  {/* Invisible raycast collider. Game interaction is routed through the original b.id. */}
  <mesh name={"GAMEPLAY_HITBOX_"+b.id} position={[0,b.h*.5+.25,0]} onClick={e=>{e.stopPropagation();onSelect(b.id)}}
   onPointerOver={e=>{e.stopPropagation();onHover(true)}} onPointerOut={e=>{e.stopPropagation();onHover(false)}}>
   <boxGeometry args={[b.w+.25,b.h+.65,b.d+.25]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/>
  </mesh>
  {selected&&<mesh position={[0,.12,0]}><boxGeometry args={[b.w+.8,.08,b.d+.8]}/><meshBasicMaterial color="#93c5ac" transparent opacity={.55} depthWrite={false}/></mesh>}
  {showLabel&&<Html center position={[0,b.h+1.7,0]} distanceFactor={32} style={{pointerEvents:"auto"}}>
   <button className={"world-building-label "+(selected?"selected":"")+(b.locked?" locked":"")+(b.kind==="rival"?" rival":"")+(b.kind==="office"?" office":"")+(b.kind==="client"?" client":"")+(b.occupied?" occupied":"")}
    type="button" onClick={()=>onSelect(b.id)}>
    <span className="map-pin"/><span>{b.name}</span>{b.occupied?<small>YOUR HQ</small>:b.kind==="rival"?<small>RIVAL</small>:b.kind==="office"?<small>{b.locked?"LOCKED":"TO LET"}</small>:b.kind==="client"?<small>CLIENT HQ</small>:b.locked?<small>LOCKED</small>:null}
   </button>
  </Html>}
  {hot&&<pointLight position={[0,b.h*.55,b.d/2+1]} color="#b9d4c8" intensity={.5} distance={b.w*2}/>}
 </group>;
}
/** Failure-safe adapter; binary availability never blocks gameplay. */
export function SafeAssetBuilding(props:Props){
 if(!AssetRegistry.has(props.building.id))return <>{props.fallback}</>;
 return <AssetErrorBoundary fallback={props.fallback}>
  <Suspense fallback={props.fallback}>
   <BuildingInteraction b={props.building} selected={props.selected} onSelect={props.onSelect} quality={props.quality}/>
  </Suspense>
 </AssetErrorBoundary>;
}
function SceneryModel({id,x,z,quality}:{id:string;x:number;z:number;quality:"high"|"low"}){
 const entry=AssetRegistry.get(id);
 const [lod,setLod]=useState<0|1>(1);
 if(!entry||!entry.decorative)return null;
 return <group position={[x,0,z]}>
  <LODManager x={x} z={z} quality={quality} selected={false} onLOD={next=>setLod(prev=>prev===next?prev:next)}/>
  <ModelGeometry id={id} lod={lod} height={entry.height} dimensions={[entry.width,entry.height,entry.depth]}/>
 </group>;
}
/** Chunks are keyed by block. Unload invisible distant decorative assets. */
export function ChunkManager({quality}:{quality:"high"|"low"}){
 const camera=useThree(s=>s.camera);
 const [loaded,setLoaded]=useState<Set<string>>(()=>new Set(AssetRegistry.decorativePlacements.map(p=>p.id)));
 let elapsed=0;
 useFrame((_,dt)=>{
  elapsed+=dt;if(elapsed<1.2)return;elapsed=0;
  const next=new Set(AssetRegistry.decorativePlacements.filter(p=>Math.hypot(camera.position.x-p.x,camera.position.z-p.z)<210).map(p=>p.id));
  setLoaded(prev=>prev.size===next.size&&[...prev].every(x=>next.has(x))?prev:next);
 });
 return <group name="MT_ARTS_QUARTER_CHUNK">{AssetRegistry.decorativePlacements.filter(p=>loaded.has(p.id)).map(p=><AssetErrorBoundary key={p.id} fallback={null}>
  <Suspense fallback={null}><SceneryModel id={p.id} x={p.x} z={p.z} quality={quality}/></Suspense>
 </AssetErrorBoundary>)}</group>;
}
/** Stable bridge between map entities and the GLB presentation layer. */
export function DistrictManager({districts,onSelect,selected,quality,fallback}:{districts:District[];onSelect:(id:string)=>void;selected:string|null;quality:"high"|"low";fallback:(b:District)=>React.ReactNode}){
 return <group name="MT_CITY_DISTRICTS">{districts.map(b=><SafeAssetBuilding key={b.id} building={b} selected={selected===b.id} onSelect={onSelect} quality={quality} fallback={fallback(b)}/>)}</group>;
}
