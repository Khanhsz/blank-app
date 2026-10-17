import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const spec=JSON.parse(fs.readFileSync("assets/specs/city-all.modernism.json","utf8"));
const pbr=JSON.parse(fs.readFileSync("assets/specs/pbr-materials.json","utf8"));
const folder=path.join(root,"public/assets/mt-city",spec.version);
const manifest=JSON.parse(fs.readFileSync(path.join(folder,"manifest.json"),"utf8"));
const roles=["STRUCTURE_CONCRETE","FACADE_PLASTER","ROOF_CONCRETE","WINDOW_GLASS","ARCHITECTURAL_ACCENT","PODIUM_STONE","WINDOW_FRAME_METAL","CURTAIN_WALL_GLASS","ALUMINUM_CLADDING","CONCRETE_PANEL","DOOH_HOUSING"];
function gltf(name:string){
 const bin=fs.readFileSync(path.join(folder,name));
 assert.equal(bin.toString("ascii",0,4),"glTF");
 return JSON.parse(bin.subarray(20,20+bin.readUInt32LE(12)).toString("utf8"));
}
test("canonical PBR specification has named roles, stable legacy indices, physically valid properties and palettes",()=>{
 assert.equal(pbr.version,"mt-pbr-v1");
 assert.equal(pbr.roles.length,11);
 assert.deepEqual(pbr.roles.map((r:{name:string})=>r.name),roles);
 for(const [i,r] of pbr.roles.entries()){
  assert.equal(r.index,i);
  assert.ok(r.metallic>=0&&r.metallic<=1);
  assert.ok(r.roughness>=0&&r.roughness<=1);
 }
 assert.ok(pbr.roles[3].roughness<=.32);
 assert.ok(pbr.roles[6].metallic>=.65);
 assert.equal(pbr.roles[0].metallic,0);
 for(const colorSet of Object.values(pbr.palettes) as string[][]){
  assert.equal(colorSet.length,11);
  assert.ok(colorSet.every(c=>/^#[0-9a-fA-F]{6}$/.test(c)));
 }
});
test("all 41 buildings have semantic opaque PBR glTF materials, correct linear colors and no heavy textures",()=>{
 assert.equal(manifest.assets.length,41);
 for(const entry of manifest.assets){
  const g=gltf(path.basename(entry.lod.lod0.uri));
  assert.equal(g.extras.materialSystem,pbr.version);
  assert.equal(g.materials.length,11,entry.id);
  assert.ok(!g.textures?.length&&!g.images?.length,entry.id+" should not embed per-building textures");
  for(const [i,m] of g.materials.entries()){
   assert.match(m.name,new RegExp("^MT_"+roles[i]+"_"));
   assert.equal(m.alphaMode,"OPAQUE");
   assert.equal(m.extras.role,roles[i]);
   assert.equal(m.pbrMetallicRoughness.roughnessFactor,pbr.roles[i].roughness);
   assert.equal(m.pbrMetallicRoughness.metallicFactor,pbr.roles[i].metallic);
   assert.ok(m.pbrMetallicRoughness.baseColorFactor.slice(0,3).every((v:number)=>v>=0&&v<=1));
   assert.equal(m.pbrMetallicRoughness.baseColorFactor[3],1);
  }
  assert.ok(g.meshes[0].primitives.length<=11);
 }
});
test("six representative building GLBs and 18 view projections exist for preflight QA",()=>{
 const ids=["office-brick","client-bloom","rival-muse","creative","arts-residence-a","office-tower"];
 const directory=path.join(folder,"qa");
 const report=JSON.parse(fs.readFileSync(path.join(directory,"projection-report.json"),"utf8"));
 assert.equal(report.source,"geometry-projection-not-browser-screenshot");
 assert.equal(report.assets.length,6);
 assert.ok(fs.readFileSync(path.join(directory,"index.html"),"utf8").includes("NOT screenshots"));
 for(const id of ids){
  const item=report.assets.find((e:{id:string})=>e.id===id);
  assert.ok(item,"missing representative "+id);
  assert.equal(item.views.length,3);
  for(const view of item.views){
   const actual=fs.readFileSync(path.join(folder,view.file.replace("/assets/mt-city/"+spec.version+"/","")),"utf8");
   assert.match(actual,/<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
   assert.match(actual,/polygon points=/);
   assert.ok(view.boxes>12);
  }
 }
});
test("material system is reused by native Blender and the game still forces LOD0",()=>{
 const blender=fs.readFileSync("tools/asset-factory/blender_factory.py","utf8");
 assert.match(blender,/pbr-materials\.json/);
 assert.match(blender,/node\.inputs\["Roughness"\]\.default_value=role\["roughness"\]/);
 const renderer=fs.readFileSync("src/components/game/AssetDistrict.tsx","utf8");
 assert.match(renderer,/<BuildingVisual b=\{b\} lod=\{0\}/);
 assert.match(renderer,/<ModelGeometry id=\{id\} lod=\{0\}/);
 assert.doesNotMatch(renderer,/LODManager/);
});
