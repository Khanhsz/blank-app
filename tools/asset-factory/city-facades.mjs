import {MATERIAL_ROLE as MAT} from "./material-system.mjs";
/**
 * Marketing Tycoon: real wall-mounted facade finishes (all modernist archetypes).
 * Works with the same Y-up cuboid emitter as the GLB factory.
 *
 * LOD0 = readable architectural detail; LOD1 = actual facade rhythm from city view.
 * Capped per-building window budget keeps these assets small on mobile GPUs.
 */
const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
const visibleOnFace=(v,other,side,x,y,z)=>{
 if(other===v)return false;
 if(y<other.bottom+.08||y>other.top-.08)return false;
 // Only block windows that are truly located behind the *other mass*.
 const epsilon=.07;
 if(side==="front"){
  return Math.abs(x-other.x)<other.width*.5-epsilon&&z>other.z-other.depth*.5+epsilon&&z<other.z+other.depth*.5-epsilon;
 }
 return Math.abs(z-other.z)<other.depth*.5-epsilon&&x>other.x-other.width*.5+epsilon&&x<other.x+other.width*.5-epsilon;
};
function isScreenBlocking(p,v,x,y,z){
 if(!p.dooh)return false;
 return Math.abs(z-p.dooh.z)<.4&&Math.abs(x-p.dooh.x)<p.dooh.width*.52+.09&&Math.abs(y-p.dooh.y)<p.dooh.height*.55+.07;
}
export function addArchitecturalFacades(box,p,a,lod){
 const b=(x,y,z,w,h,d,m)=>box(x,y,z,w,h,d,m);
 const detailed=lod===0;
 // More than one real material has to be visible on every level, even at reduced LOD.
 const glassBudget=detailed?42:11; // capped for 1800-triangle maximumlet rendered=0,frontCount=0,sideCount=0;
 const featureVolumes=[...p.volumes].sort((a,b)=>b.height-a.height||b.width-a.width);
 // Deterministic facade treatment: different building uses receive different
 // amounts of glass, concrete panels and metal, rather than random pastel cubes.
 const glassForward=(a.class==="client"||a.class==="rival"||["client","corporate","agency","creative"].includes(a.function));
 const isOffice=a.class==="office"||a.function==="office";
 const isResidential=a.decorative||a.function==="decorative";

 for(const v of featureVolumes){
  if(v.height<3.0||v.width<1.45)continue;
  const rows=Math.min(detailed?7:4,Math.max(1,Math.floor(v.height/(detailed?2.7:3.25))));
  const frontColumns=clamp(Math.floor(v.width/(detailed?1.85:2.8)),1,detailed?3:2);
  const sideColumns=clamp(Math.floor(v.depth/(detailed?2.5:4)),1,detailed?2:1);
  const totalRows=rows;
  // Evenly distribute window centres between the roof and the ground floor.
  const windowFloorMargin=clamp(v.height*.16,.8,1.35);
  const usable=v.height-windowFloorMargin*2;
  for(let r=0;r<totalRows;r++){
   const y=v.bottom+windowFloorMargin+(r+.5)*usable/totalRows;
   if(y>v.top-.48)continue;
   const windowH=clamp(usable/totalRows*(a.facade==="vertical"?.56:.39),detailed?.49:.38,detailed?1.12:.86);
   // Street-facing facade: mounting positions derived directly from this specific mass.
   for(let col=0;col<frontColumns;col++){
    if(rendered>=glassBudget)break;
    const x=v.x+((col+.5)/frontColumns-.5)*v.width*.83;
    const span=clamp(v.width*.68/frontColumns,.36,detailed?1.15:1.68);
    const face=v.z+v.depth/2+.075;
    if(p.volumes.some(other=>visibleOnFace(v,other,"front",x,y,face)))continue;
    if(isScreenBlocking(p,v,x,y,face))continue;
    if(detailed){
     b(x,y,face,span+.12,windowH+.13,.075,MAT.WINDOW_FRAME_METAL); // warm concrete window reveal
     b(x,y,face+.073,span,windowH,.065,MAT.WINDOW_GLASS); // tinted-glass pane
     if(a.facade==="balcony"||a.facade==="zigzag"){
      // Shallow attached balcony on selected levels only
      if((r+col)%2===0)b(x,y-windowH*.63,face+.15,span+.23,.10,.25,4);
     }
    }else{
     b(x,y,face,span,windowH,.07,MAT.WINDOW_GLASS); // single wide glass pane is readable at city scale
    }
    rendered++;frontCount++;
   }
   // The isometric camera looks into right walls: finish them as well.
   for(let col=0;col<sideColumns;col++){
    if(rendered>=glassBudget)break;
    const z=v.z+((col+.5)/sideColumns-.5)*v.depth*.70;
    const span=clamp(v.depth*.55/sideColumns,.35,detailed?1.10:1.38);
    const face=v.x+v.width/2+.075;
    if(p.volumes.some(other=>visibleOnFace(v,other,"right",face,y,z)))continue;
    if(detailed){
     b(face,y,z,.075,windowH+.13,span+.12,MAT.WINDOW_FRAME_METAL);
     b(face+.073,y,z,.065,windowH,span,MAT.WINDOW_GLASS);
    }else b(face,y,z,.07,windowH,span,MAT.WINDOW_GLASS);
    rendered++;sideCount++;
   }
   if(detailed&&r>0&&r%2===0&&v.width>3.7){
    const wallZ=v.z+v.depth/2+.04;
    const outside=p.volumes.every(o=>!visibleOnFace(v,o,"front",v.x,y,wallZ));
    if(outside)b(v.x,y-windowH*.78,wallZ,v.width*.88,.10,.15,2);
   }
  }
 }
 // Shared facade material detailing. All panel seams are attached to the actual
 // front/right wall face; these do not use a fabricated whole-lot facade plane.
 // No texture files are used (0 additional texture-memory overhead).
 if(detailed){
  for(const [index,v] of featureVolumes.entries()){
   if(v.height<4||v.width<2.6)continue;
   const front=v.z+v.depth/2+.024;
   const right=v.x+v.width/2+.024;
   const exposed=p.volumes.every(other=>!visibleOnFace(v,other,"front",v.x,v.bottom+v.height*.67,front));
   if(exposed){
    const count=glassForward?3:2;
    // Precast panel joints or horizontal metal feature seams, depending on use.
    for(let k=1;k<=count;k++){
     const y=v.bottom+v.height*k/(count+1);
     if(p.dooh&&Math.abs(y-p.dooh.y)<p.dooh.height*.55+.19&&Math.abs(v.x-p.dooh.x)<v.width*.52)continue;
     b(v.x,y,front,v.width*.87,.055,.045,glassForward?MAT.ALUMINUM_CLADDING:MAT.CONCRETE_PANEL);
    }
    // Curtain wall panel is mounted behind the existing window frames.
    // Keep residential/office windows punched into visible solid masonry instead.
    if(glassForward&&index<2&&v.height>6){
     const curtainHeight=Math.min(v.height*.48,6.5);
     const cy=v.bottom+v.height*.53;
     if(!p.dooh||Math.abs(cy-p.dooh.y)>curtainHeight*.55+p.dooh.height*.55){
      b(v.x,cy,front-.009,v.width*.58,curtainHeight,.028,MAT.CURTAIN_WALL_GLASS);
      // Graphite vertical mullions separate glass into panels.
      for(let j=-1;j<=1;j++)b(v.x+j*v.width*.17,cy,front+.020,.055,curtainHeight,.052,MAT.WINDOW_FRAME_METAL);
     }
    }else if(isOffice||isResidential){
     // One offset plaster/concrete color panel, attached with no floating gap.
     const k=((a.seed||1)+index*13)%2===0?-1:1;
     const panelX=v.x+k*v.width*.27;
     b(panelX,v.bottom+v.height*.57,front-.005,v.width*.13,v.height*.38,.038,MAT.CONCRETE_PANEL);
    }
   }
   // Isometric city view exposes right-hand facade. Light vertical seams make
   // concrete surfaces coherent from that angle as well.
   if(v.depth>3.4){
    const visibleRight=p.volumes.every(other=>!visibleOnFace(v,other,"right",right,v.bottom+v.height*.5,v.z));
    if(visibleRight){
     for(let k=-1;k<=1;k+=2){
      const zz=v.z+k*v.depth*.27;
      b(right,v.bottom+v.height*.54,zz,.042,v.height*.64,.055,MAT.ALUMINUM_CLADDING);
     }
    }
   }
  }
 }
 // Finished lobby and canopy, using the ground-level facade with the furthest street access.
 const e=p.entrance;
 const entranceW=Math.min(a.width*.25,2.1);
 b(e.x,1.23,e.z-.065,entranceW+.26,2.38,.16,6); // recessed doorframe
 b(e.x,1.18,e.z+.052,entranceW,2.08,.08,3);      // lobby glazing
 if(detailed){
  b(e.x,1.23,e.z+.115,.09,2.0,.10,6);
  b(e.x,2.34,e.z+.080,entranceW+.30,.18,.17,1);
  b(e.x,2.77,e.z-.11,entranceW+1.10,.18,.64,2); // supported awning
  b(e.x+entranceW*.37,1.20,e.z+.14,.055,.17,.12,4);
 }else{
  b(e.x,2.64,e.z-.07,entranceW+.70,.20,.44,2);
 }
 // Premium silhouette details at each roof with compact LOD budgets.
 const roof=p.primary;
 if(detailed){
  if(["pergola","green","terrace"].includes(a.roof)){
   for(const k of [-1,0,1]){
    b(roof.x+k*roof.width*.24,roof.top+.33,roof.z,.11,.52,roof.depth*.55,4);
   }
   b(roof.x,roof.top+.64,roof.z,roof.width*.65,.11,roof.depth*.52,4);
  }else if(["crown","spire"].includes(a.roof)){
   b(roof.x,roof.top+.27,roof.z,roof.width*.62,.42,roof.depth*.63,6);
   b(roof.x,roof.top+.61,roof.z,roof.width*.20,.25,roof.depth*.29,2);
  }else if(a.roof==="sawtooth"){
   for(const k of [-1,0,1])b(roof.x+k*roof.width*.23,roof.top+.28,roof.z,roof.width*.21,.43,roof.depth*.55,k===0?4:2);
  }else if(["offset","cantilever"].includes(a.roof)){
   b(roof.x+roof.width*.10,roof.top+.27,roof.z,roof.width*.66,.37,roof.depth*.64,4);
  }else{
   b(roof.x,roof.top+.20,roof.z,roof.width*.34,.32,roof.depth*.27,6); // HVAC enclosure
  }
  // Small roof mechanical system that gives even residential buildings a completed outline.
  b(roof.x-roof.width*.25,roof.top+.19,roof.z-roof.depth*.17,roof.width*.12,.25,roof.depth*.13,6);
 }else{
  b(roof.x,roof.top+.22,roof.z-roof.depth*.12,roof.width*.31,.32,roof.depth*.25,6);
 }
 return {glazingCount:rendered,frontCount,sideCount};
}
