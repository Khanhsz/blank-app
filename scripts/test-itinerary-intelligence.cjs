'use strict';
// Small deterministic smoke tests of the actual TS functions without a test
// framework or external API calls. Only locally checked-in files are compiled.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('typescript');
const loaded=new Map();
function read(modulePath){
 const full=path.resolve(process.cwd(),modulePath);
 if(loaded.has(full))return loaded.get(full).exports;
 const mod={exports:{}};loaded.set(full,mod);
 const input=fs.readFileSync(full,'utf8');
 const result=ts.transpileModule(input,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true
 }});
 const link=id=>{
  if(id==='./types')return {};
  if(id.startsWith('./'))return read(path.join(path.dirname(modulePath),id+'.ts'));
  throw Error('Unexpected runtime dependency '+id);
 };
 // Executes only local trusted test/source code, never content from users or APIs.
 const compile=new Function('module','exports','require',result.outputText);
 compile(mod,mod.exports,link);
 return mod.exports;
}
const intelligence=read('lib/itinerary-intelligence.ts');
const routing=read('lib/routing.ts');
function activity(id,time,category,lng,duration=60){
 return {id,title:id,location:'Test district',description:'',category,time,
  durationMinutes:duration,cost:id.length*10,lat:10.77,lng};
}
const {minutesOf,clock,analyzeDay,optimizeDay,reorderByIds,measuredDistance}=intelligence;
assert.equal(minutesOf('09:30'),570);
assert.equal(minutesOf('25:30'),null);
assert.equal(clock(570),'09:30');
const a=activity('A','09:00','sightseeing',106.7,90);
const b=activity('B','09:30','culture',106.73);
const c=activity('C','11:30','nature',106.71);
const d=activity('D','13:00','sightseeing',106.74);
const makeTrip=activities=>({
 days:[{date:'2026-11-10',theme:'',activities}],
 pace:'balanced',interests:['Culture','Nature'],expenses:[],budget:500,currency:'USD'
});
let diagnostics=analyzeDay(makeTrip([a,b,c,d]),0);
assert.ok(diagnostics.warnings.some(x=>x.id==='overlap-B'),'Overlapping starts must be detected');
assert.equal(diagnostics.mappedCount,4);
assert.equal(diagnostics.segmentsMeasured,3);
const proposal=optimizeDay([a,b,c,d]);
assert.equal(proposal.available,true,'Zig-zag route should have a meaningful shorter order');
assert.ok(proposal.savedMeters>150,'Savings must exceed the accepted threshold');
const reordered=reorderByIds([a,b,c,d],proposal.orderedIds);
assert.ok(reordered);
assert.equal(reordered[0].time,'09:00');
assert.deepEqual(reordered.map(x=>x.time),['09:00','09:30','11:30','13:00']);
assert.deepEqual([...reordered].map(x=>x.id).sort(),['A','B','C','D']);
assert.equal(reordered.find(x=>x.id==='B').cost,b.cost,'Cost stays attached to the moved activity');
assert.equal(reorderByIds([a,b],['A','A']),null,'Reject duplicate IDs');
assert.equal(reorderByIds([a,b],['A','X']),null,'Reject unknown IDs');
const withFood=[a,{...b,category:'food'},c,d];
const locked=optimizeDay(withFood,false);
assert.equal(locked.available,false,'Pinned meal may not move without consent');
const unlocked=optimizeDay(withFood,true);
assert.equal(unlocked.available,true,'Explicit meal opt-in can unlock the shortened route');
assert.equal(measuredDistance([a,{...b,lat:undefined,lng:undefined},c]).legs,0,
 'Missing coordinates must not be bridged silently');
console.log('PASS Phase 2: timing, warnings, route optimization, meal anchors, order application and provenance safety');
