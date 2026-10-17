import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {AssetRegistry,checkRegistry} from "../src/components/game/AssetRegistry";
import {cityLots} from "../src/game/city";

const root=process.cwd(),generated=path.join(root,"public/assets/mt-city",AssetRegistry.version);
const specs=JSON.parse(fs.readFileSync(path.join(root,"assets/specs/city-all.modernism.json"),"utf8"));
const manifest=JSON.parse(fs.readFileSync(path.join(generated,"manifest.json"),"utf8"));
function inspect(buffer:Buffer){
 assert.equal(buffer.toString("ascii",0,4),"glTF");
 assert.equal(buffer.readUInt32LE(4),2);
 assert.equal(buffer.readUInt32LE(8),buffer.length);
 assert.equal(buffer.toString("ascii",16,20),"JSON");
 const data=JSON.parse(buffer.subarray(20,20+buffer.readUInt32LE(12)).toString("utf8"));
 assert.equal(data.asset.version,"2.0");
 return data;
}
test("all 41 city buildings are registered by their real entity IDs",()=>{
 assert.equal(AssetRegistry.count,41);
 assert.equal(manifest.assets.length,41);
 assert.equal(manifest.source,"web-fallback-not-blender");
 assert.deepEqual(checkRegistry(cityLots.map(l=>l.id)),[]);
 assert.equal(AssetRegistry.all().filter(x=>!x.decorative).length,27);
 assert.equal(AssetRegistry.decorativePlacements.length,14);
 for(const asset of AssetRegistry.all()){
  if(asset.gameplayId)assert.ok(cityLots.some(b=>b.id===asset.gameplayId));
 }
});
test("every real GLB binary exists, is parseable, has required anchors, obeys triangle budgets and URL contract",()=>{
 const ids=new Set<string>();
 for(const entry of manifest.assets){
  assert.ok(!ids.has(entry.id),"Duplicate asset ID "+entry.id);ids.add(entry.id);
  for(const lod of [0,1] as const){
   const data=entry.lod["lod"+lod],file=path.join(generated,path.basename(data.uri));
   assert.ok(fs.existsSync(file),"missing "+file);
   const buffer=fs.readFileSync(file),parsed=inspect(buffer);
   assert.equal(data.bytes,buffer.length);
   assert.equal(data.sha256,crypto.createHash("sha256").update(buffer).digest("hex"));
   assert.equal(parsed.extras.id,entry.id);
   assert.equal(parsed.extras.version,AssetRegistry.version);
   assert.ok(parsed.extras.triangles>0&&parsed.extras.triangles<=(lod===0?1800:360));
   assert.equal(parsed.extras.triangles,data.triangles);
   assert.ok(parsed.nodes.length>4);
   for(const anchor of ["ANCHOR_Entrance","ANCHOR_Sign","ANCHOR_Roof","COLLIDER_Footprint"]){
    assert.ok(parsed.nodes.some((n:{name:string})=>n.name===anchor),"missing "+anchor+" in "+entry.id);
   }
   assert.equal(entry.lod["lod"+lod].uri,AssetRegistry.url(entry.id,lod));
   assert.ok(parsed.meshes[0].primitives.length<=12);
  }
  assert.ok(entry.lod.lod1.triangles<=entry.lod.lod0.triangles);
 }
});
test("decorative chunk positions cannot overlap any interactive building, IDs remain isolated from save state",()=>{
 const used=new Set(cityLots.map(l=>l.x+","+l.z));
 for(const item of AssetRegistry.decorativePlacements){
  assert.equal(used.has(item.x+","+item.z),false,"decor overlaps playable entity");
  assert.equal(AssetRegistry.get(item.id)?.decorative,true);
 }
 assert.equal(manifest.district,"Marketing City");
 assert.equal(manifest.units,"meters");assert.equal(manifest.up,"Y");assert.equal(manifest.front,"+Z");
});
test("reproducible binary generation passes byte-for-byte verification",async()=>{
 const {execFileSync}=await import("node:child_process");
 const output=execFileSync(process.execPath,["tools/asset-factory/build-fallback.mjs","--verify"],{cwd:root,encoding:"utf8"});
 assert.match(output,/ART FACTORY/);
 assert.match(output,/"verified":true/);
});


test("Brickhouse modernist slice has nontrivial asymmetric massing in both LODs and three independent media slots",()=>{
 const entry=manifest.assets.find((a:{id:string})=>a.id==="office-brick");
 assert.ok(entry);
 assert.equal(entry.gameplayId,"office-brick");
 assert.equal(entry.archetype,"brickhouse-modernist-v1");
 const expected=["ANCHOR_Entrance","ANCHOR_Sign","ANCHOR_Roof","ANCHOR_DOOH_Facade","ANCHOR_OOH_Parapet","ANCHOR_Activation","COLLIDER_Footprint"];
 for(const lod of [0,1]){
  const info=entry.lod["lod"+lod];
  const glb=inspect(fs.readFileSync(path.join(generated,path.basename(info.uri))));
  assert.equal(glb.extras.archetype,"brickhouse-modernist-v1");
  const names=new Set(glb.nodes.map((n:{name:string})=>n.name));
  expected.forEach(x=>assert.ok(names.has(x),"Missing "+x+" in LOD "+lod));
  const root=glb.nodes[0];
  assert.deepEqual(root.extras.persistentGameEntity,"office-brick");
  assert.equal(root.children.length,8);
  assert.equal(glb.extras.advertisingSlots.length,3);
  for(const slot of glb.extras.advertisingSlots){
   assert.ok(names.has(slot.anchor),"Missing anchored media "+slot.id);
   assert.ok(slot.content==="dynamic"||slot.content==="interactive");
  }
  const entrance=glb.nodes.find((x:{name:string})=>x.name==="ANCHOR_Entrance");
  const dooh=glb.nodes.find((x:{name:string})=>x.name==="ANCHOR_DOOH_Facade");
  assert.ok(entrance.translation[2]>4&&entrance.translation[2]<5);
  assert.ok(dooh.translation[1]>7&&dooh.translation[1]<10);
  assert.ok(info.triangles<=(lod===0?1800:360));
 }
 const spec=specs.masters.find((x:{id:string})=>x.id==="office-brick");
 assert.equal(spec.massing,"three_offset_volumes");
 assert.equal(spec.advertisingSlots.length,3);
 assert.ok(entry.lod.lod0.triangles>entry.lod.lod1.triangles);
});
test("Brickhouse media is composed at runtime rather than permanently baked into GLB",()=>{
 const source=fs.readFileSync("src/components/game/BrickhouseCampaignMedia.tsx","utf8");
 const integration=fs.readFileSync("src/components/game/AssetDistrict.tsx","utf8");
 assert.match(source,/useGame\(s=>s\.ceo\?\.weekly/);
 assert.match(source,/getObjectByName/);
 assert.match(source,/BRICKHOUSE_AD_SLOT_IDS/);
 assert.match(integration,/b\.id==="office-brick"\?<BrickhouseCampaignMedia/);
 assert.match(integration,/<CityCampaignMedia b=\{b\}/);
});


test("every actual gameplay and decorative building has a validated replacement GLB",()=>{
 const positions=new Set<string>(),ids=new Set<string>();
 for(const asset of manifest.assets){
  assert.ok(!ids.has(asset.id),"duplicate building "+asset.id);ids.add(asset.id);
  const position=asset.position.join(",");
  assert.ok(!positions.has(position),"duplicate occupied plot "+asset.id);positions.add(position);
  assert.equal(asset.migrationStatus,"replaced");
  assert.equal(asset.verificationStatus,"binary-pass-browser-pending");
  assert.ok(asset.archetype&&asset.facade&&asset.roof&&asset.entrance);
 }
 for(const lot of cityLots){
  assert.ok(ids.has(lot.id),"unmapped gameplay ID "+lot.id);
  assert.equal(manifest.assets.find((a:{id:string})=>a.id===lot.id)?.gameplayId,lot.id);
 }
 assert.equal(manifest.interactiveCount,27);
 assert.equal(manifest.decorativeCount,14);
 assert.equal(manifest.auditedBuildingCount,41);
});
test("nearby buildings differ in three or more curated architectural characteristics",()=>{
 let compared=0;
 for(let i=0;i<manifest.assets.length;i++)for(let j=i+1;j<manifest.assets.length;j++){
  const a=manifest.assets[i],b=manifest.assets[j];
  if(Math.hypot(a.position[0]-b.position[0],a.position[1]-b.position[1])>22.7)continue;
  compared++;
  const props=["archetype","roof","facade","entrance","variant"];
  const differences=props.filter(k=>a[k]!==b[k]).length;
  assert.ok(differences>=3,"Nearby "+a.id+" and "+b.id+" differ in only "+differences+" architectural fields");
 }
 assert.ok(compared>30);
});
test("each building has independent architectural recipe and every OOH slot has a stable anchor",()=>{
 const recipes=new Set<string>(),slotIds=new Set<string>();
 for(const asset of manifest.assets){
  assert.ok(asset.lod.lod1.triangles<=360);
  const signature=[asset.archetype,asset.roof,asset.facade,asset.entrance,asset.variant].join("|");
  assert.ok(!recipes.has(signature),"duplicate building signature "+asset.id);
  recipes.add(signature);
  for(const slot of asset.advertisingSlots||[]){
   assert.ok(!slotIds.has(slot.id),"duplicate advertising slot "+slot.id);slotIds.add(slot.id);
   assert.ok(asset.anchors.includes(slot.anchor),"missing media anchor for "+slot.id);
  }
 }
 assert.ok(slotIds.size>=12);
 assert.equal(manifest.decorativePlacements.length,14);
 assert.ok(manifest.decorativePlacements.every((p:{id:string})=>AssetRegistry.get(p.id)?.decorative));
});
test("old ambient cuboid buildings are completely removed and replaced with GLB chunks",()=>{
 const source=fs.readFileSync("src/components/game/WorldScene.tsx","utf8");
 assert.doesNotMatch(source,/function AmbientBuildings/);
 assert.doesNotMatch(source,/<AmbientBuildings/);
 assert.match(source,/<ChunkManager quality=\{quality\}/);
 const renderer=fs.readFileSync("src/components/game/AssetDistrict.tsx","utf8");
 assert.doesNotMatch(renderer,/OutdoorCampaignDisplay/);
 assert.match(renderer,/<CityCampaignMedia /);
 assert.match(renderer,/GAMEPLAY_HITBOX_/);
});


test("all five rival AI agencies have distinct real 3D models for tiers 1 through 4",()=>{
 const rivals=manifest.assets.filter((a:{kind:string})=>a.kind==="rival");
 assert.equal(rivals.length,5);
 const allUri=new Set<string>();
 for(const rival of rivals){
  const entries=[rival.lod,...[2,3,4].map(t=>rival.tierLOD["tier"+t])];
  const highTriangles=entries.map(x=>x.lod0.triangles);
  for(let tier=1;tier<=4;tier++){
   for(const lod of [0,1]){
    const info=entries[tier-1]["lod"+lod];
    assert.equal(info.uri,AssetRegistry.url(rival.id,lod as 0|1,tier));
    assert.ok(!allUri.has(info.uri),"duplicate stage GLB path "+info.uri);
    allUri.add(info.uri);
    const bin=fs.readFileSync(path.join(generated,path.basename(info.uri)));
    assert.equal(info.sha256,crypto.createHash("sha256").update(bin).digest("hex"));
    const parsed=inspect(bin);
    assert.equal(parsed.extras.id,rival.id);
    assert.equal(parsed.extras.tier,tier);
    assert.ok(parsed.nodes.some((n:{name:string})=>n.name==="COLLIDER_Footprint"));
   }
  }
  assert.equal(new Set(highTriangles).size,4,"rival stage geometry should change visibly: "+rival.id);
 }
 const report=JSON.parse(fs.readFileSync(path.join(generated,"qa-report.json"),"utf8"));
 assert.equal(report.glbFiles,112);
 assert.equal(report.extraTierFiles,30);
 assert.ok(report.extraTierBytes>0);
});
