/**
 * Dense Media City is the sole city visual source.
 *
 * Optional production GLB: public/assets/mt-city/dense-media-city-v1.glb.
 * If the binary is not yet installed, render a distinct deterministic
 * modernist city rather than falling back to the retired Marketing City map.
 *
 * All persistent gameplay IDs remain owned by cityLots / GameState.
 */
import {useEffect,useMemo,useState} from "react";
import {Html} from "@react-three/drei";
import {GLTFLoader} from "three/addons/loaders/GLTFLoader.js";
import * as THREE from "three";
import {useGame} from "@/game/store";
import type {District} from "./WorldScene";

export const DENSE_CITY_GLB="/assets/mt-city/dense-media-city-v1.glb";
export const DENSE_CITY_SCALE=0.255;

type Props={districts:District[];selected:string|null;onSelect:(id:string)=>void;quality:"high"|"low"};
type Lot={x:number;z:number;w:number;d:number;h:number;seed:number};
const palettes=["#d9d0c2","#b6c1c0","#d5b4a3","#a6b5b8","#c4c3bc","#ad9e95","#e0d9c9"];
const seeded=(n:number)=>{const x=Math.sin(n*156.314+78.91)*43758.5453;return x-Math.floor(x)};
const streetXs=[-45,-23,0,23,45];
const streetZs=[-34,-16,17,35];
const heroSigns=[
 {id:"DOOH_WEST_CURVED_HERO",x:-28,y:11,z:23,w:13,h:8},
 {id:"DOOH_EAST_CURVED_HERO",x:28,y:11,z:23,w:13,h:8},
 {id:"DOOH_CENTRAL_TOWER_MAIN",x:0,y:14,z:-10,w:6,h:10},
 {id:"DOOH_NORTH_CENTER",x:-26,y:11,z:-17,w:11,h:7},
 {id:"DOOH_NORTH_RIGHT",x:26,y:13,z:-17,w:7,h:10},
 {id:"OOH_WEST_ROOFTOP",x:-29,y:21,z:24,w:11,h:3.4},
 {id:"OOH_EAST_ROOFTOP",x:29,y:21,z:24,w:11,h:3.4},
] as const;

function Poster({headline,kind="DOOH"}:{headline:string;kind?:"DOOH"|"OOH"}){
 const map=useMemo(()=>{
  const canvas=document.createElement("canvas");canvas.width=512;canvas.height=256;
  const ctx=canvas.getContext("2d");
  if(ctx){
   ctx.fillStyle=kind==="OOH"?"#ede1d2":"#203f56";ctx.fillRect(0,0,512,256);
   ctx.fillStyle=kind==="OOH"?"#dc8d68":"#e5a88a";
   ctx.beginPath();ctx.arc(425,140,104,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=kind==="OOH"?"#233e4b":"#f6f5ec";
   ctx.font="bold 33px 'Be Vietnam Pro',Arial,sans-serif";
   ctx.fillText(headline.toUpperCase().slice(0,19),25,116,450);
   ctx.font="600 15px 'Be Vietnam Pro',Arial,sans-serif";
   ctx.fillText("MARKETING CITY / "+kind,27,190,450);
  }
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;return t;
 },[headline,kind]);
 useEffect(()=>()=>map.dispose(),[map]);
 return <meshBasicMaterial map={map} toneMapped={false} side={THREE.DoubleSide}/>;
}
function FallbackSign({item,onSelect,headline}:{item:typeof heroSigns[number];onSelect:(id:string)=>void;headline:string}){
 const isOoh=item.id.startsWith("OOH");
 return <group position={[item.x,item.y,item.z]}>
  <mesh castShadow><boxGeometry args={[item.w+.45,item.h+.45,.38]}/><meshStandardMaterial color="#283e4d" roughness={.8}/></mesh>
  <mesh position={[0,0,.225]} onClick={e=>{e.stopPropagation();onSelect("media")}}>
   <planeGeometry args={[item.w,item.h]}/><Poster headline={headline} kind={isOoh?"OOH":"DOOH"}/>
  </mesh>
 </group>;
}
function makeInfill():Lot[]{
 const lots:Lot[]=[];
 for(let iz=0;iz<14;iz++)for(let ix=0;ix<18;ix++){
  const x=-58+ix*6.85,z=-48+iz*7.2;
  // Maintain a generous paved civic square; tightly pack its perimeter.
  if(Math.abs(x)<15.5&&Math.abs(z)<15.5)continue;
  // Street corridors, not random empty spaces.
  if(streetXs.some(v=>Math.abs(v-x)<2.9)||streetZs.some(v=>Math.abs(v-z)<2.9))continue;
  const s=ix*61+iz*17;
  if(seeded(s*3.21)<.09)continue;
  lots.push({x,z,w:5.8+seeded(s+4)*.55,d:5.9+seeded(s+2)*.55,h:7+Math.floor(seeded(s+77)*9)*1.7,seed:s});
 }
 return lots;
}
const infills=makeInfill();

function InfillBuilding({lot}:{lot:Lot}){
 const {x,z,w,d,h,seed}=lot;
 const c=palettes[Math.floor(seeded(seed+44)*palettes.length)];
 const band=seed%3===0?"#567584":"#78939d";
 const floors=Math.max(2,Math.floor(h/3));
 return <group position={[x,0,z]}>
  <mesh position={[0,h/2,0]} castShadow receiveShadow>
   <boxGeometry args={[w,h,d]}/><meshStandardMaterial color={c} roughness={.94} flatShading/>
  </mesh>
  <mesh position={[0,h+.17,0]} castShadow>
   <boxGeometry args={[w+.26,.35,d+.26]}/><meshStandardMaterial color="#8d9696" roughness={.95}/>
  </mesh>
  <mesh position={[0,1.1,d/2+.075]}>
   <boxGeometry args={[w*.83,1.75,.10]}/><meshStandardMaterial color="#4a6570" roughness={.65}/>
  </mesh>
  {/* Window bands create a legible modernist facade without hundreds of draw calls. */}
  {Array.from({length:Math.min(7,floors-1)},(_,f)=>{
   const y=3.9+f*2.5;if(y>h-1)return null;
   return <mesh key={f} position={[0,y,d/2+.085]}>
    <boxGeometry args={[w*.79,.72,.085]}/>
    <meshStandardMaterial color={f%3===0?"#7895a0":band} roughness={.6}/>
   </mesh>;
  })}
  {seed%5===0&&<mesh position={[w*.18,h+.63,-d*.17]} castShadow>
   <boxGeometry args={[w*.22,.84,d*.35]}/><meshStandardMaterial color="#a6adab"/>
  </mesh>}
 </group>;
}
function StreetNetwork(){
 return <group>
  <mesh position={[0,-.34,0]} receiveShadow><boxGeometry args={[128,.52,112]}/><meshStandardMaterial color="#d2d0c8" roughness={1}/></mesh>
  {streetXs.map(x=><group key={"sx"+x}>
   <mesh position={[x,-.04,0]} receiveShadow><boxGeometry args={[5,.09,107]}/><meshStandardMaterial color="#687780" roughness={1}/></mesh>
   {Array.from({length:19},(_,i)=><mesh key={i} position={[x,.008,-49+i*5.3]}><boxGeometry args={[.10,.018,2.2]}/><meshBasicMaterial color="#e9dfce"/></mesh>)}
  </group>)}
  {streetZs.map(z=><group key={"sz"+z}>
   <mesh position={[0,-.038,z]} receiveShadow><boxGeometry args={[125,.09,5]}/><meshStandardMaterial color="#687780" roughness={1}/></mesh>
   {Array.from({length:22},(_,i)=><mesh key={i} position={[-58+i*5.4,.012,z]}><boxGeometry args={[2.2,.02,.12]}/><meshBasicMaterial color="#e9dfce"/></mesh>)}
  </group>)}
  <mesh position={[0,.05,0]} receiveShadow><boxGeometry args={[30,.22,30]}/><meshStandardMaterial color="#e2dacd" roughness={1}/></mesh>
  <mesh position={[0,.16,-4]}><boxGeometry args={[16,.28,6]}/><meshStandardMaterial color="#c3c4bd" roughness={1}/></mesh>
  <mesh position={[0,.39,-4]}><boxGeometry args={[13,.18,4.5]}/><meshStandardMaterial color="#eee7dc" roughness={1}/></mesh>
 </group>;
}
function ProceduralDenseCity({onSelect,headline}:{onSelect:(id:string)=>void;headline:string}){
 return <group name="MT_DENSE_MEDIA_CITY_PROCEDURAL_FALLBACK">
  <StreetNetwork/>
  {infills.map(l=><InfillBuilding key={l.seed} lot={l}/>)}
  {/* Hero media architecture: deliberately much more expressive than ordinary infill. */}
  {[[-29,22,18,15],[-29,-21,17,12],[29,22,20,16],[29,-21,20,15],[0,-19,10,21]].map(([x,z,w,h],i)=>
   <group key={i} position={[x,0,z]}>
    <mesh position={[0,h/2,0]} castShadow><boxGeometry args={[w,h,13]}/><meshStandardMaterial color={palettes[(i+2)%palettes.length]} roughness={.9}/></mesh>
    <mesh position={[0,1.4,6.65]}><boxGeometry args={[w*.88,2.25,.18]}/><meshStandardMaterial color="#385a66" roughness={.68}/></mesh>
    <mesh position={[0,h+.25,0]}><boxGeometry args={[w+.5,.5,13.5]}/><meshStandardMaterial color="#7d8d94" roughness={.88}/></mesh>
   </group>)}
  {heroSigns.map(item=><FallbackSign key={item.id} item={item} headline={headline} onSelect={onSelect}/>)}
 </group>;
}
function GameplayHotspot({b,selected,onSelect}:{b:District;selected:boolean;onSelect:(id:string)=>void}){
 const [hot,setHot]=useState(false);
 const show=hot||selected||(b.occupied??false);
 return <group name={"GAMEPLAY_ANCHOR_"+b.id} position={[b.x,0,b.z]}>
  <mesh position={[0,Math.min(b.h,12)*.5+.20,0]}
   onClick={e=>{e.stopPropagation();onSelect(b.id)}}
   onPointerOver={e=>{e.stopPropagation();setHot(true);document.body.style.cursor="pointer"}}
   onPointerOut={()=>{setHot(false);document.body.style.cursor="auto"}}>
   <boxGeometry args={[Math.min(b.w,7),Math.min(b.h,12),Math.min(b.d,7)]}/>
   <meshBasicMaterial transparent opacity={0} depthWrite={false}/>
  </mesh>
  {show&&<Html position={[0,Math.min(b.h,12)+1,0]} center distanceFactor={30}>
   <button type="button" className={"world-building-label"+(selected?" selected":"")+(b.locked?" locked":"")}
    onClick={()=>onSelect(b.id)}>{b.name}</button>
  </Html>}
 </group>;
}
function LoadedGLBCity({scene,onSelect,headline}:{scene:THREE.Group;onSelect:(id:string)=>void;headline:string}){
 const model=useMemo(()=>scene.clone(true),[scene]);
 useEffect(()=>{
  const surfaces:THREE.Material[]=[];
  const canvas=document.createElement("canvas");canvas.width=512;canvas.height=256;
  const ctx=canvas.getContext("2d");
  if(ctx){
   ctx.fillStyle="#263f55";ctx.fillRect(0,0,512,256);
   ctx.fillStyle="#edb18a";ctx.fillRect(22,22,468,8);
   ctx.fillStyle="#f5f0e8";ctx.font="bold 34px 'Be Vietnam Pro',Arial";
   ctx.fillText(headline.toUpperCase().slice(0,20),24,135,460);
   ctx.font="bold 18px Arial";ctx.fillText("MARKETING TYCOON  /  LIVE",24,194,465);
  }
  const creative=new THREE.CanvasTexture(canvas);creative.colorSpace=THREE.SRGBColorSpace;
  model.traverse(node=>{
   if(!(node instanceof THREE.Mesh))return;
   if(!/^(DOOH_|OOH_|IOOH_)/.test(node.name))return;
   const old=node.material as THREE.Material;
   const mat=(old as THREE.MeshStandardMaterial).clone();
   mat.map=creative;mat.needsUpdate=true;node.material=mat;
   surfaces.push(mat);
  });
  return()=>{surfaces.forEach(m=>m.dispose());creative.dispose();};
 },[model,headline]);
 return <group scale={DENSE_CITY_SCALE} name="MT_DENSE_MEDIA_CITY_GLB">
  <primitive object={model} dispose={null}
   onClick={e=>{
    if(/^(DOOH_|OOH_|IOOH_)/.test(e.object.name)){e.stopPropagation();onSelect("media")}
   }}/>
 </group>;
}
export function DenseMediaCity({districts,selected,onSelect}:Props){
 const [model,setModel]=useState<THREE.Group|null>(null);
 const brand=useGame(s=>s.campaign.aiScenario?.brand||"YOUR BRAND HERE");
 const week=useGame(s=>s.ceo?.weekly?.week??1);
 const headline=brand+" · W"+week;
 useEffect(()=>{
  let live=true;
  const loader=new GLTFLoader();
  loader.load(DENSE_CITY_GLB,gltf=>{if(live)setModel(gltf.scene)},undefined,
   ()=>{if(live){setModel(null);console.info("Dense Media City: using procedural version until production GLB is installed")}}
  );
  return()=>{live=false};
 },[]);
 return <group name="MARKETING_TYCOON_DENSE_MEDIA_CITY">
  {model?<LoadedGLBCity scene={model} onSelect={onSelect} headline={headline}/>:<ProceduralDenseCity onSelect={onSelect} headline={headline}/>}
  {districts.map(b=><GameplayHotspot key={b.id} b={b} selected={selected===b.id} onSelect={onSelect}/>)}
 </group>;
}
