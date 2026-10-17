import {useLayoutEffect,useMemo,useRef} from "react";
import * as THREE from "three";

/** One GPU draw call for all 360 road markings instead of 360 separate Box meshes.
 * Road/sidewalk geometry and the original colors/coordinates remain unchanged.
 */
export interface RoadMarking {
 position:[number,number,number];
 size:[number,number,number];
 color:string;
}
export function makeRoadMarkings(roadsX:readonly number[],roadsZ:readonly number[]):RoadMarking[]{
 return [
  ...roadsZ.flatMap(z=>Array.from({length:24},(_,i)=>({
   position:[-61+i*5.3,.068,z] as [number,number,number],
   size:[2.2,.012,.07] as [number,number,number],
   color:"#eee2cd"
  }))),
  ...roadsX.flatMap(x=>Array.from({length:20},(_,i)=>({
   position:[x,.07,-49+i*5.15] as [number,number,number],
   size:[.08,.016,1.9] as [number,number,number],
   color:"#f1e6d4"
  }))),
  ...roadsX.flatMap(x=>roadsZ.flatMap(z=>[-1.15,-.52,.12,.76].map(a=>({
   position:[x+a,.115,z+3.15] as [number,number,number],
   size:[.25,.016,.75] as [number,number,number],
   color:"#f1eadd"
  }))))
 ];
}

export function CityRoadMarkings({roadsX,roadsZ}:{roadsX:readonly number[];roadsZ:readonly number[]}){
 const mesh=useRef<THREE.InstancedMesh>(null);
 const marks=useMemo(()=>makeRoadMarkings(roadsX,roadsZ),[roadsX,roadsZ]);
 useLayoutEffect(()=>{
  const instance=mesh.current;
  if(!instance)return;
  const transform=new THREE.Object3D();
  const color=new THREE.Color();
  for(let i=0;i<marks.length;i++){
   const mark=marks[i];
   transform.position.set(...mark.position);
   transform.scale.set(...mark.size);
   transform.updateMatrix();
   instance.setMatrixAt(i,transform.matrix);
   instance.setColorAt(i,color.set(mark.color));
  }
  instance.instanceMatrix.needsUpdate=true;
  if(instance.instanceColor)instance.instanceColor.needsUpdate=true;
  instance.computeBoundingSphere();
 },[marks]);
 return <instancedMesh ref={mesh} args={[undefined,undefined,marks.length]} receiveShadow>
  <boxGeometry args={[1,1,1]}/>
  <meshStandardMaterial color="#ffffff" roughness={.86} metalness={.02}/>
 </instancedMesh>;
}
