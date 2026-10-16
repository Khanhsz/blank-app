import test from 'node:test';
import assert from 'node:assert/strict';
import { clean, normalizeSources, parseGeminiText, handler } from '../server.js';
import http from 'node:http';

test('cleans and clips user inputs',()=>{
  assert.equal(clean('  A\nB  ',10),'A B');
  assert.equal(clean('abcdef',3),'abc');
});
test('preserves only grounded, unique HTTP sources',()=>{
  const sources=normalizeSources({groundingChunks:[
    {web:{uri:'https://example.edu/book',title:'Open textbook'}},
    {web:{uri:'https://example.edu/book',title:'Duplicate'}},
    {web:{uri:'javascript:alert(1)',title:'Unsafe'}}]});
  assert.equal(sources.length,1);
  assert.equal(sources[0].title,'Open textbook');
});
test('extracts model response text',()=>{
  assert.equal(parseGeminiText({candidates:[{content:{parts:[{text:'Hi'},{text:' there'}]}}]}),'Hi\n there');
  assert.throws(()=>parseGeminiText({candidates:[]}));
});
test('health and index served without key',async()=>{
  const server=http.createServer(handler);
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  try{
    const base=`http://127.0.0.1:${server.address().port}`;
    const health=await fetch(base+'/api/health');assert.equal(health.status,200);assert.equal((await health.json()).ok,true);
    const page=await fetch(base+'/');assert.equal(page.status,200);assert.match(await page.text(),/AI Tutor Studio/);
    const traversal=await fetch(base+'/not-here');assert.equal(traversal.status,404);
  } finally { server.close(); }
});
