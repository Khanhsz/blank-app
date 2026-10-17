
import {Canvas,useFrame} from "@react-three/fiber";
import {CameraControls,Html,ContactShadows,Float} from "@react-three/drei";
import {useEffect,useRef,useState,useMemo} from "react";
import * as THREE from "three";
import type {DistrictKind} from "@/game/city";
import type {SceneId,Character,RoomStyle} from "@/game/state";

export interface District {id:string;name:string;kind:DistrictKind;district?:string;occupied?:boolean;x:number;z:number;w:number;d:number;h:number;color:string;locked:boolean}
type RoomAction="board"|"phone"|"wardrobe";
const ink="#302b28",cream="#e9dbc8",teal="#70a39b",copper="#bd694a";
const flat={flatShading:true,roughness:0.86,metalness:0.02};
const seeded=(i:number)=>{const v=Math.sin(i*124.521)*43758.5453;return v-Math.floor(v)};
function Land(){return <mesh rotation-x={-Math.PI/2} position={[0,-.05,0]} receiveShadow><planeGeometry args={[155,140]}/><meshStandardMaterial color="#d7cbb9" {...flat}/></mesh>}
function Box({p=[0,0,0],size=[1,1,1],color,children,rotation}: {p?:[number,number,number];size?:[number,number,number];color:string;children?:React.ReactNode;rotation?:[number,number,number]}){
 return <mesh position={p} rotation={rotation} castShadow receiveShadow><boxGeometry args={size}/><meshStandardMaterial color={color} {...flat}/>{children}</mesh>
}
function Tree({x,z,h=1.4,seed=0}:{x:number;z:number;h?:number;seed?:number}){
 const leaf=seed%3===0?"#789f7e":seed%3===1?"#8aaa82":"#71948d";
 return <group position={[x,0,z]}>
  <mesh position={[0,h*.6,0]} castShadow><cylinderGeometry args={[.15*h,.2*h,h*1.2,6]}/><meshStandardMaterial color="#9a7355" {...flat}/></mesh>
  <mesh position={[0,h*1.65,0]} castShadow><icosahedronGeometry args={[.74*h,0]}/><meshStandardMaterial color={leaf} {...flat}/></mesh>
  <mesh position={[.12*h,h*2.12,.05*h]} castShadow><icosahedronGeometry args={[.56*h,0]}/><meshStandardMaterial color="#9bbb90" {...flat}/></mesh>
 </group>;
}
function Lamp({x,z}:{x:number;z:number}){
 return <group position={[x,0,z]}>
  <mesh position={[0,2.75,0]}><cylinderGeometry args={[.07,.1,5.5,8]}/><meshStandardMaterial color="#6b665f" roughness={.65}/></mesh>
  <mesh position={[0,5.5,0]}><sphereGeometry args={[.35,8,6]}/><meshStandardMaterial color="#fff3cd" emissive="#f9dba3" emissiveIntensity={1.05}/></mesh>
 </group>;
}
function LowPolyPerson({c,pos,walk=false,seed=0,yaw=0}:{c:Character;pos:[number,number,number];walk?:boolean;seed?:number;yaw?:number}){
 const r=useRef<THREE.Group>(null), arm=useRef<THREE.Group>(null);
 useFrame(({clock})=>{const t=clock.elapsedTime+seed*3;if(r.current){r.current.position.y=pos[1]+Math.sin(t*(walk?6:2.1))*(walk?.065:.028);r.current.rotation.y=yaw+(walk?Math.sin(t*.3)*.15:0);}if(arm.current)arm.current.rotation.x=Math.sin(t*4)*.18;});
 return <group ref={r} position={pos}>
  <mesh castShadow position={[0,.82,0]}><capsuleGeometry args={[.23,.72,4,8]}/><meshStandardMaterial color={c.outfit} {...flat}/></mesh>
  <mesh castShadow position={[0,1.57,0]}><sphereGeometry args={[.25,12,9]}/><meshStandardMaterial color={c.skin} roughness={.95}/></mesh>
  <mesh position={[0,c.hairstyle==="bun"?1.74:1.76,-.02]} castShadow><sphereGeometry args={[.255,12,8,0,Math.PI*2,0,Math.PI*(c.hairstyle==="curly"?.75:.55)]}/><meshStandardMaterial color={c.hair} roughness={.96}/></mesh>
  {c.hairstyle==="bun"&&<mesh position={[0,1.91,-.12]} castShadow><sphereGeometry args={[.19,10,10]}/><meshStandardMaterial color={c.hair}/></mesh>}
  {c.hairstyle==="curly"&&[-.19,-.03,.15].map((x,i)=><mesh key={i} position={[x,1.82+i*.04,.06]}><icosahedronGeometry args={[.13,0]}/><meshStandardMaterial color={c.hair} flatShading/></mesh>)}
  {c.accessory==="headphones"&&<group><mesh position={[0,1.7,0]} rotation={[0,0,Math.PI/2]}><torusGeometry args={[.3,.05,6,16,Math.PI]}/><meshStandardMaterial color="#34343c"/></mesh>{[-.26,.26].map(x=><mesh key={x} position={[x,1.58,0]}><boxGeometry args={[.08,.23,.17]}/><meshStandardMaterial color="#494d58"/></mesh>)}</group>}
  {c.accessory==="glasses"&&<group position={[0,1.58,.233]}>{[-.13,.13].map(x=><mesh key={x} position={[x,0,0]}><torusGeometry args={[.105,.019,6,12]}/><meshStandardMaterial color="#293947"/></mesh>)}<mesh position={[0,0,0]}><boxGeometry args={[.06,.025,.03]}/><meshStandardMaterial color="#293947"/></mesh></group>}
  <group ref={arm} position={[0,.95,0]}>
   <mesh position={[-.34,-.05,0]} rotation-z={-.12}><capsuleGeometry args={[.085,.41,4,6]}/><meshStandardMaterial color={c.outfit} {...flat}/></mesh>
   <mesh position={[.34,-.05,0]} rotation-z={.12}><capsuleGeometry args={[.085,.41,4,6]}/><meshStandardMaterial color={c.outfit} {...flat}/></mesh>
  </group>
  <mesh position={[-.12,.3,0]} castShadow><cylinderGeometry args={[.095,.105,.54,6]}/><meshStandardMaterial color="#4b4d58" {...flat}/></mesh>
  <mesh position={[.12,.3,0]} castShadow><cylinderGeometry args={[.095,.105,.54,6]}/><meshStandardMaterial color="#4b4d58" {...flat}/></mesh>
 </group>;
}
function CityWalker({seed,c}:{seed:number;c:Character}){
 const ref=useRef<THREE.Group>(null),z=[-16.6,16.6,32.5,-32.5][seed%4];
 useFrame(({clock})=>{if(!ref.current)return;const x=((clock.elapsedTime*(seed%2?-.56:.68)+seed*9)%117+117)%117-58.5;ref.current.position.x=x;ref.current.rotation.y=seed%2?Math.PI/2:-Math.PI/2;});
 return <group ref={ref} position={[0,.01,z]}><LowPolyPerson c={{...c,outfit:["#bd694a","#7f9687","#9c8cba","#c4a36d"][seed%4],skin:"#b88765"}} pos={[0,0,0]} walk seed={seed}/></group>;
}
function Car({seed=0}:{seed:number}){
 const ref=useRef<THREE.Group>(null),z=[-16,16,32,-32][seed%4];
 useFrame(({clock})=>{if(!ref.current)return;ref.current.position.x=((((clock.elapsedTime*(seed%2?3.4:-2.9))+seed*17)%126)+126)%126-63;});
 return <group ref={ref} position={[0,.48,z]}>
  <Box color={seed%3===0?"#b86b59":seed%3===1?"#66959a":"#e8b56e"} size={[2.1,.62,1.1]} p={[0,.05,0]}/>
  <Box color="#dce8e5" size={[1.03,.46,.95]} p={[-.08,.53,0]}/>
  {[-.7,.7].map(x=>[-.53,.53].map(z0=><mesh key={String(x)+String(z0)} position={[x,-.22,z0]} rotation-x={Math.PI/2}><cylinderGeometry args={[.28,.28,.15,9]}/><meshStandardMaterial color="#37383c"/></mesh>))}
 </group>;
}

const cityXs=[-48,-32,-16,0,16,32,48];
const cityZs=[-40,-24,-8,8,24,40];
const roadsX=[-40,-24,-8,8,24,40];
const roadsZ=[-32,-16,0,16,32];
function RoadNetwork(){
 return <group>
  {roadsZ.map(z=><group key={"street-"+z}>
   <Box p={[0,.026,z]} size={[128,.075,4.3]} color="#65615e"/>
   {Array.from({length:24},(_,i)=><Box key={i} p={[-61+i*5.3,.068,z]} size={[2.2,.012,.07]} color="#eee2cd"/>)}
   <Box p={[0,.09,z+2.52]} size={[128,.14,.42]} color="#efe6da"/>
   <Box p={[0,.09,z-2.52]} size={[128,.14,.42]} color="#efe6da"/>
  </group>)}
  {roadsX.map(x=><group key={"avenue-"+x}>
   <Box p={[x,.032,0]} size={[4.3,.075,107]} color="#65615e"/>
   {Array.from({length:20},(_,i)=><Box key={i} p={[x,.07,-49+i*5.15]} size={[.08,.016,1.9]} color="#f1e6d4"/>)}
   <Box p={[x+2.52,.095,0]} size={[.42,.15,107]} color="#eee2d4"/>
   <Box p={[x-2.52,.095,0]} size={[.42,.15,107]} color="#eee2d4"/>
  </group>)}
  {roadsX.flatMap(x=>roadsZ.map(z=><group key={x+"-"+z}>
   {[-1.15,-.52,.12,.76].map((a,i)=><Box key={i} p={[x+a,.115,z+3.15]} size={[.25,.016,.75]} color="#f1eadd"/>)}
  </group>))}
  <Box p={[0,.11,0]} size={[12,.19,11]} color="#d3c3ad"/>
  <Box p={[0,.28,0]} size={[10,.17,8.5]} color="#9eb49b"/>
  <mesh position={[0,.53,0]} castShadow><cylinderGeometry args={[2.2,2.35,.35,12]}/><meshStandardMaterial color="#ead6c0" {...flat}/></mesh>
  <mesh position={[0,.78,0]}><cylinderGeometry args={[1.58,1.65,.27,12]}/><meshStandardMaterial color="#78b1b5" roughness={.36}/></mesh>
  <mesh position={[0,1.18,0]} castShadow><icosahedronGeometry args={[.57,0]}/><meshStandardMaterial color="#faf4e5" {...flat}/></mesh>
  {[-6,6].flatMap(x=>[-5,5].map(z=><Tree key={x+"-"+z} x={x} z={z} h={.65} seed={x+z+20}/>))}
  {cityXs.flatMap((x,i)=>[-49,49].map((z,j)=><Tree key={x+"-"+z} x={x} z={z} h={.9+((i+j)%3)*.15} seed={i+j+4}/>))}
  {roadsX.flatMap(x=>[-46,46].map(z=><Lamp key={x+"_"+z} x={x+3} z={z}/>))}
  {[-56,-24,8,40,56].flatMap((x,i)=>[-32,32].map((z,j)=><Tree key={i+"_"+j} x={x} z={z+4} h={.6+(i%3)*.16} seed={i+j}/>))}
  {Array.from({length:7},(_,i)=><Car key={i} seed={i}/>)}
 </group>;
}
function AmbientBuildings({districts}:{districts:District[]}){
 const lots=useMemo(()=>{
  const used=new Set(districts.map(b=>b.x+","+b.z));
  return cityXs.flatMap((x,i)=>cityZs.map((z,j)=>({x,z,i,j})))
   .filter(v=>!used.has(v.x+","+v.z)&&!(v.x===0&&(v.z===-8||v.z===8)))
   .map(({x,z,i,j})=>({x,z,height:4+((i*5+j*3)%7)*1.6,color:["#c8b3a2","#b6c3b3","#b4aebc","#c1b6a1","#a7b9bd"][((i*3+j)%5)]}));
 },[districts]);
 return <group>{lots.map((b,i)=><group key={b.x+"-"+b.z} position={[b.x,0,b.z]}>
   <Box p={[0,b.height/2+.35,0]} size={[8.2,b.height,8.4]} color={b.color}/>
   <Box p={[0,b.height+.6,0]} size={[8.8,.38,9]} color="#e6dfd4"/>
   {[-2.3,0,2.3].map((x,j)=><Box key={j} p={[x,2.4,4.26]} size={[1.15,1.52,.09]} color="#c7d8d4"/>)}
   <Box p={[0,.9,4.35]} size={[2,1.6,.15]} color="#605e61"/>
   {i%3===0&&<Tree x={4.3} z={4.1} h={.52} seed={i}/>}
  </group>)}</group>;
}
function BuildingWindows({b,muted}:{b:District;muted:boolean}){
 const mesh=useRef<THREE.InstancedMesh>(null);
 const transforms=useMemo(()=>{
  const v:{x:number;y:number;z:number}[]=[];
  const floors=Math.max(2,Math.floor(b.h/1.7)-1);
  for(let f=0;f<floors;f++)for(const x of [-.27,0,.27])for(const side of [-1,1]){
   v.push({x:x*b.w,y:1.45+f*1.6,z:side*(b.d/2+.06)});
  }
  return v;
 },[b.h,b.w,b.d]);
 useEffect(()=>{
  if(!mesh.current)return;
  const obj=new THREE.Object3D();
  for(let i=0;i<transforms.length;i++){
   const t=transforms[i];obj.position.set(t.x,t.y,t.z);obj.scale.set(b.w*.16,.78,.105);obj.updateMatrix();
   mesh.current.setMatrixAt(i,obj.matrix);
  }
  mesh.current.instanceMatrix.needsUpdate=true;
 },[transforms,b.w]);
 return <instancedMesh ref={mesh} args={[undefined,undefined,transforms.length]} castShadow={false}>
  <boxGeometry args={[1,1,1]}/><meshStandardMaterial color={muted?"#c9c8c4":"#bfdcd8"} emissive={muted?"#1d1916":"#355b5c"} emissiveIntensity={muted?0:.08} roughness={.46}/>
 </instancedMesh>;
}
function BuildingDoor({b,open}:{b:District;open:boolean}){
 const hinge=useRef<THREE.Group>(null);
 useFrame((_,dt)=>{if(hinge.current){const target=open?-.97:0;hinge.current.rotation.y+=(target-hinge.current.rotation.y)*Math.min(1,dt*5.2)}});
 return <group position={[-b.w*.14,0,b.d/2+.28]} ref={hinge}>
  <mesh position={[b.w*.14,1.16,0]} castShadow><boxGeometry args={[b.w*.28,2.15,.20]}/><meshStandardMaterial color={b.locked?"#a8a49a":"#405158"} roughness={.55}/></mesh>
  <mesh position={[b.w*.25,1.25,.14]}><sphereGeometry args={[.09,8,8]}/><meshStandardMaterial color="#dbb589" metalness={.3} roughness={.32}/></mesh>
 </group>;
}
function CityPlayer({character,districts,touch,position,active}:{character:Character;districts:District[];touch:string;position:React.MutableRefObject<[number,number]>;active:React.MutableRefObject<boolean>}){
 const group=useRef<THREE.Group>(null),pressed=useRef<Set<string>>(new Set());
 useEffect(()=>{
  const keydown=(e:KeyboardEvent)=>{
   const el=e.target as HTMLElement|null;
   if(el?.closest("input,textarea,select,[contenteditable]"))return;
   if(["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","w","a","s","d","W","A","S","D"].includes(e.key)){e.preventDefault();pressed.current.add(e.key.toLowerCase())}
  };
  const keyup=(e:KeyboardEvent)=>pressed.current.delete(e.key.toLowerCase());
  const blur=()=>pressed.current.clear();
  window.addEventListener("keydown",keydown);window.addEventListener("keyup",keyup);window.addEventListener("blur",blur);
  return()=>{window.removeEventListener("keydown",keydown);window.removeEventListener("keyup",keyup);window.removeEventListener("blur",blur)};
 },[]);
 useFrame((_,dt)=>{
  if(!group.current)return;
  const k=pressed.current;
  let dx=(k.has("d")||k.has("arrowright")||touch==="right"?1:0)-(k.has("a")||k.has("arrowleft")||touch==="left"?1:0);
  let dz=(k.has("s")||k.has("arrowdown")||touch==="down"?1:0)-(k.has("w")||k.has("arrowup")||touch==="up"?1:0);
  const length=Math.hypot(dx,dz);
  active.current=length>0;
  if(!length)return;
  dx/=length;dz/=length;
  const [px,pz]=position.current;
  let nx=Math.max(-61,Math.min(61,px+dx*dt*5));
  let nz=Math.max(-52,Math.min(52,pz+dz*dt*5));
  if(districts.some(b=>Math.abs(nx-b.x)<b.w/2+.9&&Math.abs(nz-b.z)<b.d/2+.9)){nx=px;nz=pz}
  position.current=[nx,nz];
  group.current.position.set(nx,.05,nz);
  group.current.rotation.y=Math.atan2(dx,dz);
 });
 return <group ref={group} position={[0,.05,0]}><LowPolyPerson c={character} pos={[0,0,0]} walk seed={7}/><mesh position={[0,.03,0]} rotation-x={-Math.PI/2}><ringGeometry args={[.55,.7,24]}/><meshBasicMaterial color="#cf8759" transparent opacity={.58} depthWrite={false}/></mesh></group>;
}

function Building({b,onSelect,selected}:{b:District;onSelect:(id:string)=>void;selected:boolean}){
 const [hover,setHover]=useState(false);
 const liftGroup=useRef<THREE.Group>(null);
 const transparent=b.locked;
 const isHQ=b.id==="brand"||b.id==="agency"||b.kind==="rival"||b.occupied;
 const isRival=b.kind==="rival",isOffice=b.kind==="office";
 const isCafe=b.id==="network";

 useFrame((_,dt)=>{if(liftGroup.current){const goal=selected ? .22 : hover ? .09 : 0;liftGroup.current.position.y+=(goal-liftGroup.current.position.y)*Math.min(1,dt*9)}});
 const click=(e:any)=>{e.stopPropagation();onSelect(b.id)};
 const wall=transparent?"#c1bdb5":b.color;
 return <group ref={liftGroup} position={[b.x,0,b.z]}>
  <Box p={[0,.18,0]} size={[b.w+1,.35,b.d+1]} color={selected?"#d5a084":"#e9d9c6"}/>
  <group onPointerOver={e=>{e.stopPropagation();setHover(true);document.body.style.cursor="pointer"}} onPointerOut={()=>{setHover(false);document.body.style.cursor="auto"}} onClick={click}>
   <Box p={[0,b.h*.5+.38,0]} size={[b.w,b.h,b.d]} color={wall}/>
   <Box p={[0,b.h+.65,0]} size={[b.w+.45,.35,b.d+.45]} color={isCafe?"#5b766d":isHQ?"#413f47":"#f4eadf"}/>
   {(b.id==="creative"||b.id==="influencer")&&<mesh castShadow position={[0,b.h+1.3,0]} rotation-y={Math.PI/4}><coneGeometry args={[Math.min(b.w,b.d)*.62,1.7,4]}/><meshStandardMaterial color="#6b625a" {...flat}/></mesh>}
   {isHQ&&<Box p={[0,b.h+1.45,0]} size={[b.w*.42,1.6,b.d*.54]} color="#e9d6c5"/>}
   {isRival&&<><Box p={[0,b.h*.71,b.d/2+.16]} size={[b.w*.76,1.23,.29]} color="#333b45"/><Box p={[0,b.h+2.7,0]} size={[.17,2.6,.17]} color="#545963"/></>}
   {isOffice&&!b.occupied&&<><Box p={[0,b.h*.60,b.d/2+.16]} size={[b.w*.69,1.28,.21]} color="#aa7954"/><Box p={[b.w*.3,b.h+1.2,0]} size={[.19,1.5,.19]} color="#a48f7b"/></>}
   {b.occupied&&<><Box p={[0,b.h*.68,b.d/2+.2]} size={[b.w*.75,1.48,.22]} color="#8db5a5"/><mesh position={[0,b.h+2.8,0]}><octahedronGeometry args={[.8,0]}/><meshStandardMaterial color="#f0c18e" emissive="#d68d51" emissiveIntensity={.35}/></mesh></>}
   {isCafe&&<><Box p={[0,.54,b.d*.56]} size={[b.w+.9,.24,1.4]} color="#dcaf83"/>{[-1,1].map(x=><Box key={x} p={[x*b.w*.42,2.1,b.d*.7]} size={[.25,3.2,.28]} color="#f3d7b0"/>)}</>}
   <BuildingWindows b={b} muted={transparent}/>
   <BuildingDoor b={b} open={selected&&!b.locked}/>
   <Box p={[0,.16,b.d/2+1.1]} size={[b.w*.72,.18,1.9]} color="#d6c4b1"/>
   {b.id==="research"&&<group position={[b.w*.25,b.h+1.1,0]}><mesh castShadow><icosahedronGeometry args={[.65,0]}/><meshStandardMaterial color="#eff9f8" {...flat}/></mesh></group>}
   {b.id==="media"&&<Box p={[0,b.h*.66,b.d/2+.1]} size={[b.w*.68,1.52,.18]} color="#384950"/>}
   {b.id==="influencer"&&<mesh position={[0,b.h+2,0]}><torusGeometry args={[1,.17,6,14]}/><meshStandardMaterial color={copper} {...flat}/></mesh>}
   {selected&&<mesh position={[0,b.h+1.94,0]}><sphereGeometry args={[.23,9,7]}/><meshBasicMaterial color="#ffdcaa"/></mesh>}
  </group>
  <Html position={[0,b.h+2.8,0]} center distanceFactor={36} style={{pointerEvents:"auto"}}>
   <button type="button" className={"world-building-label "+(selected?"selected":"")+(transparent?" locked":"")+(b.kind==="rival"?" rival":"")+(b.kind==="office"?" office":"")+(b.occupied?" occupied":"")} onClick={()=>onSelect(b.id)}>
    <span className="map-pin"/><span>{b.name}</span>{b.occupied?<small>YOUR HQ</small>:b.kind==="rival"?<small>RIVAL</small>:b.kind==="office"?<small>{transparent?"LOCKED":"TO LET"}</small>:transparent?<small>LOCKED</small>:null}
   </button>
  </Html>
 </group>;
}
function City({districts,onSelect,selected,c,touch,position,active}:{districts:District[];onSelect:(id:string)=>void;selected:string|null;c:Character;touch:string;position:React.MutableRefObject<[number,number]>;active:React.MutableRefObject<boolean>}){
 return <><Land/><RoadNetwork/><AmbientBuildings districts={districts}/>{districts.map(b=><Building key={b.id} b={b} selected={selected===b.id} onSelect={onSelect}/>)}
 {Array.from({length:13},(_,i)=><CityWalker key={i} seed={i+1} c={c}/>)}
 <CityPlayer character={c} districts={districts} touch={touch} position={position} active={active}/>
 </>;
}
function RoomComputer({onInteract}:{onInteract:()=>void}){
 const [hot,setHot]=useState(false);
 return <group position={[-2.5,0,-3.75]}>
  <group onPointerOver={e=>{e.stopPropagation();setHot(true);document.body.style.cursor="pointer"}} onPointerOut={()=>{setHot(false);document.body.style.cursor="auto"}} onClick={e=>{e.stopPropagation();onInteract()}}>
   <Box p={[0,1.29,0]} size={[1.6,1.07,.16]} color="#373b41"/>
   <mesh position={[0,1.29,.093]}><planeGeometry args={[1.44,.90]}/><meshStandardMaterial emissive="#71b9ad" emissiveIntensity={hot?1.1:.68} color={hot?"#86d6c6":"#244f58"}/></mesh>
   <Box p={[0,.94,.58]} size={[1.6,.07,.55]} color="#3b4245"/>
   <Box p={[0,1.01,.59]} size={[1.18,.024,.35]} color="#bcc5bd"/>
  </group>
  <Html position={[0,2.24,.12]} center distanceFactor={12}><button className="room-pc-label" id="bedroom-computer" data-testid="bedroom-computer" onClick={onInteract}><span className="pc-dot"/> USE COMPUTER ↗</button></Html>
  <pointLight color="#a0e4d6" intensity={hot?2.5:1.3} position={[0,1.46,.6]} distance={3}/>
 </group>
}
function RoomTouchable({type,name,p,label,onInteract}:{type:"board"|"phone"|"wardrobe";name:string;p:[number,number,number];label:[number,number,number];onInteract:(type:"board"|"phone"|"wardrobe")=>void}){
 const [hover,setHover]=useState(false);
 return <group>
  <mesh position={p} castShadow onPointerOver={e=>{e.stopPropagation();setHover(true);document.body.style.cursor="pointer"}} onPointerOut={()=>{setHover(false);document.body.style.cursor="auto"}} onClick={e=>{e.stopPropagation();onInteract(type)}}>
   <boxGeometry args={type==="board"?[2.75,1.55,.14]:type==="phone"?[.36,.08,.59]:[1.8,2.6,.91]}/>
   <meshStandardMaterial color={type==="board"?"#9c8065":type==="phone"?"#38474e":"#ae8c73"} emissive={hover?"#bd694a":"#000000"} emissiveIntensity={hover ? .22 : 0} roughness={.8}/>
  </mesh>
  {type==="board"&&[-.85,-.25,.45].map((x,i)=><Box key={i} p={[p[0]+x,p[1]+(i%2?.18:-.12),p[2]+.081]} size={[.35,.5,.015]} color={["#fbefe0","#bcd2c3","#dfb5a0"][i]}/>)}
  <Html center position={label} distanceFactor={11}><button className="room-small-label" onClick={()=>onInteract(type)}>{name} ↗</button></Html>
 </group>;
}
function Room({r,c,onComputerInteract,onRoomInteract,preview=false,avatarYaw=0}:{r:RoomStyle;c:Character;onComputerInteract:()=>void;onRoomInteract:(x:RoomAction)=>void;preview?:boolean;avatarYaw?:number}){
 return <group>
  <Box p={[0,-.15,0]} size={[11,.30,11]} color="#b79375"/>
  <Box p={[0,2.8,-5.5]} size={[11,5.8,.24]} color={r.wall}/>
  <Box p={[-5.5,2.8,0]} size={[.24,5.8,11]} color={r.wall}/>
  <Box p={[2.8,3,-5.32]} size={[2.1,2.35,.14]} color="#9bc5c5"/>
  <Box p={[2.8,4.3,-5.12]} size={[2.55,.18,.38]} color="#f3e8dc"/>
  <Box p={[2.8,1.7,-5.12]} size={[2.55,.18,.38]} color="#f3e8dc"/>
  <mesh position={[.6,.05,.5]} rotation-x={-Math.PI/2}><circleGeometry args={[2.25,24]}/><meshStandardMaterial color={r.rug} roughness={1}/></mesh>
  {/* Workstation: desk, books, plant, chair and interactable computer */}
  <Box p={[-2.4,.88,-3.8]} size={[3.8,.15,1.6]} color="#a07859"/>
  {[-3.95,-.85].map(x=><Box p={[x,.45,-3.8]} size={[.18,.9,1.35]} color="#81654b" key={x}/>)}
  <Box p={[-3.9,.99,-3.9]} size={[.35,.4,.5]} color="#ead3b7"/>
  <Box p={[-1.08,1.08,-4.16]} size={[.43,.15,.52]} color="#779a87"/>
  <RoomComputer onInteract={onComputerInteract}/>
  <Box p={[-2.5,.38,-1.9]} size={[1,.2,1.1]} color="#877a70"/>
  <Box p={[-2.5,.96,-1.35]} size={[1,.98,.17]} color="#877a70"/>
  {/* Bed details: layered mattress, pillows and headboard */}
  <Box p={[3.28,.40,-3.0]} size={[2.9,.73,3.78]} color="#8e775f"/>
  <Box p={[3.28,.77,-3.0]} size={[2.75,.20,3.53]} color="#faf4e8"/>
  <Box p={[3.28,.89,-2.43]} size={[2.7,.16,2.2]} color="#d9b89f"/>
  <Box p={[2.6,.89,-4.23]} size={[.95,.2,.55]} color="#e8e5d9"/>
  <Box p={[3.94,.89,-4.23]} size={[.95,.2,.55]} color="#e8e5d9"/>
  {r.plant&&<Tree x={4.6} z={2.9} h={.52}/>}
  {r.lamp&&<Lamp x={-4.65} z={1.3}/>}
  {r.shelf&&<><Box p={[.6,2.55,-5.16]} size={[2.5,.12,.48]} color="#9c775b"/>{Array.from({length:7},(_,i)=><Box key={i} p={[-.37+i*.28,2.81,-5.2]} size={[.2,.44,.3]} color={["#9d7e65","#d5a77b","#7aa19e"][i%3]}/>)}</>}
  <RoomTouchable type="board" name="MOODBOARD" p={[.58,2.28,-5.3]} label={[.58,3.42,-5.25]} onInteract={onRoomInteract}/>
  <RoomTouchable type="phone" name="PHONE" p={[-3.31,.99,-3.21]} label={[-3.2,1.7,-3.12]} onInteract={onRoomInteract}/>
  <RoomTouchable type="wardrobe" name="WARDROBE" p={[4.54,1.4,1.72]} label={[4.54,3.25,1.72]} onInteract={onRoomInteract}/>
  {preview&&<group><mesh position={[0,.14,1.35]} castShadow><cylinderGeometry args={[1.25,1.36,.28,16]}/><meshStandardMaterial color="#b88466" flatShading/></mesh><mesh position={[0,.32,1.35]} castShadow><cylinderGeometry args={[1.04,1.16,.09,16]}/><meshStandardMaterial color="#fff0dd" flatShading/></mesh></group>}
  <LowPolyPerson c={c} pos={[0,preview?.38:.01,1.35]} yaw={avatarYaw}/>
 </group>;
}
function Office({c,staff,board}:{c:Character;staff:number;board:boolean}){
 return <group>
  <Box p={[0,-.15,0]} size={[19,.30,14]} color={board?"#4c4944":"#cbb9a1"}/>
  <Box p={[0,3.3,-7]} size={[19,6.6,.18]} color={board?"#323339":"#e7ded1"}/>
  <Box p={[-9,3.3,0]} size={[.18,6.6,14]} color={board?"#4c4944":"#efeadf"}/>
  {[[-6,-6.8],[-3,-6.8],[0,-6.8],[3,-6.8],[6,-6.8]].map(([x,z],i)=><Box key={i} p={[x,3.6,z]} size={[2.2,2.7,.16]} color="#a4c7c4"/>)}
  {board?<><Box p={[0,.85,0]} size={[8.3,.23,3.05]} color="#98684f"/>
    {[-3,-1.4,1.4,3].map((x,i)=><Box key={i} p={[x,.42,1.8]} size={[.82,.72,.78]} color="#5c5c65"/>)}
    <Box p={[0,3.6,-6.85]} size={[8.9,3.35,.12]} color="#314f50"/>
    <Box p={[0,5.53,-6.75]} size={[8.9,.12,.17]} color="#b58d6c"/>
    <Html position={[0,3.56,-6.57]} center distanceFactor={16}><div className="boardroom-led">STRATEGY · PITCH · NEGOTIATE</div></Html>
    <LowPolyPerson c={c} pos={[0,0,3]}/>
   </>:<>
    {Array.from({length:8},(_,i)=>{const x=-6.5+(i%4)*4.2,z=-3.1+Math.floor(i/4)*4;
      return <group key={i} position={[x,0,z]}>
       <Box p={[0,.85,0]} size={[2.2,.14,1.24]} color="#a4876e"/>
       <Box p={[0,1.25,-.24]} size={[.85,.66,.09]} color="#414a53"/>
       <Box p={[0,.91,.26]} size={[1.06,.07,.36]} color="#ddd4c7"/>
       <Box p={[0,.35,.85]} size={[.91,.22,.75]} color="#6e6f78"/>
       {i<staff&&<LowPolyPerson c={{...c,outfit:["#729e9b","#d09980","#a092c0","#b3a474"][i%4],skin:"#c28e71"}} pos={[0,0,1.07]} seed={i}/>}
      </group>;
     })}
    <LowPolyPerson c={c} pos={[7,0,3.5]}/>
    <Html position={[0,5.18,-6.68]} center distanceFactor={19}><div className="boardroom-led">YOUR AGENCY · PEOPLE AT WORK</div></Html>
   </>}
  <ContactShadows opacity={.23} scale={22} blur={2.9} far={10} position={[0,-.005,0]}/>
 </group>;
}
function CameraRig({scene,districts,selected,focus,preview,avatarZoom,player,playerActive}:{scene:SceneId;districts:District[];selected:string|null;focus?:string|null;preview?:boolean;avatarZoom?:number;player:React.MutableRefObject<[number,number]>;playerActive:React.MutableRefObject<boolean>}){
 const controls=useRef<any>(null);
 useEffect(()=>{
  const c=controls.current;if(!c)return;
  if(scene==="city"){
   const building=districts.find(b=>b.id===selected);
   if(building)c.setLookAt(building.x+14,Math.max(18,building.h+14),building.z+18,building.x,building.h*.45,building.z,true);
   else c.setLookAt(78,73,86,0,0,0,true);
  }else if(scene==="room"){
   if(preview)c.setLookAt(2.5*(avatarZoom||1),3.5*(avatarZoom||1),6.3*(avatarZoom||1),0,1.2,1.35,true);
   else if(focus==="pc")c.setLookAt(-.8,3.2,1,-2.5,1.24,-3.75,true);
   else if(focus==="board")c.setLookAt(1.9,3.3,-.5,.58,2.28,-5.3,true);
   else if(focus==="phone")c.setLookAt(-1,2.8,.2,-3.31,.99,-3.21,true);
   else if(focus==="wardrobe")c.setLookAt(5,3.4,6,4.54,1.4,1.72,true);
   else c.setLookAt(11.4,10.7,13.8,0,1.25,0,true);
  }
  else c.setLookAt(19,14,19,0,1,0,true);
 },[scene,selected,districts,focus,preview,avatarZoom]);
 useFrame(()=>{if(scene==="city"&&playerActive.current&&!selected&&controls.current){const [x,z]=player.current;controls.current.setLookAt(x+34,39,z+39,x,1,z,false)}});
 return <CameraControls ref={controls} smoothTime={.7} maxPolarAngle={Math.PI/2.12} minDistance={5} maxDistance={scene==="city"?170:27} dollySpeed={.65} truckSpeed={.6} />;
}
export function WorldScene({scene,districts,selected,onSelect,onComputerInteract,onRoomInteract,character,room,staff,quality,focus,preview,avatarYaw,avatarZoom,moveInput=""}:{
 scene:SceneId;districts:District[];selected:string|null;onSelect:(id:string)=>void;onComputerInteract:()=>void;onRoomInteract:(x:RoomAction)=>void;character:Character;room:RoomStyle;staff:number;quality:"high"|"low";focus?:string|null;preview?:boolean;avatarYaw?:number;avatarZoom?:number;moveInput?:string;
}){
 const city=scene==="city";
 const memoDistricts=useMemo(()=>districts,[JSON.stringify(districts)]);
 const playerPosition=useRef<[number,number]>([0,0]);const playerActive=useRef(false);
 return <Canvas key={scene} shadows={quality==="high"} dpr={quality==="high"?[1,1.65]:[1,1]} gl={{antialias:quality==="high",alpha:false,powerPreference:"high-performance"}} camera={{position:city?[78,73,86]:[11.4,10.7,13.8],fov:42,near:.1,far:260}}>
  <color attach="background" args={["#f8eddf"]}/><fog attach="fog" args={["#f8eddf",city?150:36,city?235:70]}/>
  <hemisphereLight args={["#fff7e8","#b8aa97",1.55]}/>
  <ambientLight intensity={.45}/>
  <directionalLight position={[25,37,16]} intensity={2.1} color="#ffeed9" castShadow={quality==="high"} shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-75} shadow-camera-right={75} shadow-camera-top={75} shadow-camera-bottom={-75} shadow-bias={-.00014}/>
  <directionalLight position={[-12,9,-17]} intensity={.65} color="#aeced3"/>
  {city?<City districts={memoDistricts} selected={selected} onSelect={onSelect} c={character} touch={moveInput} position={playerPosition} active={playerActive}/>:scene==="room"?<Room r={room} c={character} onComputerInteract={onComputerInteract} onRoomInteract={onRoomInteract} preview={preview} avatarYaw={avatarYaw}/>:<Office c={character} staff={staff} board={scene==="boardroom"}/>}
  {quality==="high"&&!city&&scene==="room"&&<ContactShadows scale={14} opacity={.2} blur={2.8} far={8} position={[0,-.02,0]}/>}
  <CameraRig scene={scene} districts={memoDistricts} selected={selected} focus={focus} preview={preview} avatarZoom={avatarZoom} player={playerPosition} playerActive={playerActive}/>
 </Canvas>;
}
export function hasWebGL(){
 try{const c=document.createElement("canvas");return !!(c.getContext("webgl2")||c.getContext("webgl"))}catch{return false}
}
