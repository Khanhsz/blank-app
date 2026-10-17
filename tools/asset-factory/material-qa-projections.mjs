/**
 * Static, deterministic QA projections of the *actual procedural GLB box geometry*.
 * NOT screenshots from Three.js / Blender. For inspection before rollout and
 * comparing front, right and isometric faces of 6 real city buildings.
 * This script never modifies gameplay or the 3D world renderer.
 */
import fs from "node:fs";
import path from "node:path";
import {buildBrickhouseModernist} from "./brickhouse-modernism.mjs";
import {buildCityModernist} from "./city-modernism.mjs";
import {pbrColors,MATERIAL_ROLE_NAMES} from "./material-system.mjs";
const root=process.cwd();
const cfg=JSON.parse(fs.readFileSync("assets/specs/city-all.modernism.json","utf8"));
const ids=["office-brick","client-bloom","rival-muse","creative","arts-residence-a","office-tower"];
const output=path.join(root,"public/assets/mt-city",cfg.version,"qa");
fs.mkdirSync(output,{recursive:true});
const faces=[
 {side:"front",v:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]],shade:1.0},
 {side:"right",v:[[1,0,0],[1,0,1],[1,1,1],[1,1,0]],shade:.77},
 {side:"top",v:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],shade:1.12}
];
const color=(hex,factor)=>{
 const values=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 return "#"+values.map(v=>Math.max(0,Math.min(255,Math.round(v*factor))).toString(16).padStart(2,"0")).join("");
};
function makeSVG(asset,view){
 const boxes=[];
 const box=(x,y,z,w,h,d,role)=>boxes.push({x,y,z,w,h,d,role});
 if(asset.id==="office-brick")buildBrickhouseModernist(box,asset,0);
 else buildCityModernist(box,asset,0);
 if(!boxes.length)throw Error("Preview has no geometry: "+asset.id);
 const palette=pbrColors(asset);
 const w=asset.width,h=asset.height,d=asset.depth;
 const cs=(view==="isometric"?Math.min(22,330/(w+d+3),270/(h+5)):Math.min(25,340/Math.max(w,d),275/(h+4)));
 const project=(x,y,z)=>{
  if(view==="front")return [280+x*cs,394-y*cs];
  if(view==="side")return [280-z*cs,394-y*cs];
  return [280+(x-z)*cs*.83,335+(x+z)*cs*.38-y*cs*.95];
 };
 const polygons=[];
 for(const b of boxes){
  if(b.role<0||b.role>=palette.length)throw Error("Invalid role "+b.role+" in "+asset.id);
  const x0=b.x-b.w/2,x1=b.x+b.w/2,y0=b.y-b.h/2,y1=b.y+b.h/2,z0=b.z-b.d/2,z1=b.z+b.d/2;
  for(const face of faces){
   if(view==="front"&&face.side!=="front")continue;
   if(view==="side"&&face.side!=="right")continue;
   const vertices=face.v.map(([x,y,z])=>project(x?x1:x0,y?y1:y0,z?z1:z0));
   // Use a strict painting order from camera-positive x/z; not a 3D screenshot.
   const distance=face.side==="front"?z1:face.side==="right"?x1:y1;
   const depth=view==="front"?z1:view==="side"?x1:b.x+b.z+distance*.07;
   polygons.push({points:vertices,depth,fill:color(palette[b.role],face.shade),side:face.side,role:b.role});
  }
 }
 polygons.sort((a,b)=>a.depth-b.depth);
 const svg=['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 480" width="560" height="480">'];
 svg.push('<rect width="560" height="480" fill="#e7edf0"/>');
 svg.push('<rect x="14" y="14" width="532" height="452" rx="8" fill="#f6f8fa" stroke="#c2cfd5"/>');
 svg.push('<ellipse cx="280" cy="404" rx="155" ry="22" fill="#afbbc4" opacity=".23"/>');
 for(const f of polygons){
  const pts=f.points.map(p=>p.map(n=>n.toFixed(2)).join(",")).join(" ");
  svg.push('<polygon points="'+pts+'" fill="'+f.fill+'" stroke="#263e4c" stroke-opacity=".075" stroke-width=".6"/>');
 }
 const txt=v=>String(v).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
 svg.push('<rect x="14" y="14" width="532" height="65" fill="#17394b" rx="8"/>');
 svg.push('<rect x="14" y="57" width="532" height="22" fill="#17394b"/>');
 svg.push('<text x="30" y="38" fill="#ffffff" font-family="Arial,sans-serif" font-weight="700" font-size="16">'+txt(asset.name)+'</text>');
 svg.push('<text x="30" y="59" fill="#c9e4df" font-family="Arial,sans-serif" font-size="11">'+txt(asset.archetype+' / '+view.toUpperCase()+' / '+cfg.version)+'</text>');
 svg.push('<text x="30" y="447" fill="#395261" font-family="Arial,sans-serif" font-size="10">QA projection of procedural cuboid geometry · NOT a Three.js screenshot</text>');
 svg.push('</svg>');
 const name=asset.id+"-"+view+".svg";
 fs.writeFileSync(path.join(output,name),svg.join("\n"));
 return {file:"/assets/mt-city/"+cfg.version+"/qa/"+name,boxes:boxes.length,materialRoles:[...new Set(boxes.map(x=>MATERIAL_ROLE_NAMES[x.role]))].sort(),bytes:Buffer.byteLength(svg.join("\n"))};
}
const result={source:"geometry-projection-not-browser-screenshot",version:cfg.version,viewAngles:["front","side","isometric"],assets:[]};
for(const id of ids){
 const asset=cfg.masters.find(x=>x.id===id);
 if(!asset)throw Error("Missing representative asset "+id);
 const renders=["front","side","isometric"].map(view=>makeSVG(asset,view));
 if(new Set(renders.map(x=>x.boxes)).size!==1)throw Error("Inconsistent geometry projection "+id);
 result.assets.push({id,archetype:asset.archetype,materialPalette:asset.palette,views:renders});
}
fs.writeFileSync(path.join(output,"projection-report.json"),JSON.stringify(result,null,2)+"\n");
const gallery=['<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
'<title>Marketing Tycoon · PBR Architectural QA</title>',
'<style>body{margin:0;background:#e7edf0;color:#1c3746;font-family:Arial,sans-serif;padding:24px;max-width:1440px;margin:auto}h1{font-size:26px}p{color:#435965}section{background:#fff;border:1px solid #b7cad1;border-radius:8px;padding:15px;margin:20px 0}h2{font-size:18px;margin:0 0 14px}.views{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}figure{margin:0}img{display:block;width:100%;border-radius:6px;border:1px solid #d4dce1}figcaption{font-size:12px;font-weight:700;margin:5px 0 0}@media(max-width:850px){.views{grid-template-columns:1fr}}.warning{padding:12px;border:1px solid #d4b782;border-radius:6px;background:#fff7e6}</style></head><body>',
'<h1>Marketing Tycoon V5.3 — PBR Material Visual QA</h1>',
'<p class="warning">These are exact-geometry SVG QA projections generated from procedural cuboids, NOT screenshots from Blender or the Three.js browser. Final approval requires inspecting the live game.</p>'];
for(const entry of result.assets){
 gallery.push('<section><h2>'+entry.id.replace(/[^a-z0-9-]/gi,"")+' — '+entry.archetype+'</h2><div class="views">');
 for(const view of entry.views)gallery.push('<figure><img loading="lazy" src="'+path.basename(view.file)+'" alt="'+entry.id+' '+path.basename(view.file)+'"><figcaption>'+path.basename(view.file).split("-").at(-1).replace(".svg","").toUpperCase()+'</figcaption></figure>');
 gallery.push('</div></section>');
}
gallery.push('</body></html>');
fs.writeFileSync(path.join(output,"index.html"),gallery.join("\n"));
console.log("MATERIAL QA PROJECTIONS",JSON.stringify({assets:result.assets.length,views:18,output,source:result.source}));
