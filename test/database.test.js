import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { handler } from '../server.js';
import {stats,catalog,resolveSubject,createDatabasePlan,createDatabaseLesson,searchKnowledge,tutorFromDatabase} from '../knowledge.js';

test('reference database has broad and internally consistent content',()=>{
  const s=stats();assert.equal(s.subjects,55);assert.equal(s.units,550);assert.equal(s.topics,1651);assert.equal(s.detailedUnits,29);
  assert.ok(catalog().some(x=>x.title==='Marketing căn bản'));
  assert.equal(resolveSubject('Marketing căn bản').id,'marketing-can-ban');
  assert.equal(resolveSubject('kinh tế vĩ mô').id,'kinh-te-vi-mo-macro');
});
test('curriculum is database-backed and respects chosen number of weeks',()=>{
  for (const weeks of [2,4,6,8,12]) {
    const r=createDatabasePlan({subject:'Marketing căn bản',goal:'Lập kế hoạch marketing',weeks});
    assert.equal(r.mode,'database'); assert.equal(r.plan.modules.length,weeks);
    assert.ok(r.plan.modules.every((m,i)=>m.week===i+1&&m.topics.length>0));
    assert.ok(r.plan.modules[0].unitIds.length);
  }
  assert.throws(()=>createDatabasePlan({subject:'môn không có',goal:'abc'}),/Chủ đề chưa có/);
});
test('lesson and local knowledge search have explicit coverage and reading list',()=>{
  const p=createDatabasePlan({subject:'Marketing căn bản',goal:'Hiểu marketing',weeks:4}).plan;
  const r=createDatabaseLesson({course:{subject:'Marketing căn bản',minutes:60},module:p.modules[0]});
  assert.equal(r.mode,'database');assert.equal(r.coverage.detailed,2);
  assert.equal(r.lesson.explanation.length,2);
  assert.ok(r.lesson.quiz.every(q=>q.options.length===4&&q.answerIndex>=0&&q.answerIndex<4));
  const research=searchKnowledge('marketing căn bản');
  assert.equal(research.mode,'database');assert.equal(research.verified,false);assert.ok(research.sources.length>0);
  const answer=tutorFromDatabase({question:'Nhu cầu là gì?',context:{lesson:r.lesson}});
  assert.equal(answer.mode,'database');assert.ok(answer.answer.length>40);
});
test('GET catalog and POST plan API work without Gemini key',async()=>{
  const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));
  try{
    const base=`http://127.0.0.1:${server.address().port}`;
    const listing=await fetch(base+'/api/catalog?q=marketing');assert.equal(listing.status,200);assert.ok((await listing.json()).subjects.length>=2);
    const subject=await fetch(base+'/api/catalog/marketing-can-ban');assert.equal(subject.status,200);assert.equal((await subject.json()).subject.units.length,10);
    const plan=await fetch(base+'/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subject:'Python căn bản',goal:'Biết lập trình',weeks:4})});assert.equal(plan.status,200);assert.equal((await plan.json()).mode,'database');
    const invalid=await fetch(base+'/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({subject:'Unlisted Subject',goal:'abc'})});assert.equal(invalid.status,400);
  }finally{server.close();}
});
