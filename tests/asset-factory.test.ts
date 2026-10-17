import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import {AssetRegistry,checkRegistry} from "../src/components/game/AssetRegistry";
import {cityLots} from "../src/game/city";

const root=process.cwd(),generated=path.join(root,"public/assets/mt-city",AssetRegistry.version);
const specs=JSON.parse(fs.readFileSync(path.join(root,"assets/specs/arts-quarter.slice.json"),"utf8"));
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
test("vertical slice registers 10 deterministic masters and retains original entity IDs",()=>{
 assert.equal(AssetRegistry.count,10);
 assert.equal(manifest.assets.length,10);
 assert.equal(manifest.source,"web-fallback-not-blender");
 assert.deepEqual(checkRegistry(cityLots.map(l=>l.id)),[]);
 assert.equal(AssetRegistry.all().filter(x=>!x.decorative).length,6);
 assert.equal(AssetRegistry.decorativePlacements.length,4);
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
 assert.equal(manifest.district,"Arts Quarter");
 assert.equal(manifest.units,"meters");assert.equal(manifest.up,"Y");assert.equal(manifest.front,"+Z");
});
test("reproducible binary generation passes byte-for-byte verification",async()=>{
 const {execFileSync}=await import("node:child_process");
 const output=execFileSync(process.execPath,["tools/asset-factory/build-fallback.mjs","--verify"],{cwd:root,encoding:"utf8"});
 assert.match(output,/ART FACTORY/);
 assert.match(output,/"verified":true/);
});
