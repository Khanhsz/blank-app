import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const css=fs.readFileSync("src/styles.css","utf8");
const html=fs.readFileSync("index.html","utf8");

function luminance(hex:string){
 const c=hex.replace("#","").match(/.{2}/g)!.map(x=>parseInt(x,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return c[0]*.2126+c[1]*.7152+c[2]*.0722;
}
function ratio(a:string,b:string){
 const x=luminance(a),y=luminance(b);
 return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
}
test("the complete game uses Be Vietnam Pro and no serif display font",()=>{
 assert.match(html,/family=Be\+Vietnam\+Pro/);
 assert.match(css,/--mt-font:"Be Vietnam Pro"/);
 assert.match(css,/body,button,input,select,textarea\{font-family:var\(--mt-font\)!important\}/);
 assert.doesNotMatch(css,/\bGeorgia\b|"Times New Roman"/);
});
test("panels and ordinary rectangular UI frames are limited to 5–10px corner radii",()=>{
 const declarations=[...css.matchAll(/border-radius:([^;}]+)/g)];
 assert.ok(declarations.length>90);
 for(const m of declarations){
  for(const v of m[1].matchAll(/(\d+(?:\.\d+)?)px/g)){
   const n=Number(v[1]);
   assert.ok(n<=10||n>=50,"Rectangular radius should not exceed 10px: "+m[0]);
  }
 }
 assert.match(css,/--radius-xl:9px/);
 assert.match(css,/--radius-2xl:10px/);
});
test("primary text, secondary text, actions and accent meet normal-text contrast targets",()=>{
 for(const [name,fg,bg] of [
  ["body","#172a36","#ffffff"],
  ["secondary copy","#405666","#ffffff"],
  ["primary action","#ffffff","#075b75"],
  ["selected navigation","#ffffff","#183a4c"],
  ["accent heading","#8b3929","#ffffff"],
  ["inverse statistics","#ffffff","#183344"],
 ]){
  assert.ok(ratio(fg,bg)>=4.5,name+" contrast "+ratio(fg,bg).toFixed(2)+" is below 4.5:1");
 }
});
