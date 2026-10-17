import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {assetScale,selectCityLOD} from "../src/components/game/AssetRegistry";
import {makeRoadMarkings} from "../src/components/game/CityRoadMarkings";

const roadsX=[-40,-24,-8,8,24,40];
const roadsZ=[-32,-16,0,16,32];

test("all existing road stripes preserve geometry, placement and palette when instanced",()=>{
 const marks=makeRoadMarkings(roadsX,roadsZ);
 assert.equal(marks.length,360);
 assert.equal(marks.filter(m=>m.color==="#eee2cd").length,120);
 assert.equal(marks.filter(m=>m.color==="#f1e6d4").length,120);
 assert.equal(marks.filter(m=>m.color==="#f1eadd").length,120);
 assert.deepEqual(marks[0],{position:[-61,.068,-32],size:[2.2,.012,.07],color:"#eee2cd"});
 assert.deepEqual(marks[120],{position:[-40,.07,-49],size:[.08,.016,1.9],color:"#f1e6d4"});
 assert.deepEqual(marks[240],{position:[-41.15,.115,-28.85],size:[.25,.016,.75],color:"#f1eadd"});
 assert.ok(marks.every(m=>m.size.every(d=>d>0)&&m.position.every(Number.isFinite)));
});

test("LOD hysteresis keeps near and distant assets stable near the threshold",()=>{
 assert.equal(selectCityLOD(63.9,"high",false,1),0);
 assert.equal(selectCityLOD(67,"high",false,1),1);
 assert.equal(selectCityLOD(67,"high",false,0),0);
 assert.equal(selectCityLOD(76,"high",false,0),1);
 assert.equal(selectCityLOD(500,"high",true,1),0);
 assert.equal(selectCityLOD(0,"low",true,0),1);
});

test("model and marketing overlays share the same scale for rival expansion tiers",()=>{
 assert.deepEqual(assetScale("office-brick",{w:10,h:12,d:10}),[1,1,1]);
 const upgraded=assetScale("rival-atlas",{w:11,h:29,d:10});
 assert.equal(upgraded[0],1);
 assert.equal(upgraded[1],29/23);
 assert.equal(upgraded[2],1);
 const renderer=fs.readFileSync("src/components/game/AssetDistrict.tsx","utf8");
 assert.match(renderer,/<group scale=\{scale\}>/);
 assert.match(renderer,/<ModelGeometry id=\{b.id\} lod=\{lod\} tier=\{b.tier\} scale=\{scale\}/);
 for(const path of ["src/components/game/CityCampaignMedia.tsx","src/components/game/BrickhouseCampaignMedia.tsx"]){
  const media=fs.readFileSync(path,"utf8");
  assert.match(media,/masterWidth/,"master-space advertising geometry in "+path);
 }
});
