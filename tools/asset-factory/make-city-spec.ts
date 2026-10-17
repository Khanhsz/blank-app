/**
 * Regenerate architecture specs from ACTUAL game CityLots + ambient grid.
 * Fails closed if a live gameplay building has no curated architecture.
 * Run before any GLB build; no fabricated location data.
 */
import {cityLots} from "../../src/game/city";
import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const art=JSON.parse(fs.readFileSync(path.join(root,"assets/specs/city-art-direction.json"),"utf8"));
const slice=JSON.parse(fs.readFileSync(path.join(root,"assets/specs/arts-quarter.slice.json"),"utf8"));
const existing=JSON.parse(fs.readFileSync(path.join(root,"assets/specs/city-all.modernism.json"),"utf8"));
const real=cityLots.map(l=>({id:l.id,name:l.name,kind:l.kind,district:l.district,x:l.x,z:l.z,w:l.w,d:l.d,h:l.h}));
const decorations=slice.masters.filter((x:{decorative?:boolean})=>x.decorative).map((x:{id:string;name:string;width:number;depth:number;height:number})=>{
 const place=slice.decorativePlacements.find((p:{id:string})=>p.id===x.id);
 if(!place)throw Error("Decor placement missing "+x.id);
 return {id:x.id,name:x.name,kind:"decorative",district:"Arts Quarter",x:place.x,z:place.z,w:x.width,d:x.depth,h:x.height};
});
const used=new Set([...real,...decorations].map(l=>l.x+","+l.z));
const xs=[-48,-32,-16,0,16,32,48],zs=[-40,-24,-8,8,24,40];
const ambient=xs.flatMap((x,i)=>zs.map((z,j)=>({x,z,i,j}))).filter(l=>!used.has(l.x+","+l.z)&&!(l.x===0&&(l.z===-8||l.z===8))).map(l=>({
 id:"ambient-"+(l.x<0?"m"+Math.abs(l.x):"p"+l.x)+"-"+(l.z<0?"m"+Math.abs(l.z):"p"+l.z),
 name:"Modernist Block "+(l.i*6+l.j+1),kind:"ambient",district:"Residential Grid",
 x:l.x,z:l.z,w:8.2,d:8.4,h:4+((l.i*5+l.j*3)%7)*1.6
}));
const slots=(id:string,role:string)=>{
 if(id==="office-brick")return ["brickhouse-dooh-main","brickhouse-ooh-parapet","brickhouse-activation"];
 const o:string[]=[];
 if(["broadcast","retail","creator","client"].includes(role))o.push(id+":dooh:front");
 if(["agency","creative","corporate","client"].includes(role))o.push(id+":ooh:parapet");
 if(["creator","creative"].includes(role))o.push(id+":iooh:entry");
 return o;
};
const masters=[...real,...decorations,...ambient].map((l,i)=>{
 const a=art.buildings[l.id];
 if(!a)throw Error("Uncurated actual city building "+l.id);
 return {
  id:l.id,name:l.name,class:l.kind,district:l.district,gameplayId:i<real.length?l.id:null,
  decorative:i>=real.length,x:l.x,z:l.z,width:l.w,depth:l.d,height:Number(l.h.toFixed(3)),
  floors:Math.max(1,Math.round(l.h/3.05)),archetype:a.archetype,facade:a.facade,roof:a.roof,entrance:a.entrance,
  palette:a.palette,massingStyle:i%4,variant:i%5,seed:1001+i*31,function:a.use,advertisingSlots:slots(l.id,a.use),
  ...(l.id==="office-brick"?{massing:"three_offset_volumes"}:{}),
  priorAsset:slice.masters.some((x:{id:string})=>x.id===l.id)?"GLB slice-3":"procedural geometry"
 };
});
// Deliberate differentiation for adjacent structures; kept in the generating
// source so npm run assets:build does not erase hand-edited GLB metadata.
const curatedOverrides:Record<string,Record<string,string|number>>={
 "office-loft":{roof:"offset"},
 "ambient-p48-m24":{archetype:"stacked",facade:"grid",entrance:"recessed"},
 "ambient-p32-m8":{facade:"grid",entrance:"arcade"},
 "office-tower":{facade:"grid"},
 "client-vertex":{entrance:"atrium"},
 "ambient-p0-p40":{roof:"flat",facade:"grid"},
 "arts-residence-a":{facade:"recessed"},
 "ambient-m16-m24":{facade:"grid"},
 "arts-retail":{variant:1},
 "office-brick":{massing:"three_offset_volumes"}
};
for(const master of masters){const custom=curatedOverrides[master.id];if(custom)Object.assign(master,custom)}
const architecturalProps=["archetype","roof","facade","entrance","variant"] as const;
for(let i=0;i<masters.length;i++)for(let j=i+1;j<masters.length;j++){
 const a=masters[i],b=masters[j];
 const difference=architecturalProps.filter(key=>a[key]!==b[key]).length;
 if(difference===0)throw Error("Duplicate architectural signature: "+a.id+" / "+b.id);
 if(Math.hypot(a.x-b.x,a.z-b.z)<=22.7&&difference<3)
  throw Error("Insufficient nearby architectural differentiation: "+a.id+" / "+b.id+" ("+difference+")");
}
if(masters.length!==41||real.length!==27||decorations.length!==4||ambient.length!==10)throw Error("Actual city counts changed: review architecture manifest before building");
const ids=new Set(masters.map(x=>x.id));
if(ids.size!==masters.length)throw Error("Duplicate city ID");
const allPositions=new Set(masters.map(x=>x.x+","+x.z));
if(allPositions.size!==masters.length)throw Error("Overlapping city grid cells");
const unexpected=Object.keys(art.buildings).filter(x=>!ids.has(x));
if(unexpected.length)throw Error("Stale architectural IDs: "+unexpected.join(", "));
const spec={schemaVersion:2,version:existing.version,district:"Marketing City",
 source:"src/game/city.ts + WorldScene.tsx ambient grid + curated architecture",units:"m",axes:"Y_UP",
 face:"positive_z",seed:41529,masters,
 decorativePlacements:masters.filter(x=>x.decorative).map(({id,x,z})=>({id,x,z})),
 auditedBuildingCount:masters.length,auditedInteractiveCount:real.length,auditedDecorativeCount:masters.length-real.length};
fs.writeFileSync(path.join(root,"assets/specs/city-all.modernism.json"),JSON.stringify(spec,null,2)+"\n");
console.log("CITY ARCHITECTURE INVENTORY",JSON.stringify({total:masters.length,interactive:real.length,decorative:masters.length-real.length,archetypes:new Set(masters.map(m=>m.archetype)).size}));
