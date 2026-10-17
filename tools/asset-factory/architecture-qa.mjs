/**
 * Geometry-first regression checks targeting the defects reported in screenshots.
 * Inspect actual emitted geometry and real mass surfaces before publishing GLBs.
 */
import fs from "node:fs";
import assert from "node:assert/strict";
import {cityBuildingPlan,buildCityModernist,cityAnchors,cityMediaSlots} from "./city-modernism.mjs";
const assets=JSON.parse(fs.readFileSync("assets/specs/city-all.modernism.json","utf8")).masters;
let attachedWindows=0,checked=0,mediaChecked=0;
for(const a of assets){
 if(a.id==="office-brick")continue; // separately authored hero master
 const p=cityBuildingPlan(a);
 assert.ok(p.volumes.length>=1,a.id+" requires a real structural mass");
 for(const m of p.volumes){
  assert.ok(m.bottom>=0&&m.top<=a.height+.01,a.id+" unsupported height "+m.name);
  assert.ok(Math.abs(m.x)+m.width/2<=a.width*.496+.001,a.id+" over-wide "+m.name);
  assert.ok(Math.abs(m.z)+m.depth/2<=a.depth*.496+.001,a.id+" over-deep "+m.name);
  if(m.bottom>0){
   assert.ok(p.volumes.some(other=>other!==m&&other.bottom<m.bottom+.01&&other.top>=m.bottom-.05&&
    Math.abs(other.x-m.x)<(other.width+m.width)*.39&&Math.abs(other.z-m.z)<(other.depth+m.depth)*.39),
    a.id+" has ungrounded upper mass "+m.name);
  }
 }
 const anchors=cityAnchors(a),slots=cityMediaSlots(a);
 for(const slot of slots){
  assert.ok(Array.isArray(anchors[slot.anchor]),a.id+" missing "+slot.anchor);
  assert.ok(slot.width>0&&slot.height>0&&slot.width<=a.width*.8,a.id+" advertising screen width exceeds facade");
  mediaChecked++;
 }
 for(const lod of [0,1]){
  const boxes=[];
  buildCityModernist((x,y,z,w,h,d,m)=>boxes.push({x,y,z,w,h,d,m}),{...a,tier:1},lod);
  assert.ok(boxes.length>=p.volumes.length+1,a.id+" LOD "+lod+" missing mass");
  const glazing=boxes.filter(q=>q.m===3&&q.h<1.38&&((q.w<Math.max(1.4,a.width*.40)&&q.d<.3)||(q.d<Math.max(1.4,a.depth*.40)&&q.w<.3)));
  if(lod===0&&a.height>7)assert.ok(glazing.length>2,a.id+" has no detailed facade glazing");
  if(lod===1&&a.height>7)assert.ok(glazing.length>=1,a.id+" distant LOD has no visible glazing");
  for(const pane of glazing){
   const attached=p.volumes.some(v=>pane.y>=v.bottom+.1&&pane.y<=v.top-.1&&(
    (Math.abs(pane.z-(v.z+v.depth/2))<=.25&&Math.abs(pane.x-v.x)<v.width/2+.2)||
    (Math.abs(pane.x-(v.x+v.width/2))<=.25&&Math.abs(pane.z-v.z)<v.depth/2+.2)));
   assert.ok(attached,a.id+" pane detached from all facade faces at "+JSON.stringify(pane));
   attachedWindows++;
  }
  checked++;
 }
}
assert.equal(checked,80);
assert.ok(attachedWindows>150);
console.log("ARCHITECTURE SURFACE QA",JSON.stringify({buildings:40,lods:2,checked,attachedWindows,mediaChecked,verified:true}));
