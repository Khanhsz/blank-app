import {useEffect,useRef} from "react";
import {useFrame,useThree} from "@react-three/fiber";

/**
 * In-browser instrumentation. Actual FPS/draw calls are only known when a user
 * visits the running game; build-time triangle counts are not FPS benchmarks.
 * Opt-in HUD: add ?perf=1 to the game URL after opening Marketing City.
 */
export function CityPerfProbe(){
 const gl=useThree(s=>s.gl);
 const frame=useRef({elapsed:0,frames:0,lowest:Infinity,samples:0});
 const overlay=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{
  if(!new URLSearchParams(window.location.search).has("perf"))return;
  const el=document.createElement("div");
  el.id="mt-city-perf-monitor";
  el.setAttribute("role","status");
  el.style.cssText="position:fixed;bottom:18px;left:18px;z-index:80;background:#153344eb;color:#e6f4ef;font:600 11px 'Be Vietnam Pro',sans-serif;line-height:1.6;padding:11px 13px;border:1px solid #83abb7;border-radius:8px;pointer-events:none;white-space:pre;box-shadow:0 6px 22px #071c2a66";
  document.body.appendChild(el);
  overlay.current=el;
  return ()=>{el.remove();overlay.current=null};
 },[]);
 useFrame((_,dt)=>{
  const f=frame.current;
  f.elapsed+=Math.min(.2,dt);f.frames++;
  if(f.elapsed<2)return;
  const fps=f.frames/f.elapsed;
  f.lowest=Math.min(f.lowest,fps);f.samples++;
  const heap=(performance as Performance & {memory?:{usedJSHeapSize:number}}).memory?.usedJSHeapSize;
  const data={
   fps:Math.round(fps*10)/10,
   observedMinFps:Math.round(f.lowest*10)/10,
   drawCalls:gl.info.render.calls,
   triangles:gl.info.render.triangles,
   geometries:gl.info.memory.geometries,
   textures:gl.info.memory.textures,
   heapMB:heap?Math.round(heap/104857.6)/10:null,
   samples:f.samples,
   measuredAt:new Date().toISOString()
  };
  // Accessible for browser console and automation. No remote collection.
  (window as Window & {__MT_CITY_PERF__?:typeof data}).__MT_CITY_PERF__=data;
  if(overlay.current)overlay.current.textContent=
   "MARKETING CITY · REAL BROWSER METRICS\n"+
   "FPS "+data.fps+"  |  MIN "+data.observedMinFps+"\n"+
   "Draw calls "+data.drawCalls+"  |  Triangles "+data.triangles+"\n"+
   "Geometry "+data.geometries+"  |  Textures "+data.textures+"\n"+
   "JS heap "+(data.heapMB??"unavailable")+" MB  |  "+data.samples+" samples";
  f.elapsed=0;f.frames=0;
 });
 return null;
}
