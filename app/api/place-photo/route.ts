import { NextRequest, NextResponse } from 'next/server';
export const runtime='nodejs';
const AGENT='TripMateTravelPlanner/0.6 (https://tripmate-ai-khanhsz.onrender.com/privacy)';
type Meta={value?:string};
type ImageInfo={thumburl?:string;timestamp?:string;extmetadata?:Record<string,Meta>};
type Page={pageimage?:string;imageinfo?:ImageInfo[]};
const cache=new Map<string,{expires:number;data:Photo|null}>();
const limits=new Map<string,{count:number;until:number}>();
type Photo={url:string;filePage:string;artist:string;license:string;licenseUrl:string|null;fileUpdatedAt:string|null};
const allowed=(v:string)=>/^CC BY(?:-SA)? [234]\.\d\b/i.test(v)||/^CC0(?: 1\.0)?$/i.test(v)||/^(?:public domain|PD-(?:old|US|self|art))\b/i.test(v);
function plain(s:string){
 return s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&')
   .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim().slice(0,150);
}
async function fetchAPI(url:string){
 try{const response=await fetch(url,{headers:{'User-Agent':AGENT,'Accept':'application/json'},
   cache:'no-store',signal:AbortSignal.timeout(7500)});
  return response.ok?await response.json():null;
 }catch{return null;}
}
async function retrieve(title:string):Promise<Photo|null>{
 // Only derive a source file from a Wikipedia article's own page image.
 const u=new URL('https://en.wikipedia.org/w/api.php');
 for(const [k,v] of Object.entries({action:'query',format:'json',formatversion:'2',
   titles:title,prop:'pageimages',piprop:'name'}))u.searchParams.set(k,v);
 const p=await fetchAPI(u.toString()) as {query?:{pages?:Page[]}}|null;
 const file=p?.query?.pages?.[0]?.pageimage;
 if(!file||file.length>210||!/\.(jpg|jpeg|png|webp)$/i.test(file))return null;
 const commons=new URL('https://commons.wikimedia.org/w/api.php');
 for(const [k,v] of Object.entries({action:'query',format:'json',formatversion:'2',
   titles:'File:'+file,prop:'imageinfo',iiprop:'url|extmetadata|timestamp',iiurlwidth:'640'}))
   commons.searchParams.set(k,v);
 const data=await fetchAPI(commons.toString()) as {query?:{pages?:Page[]}}|null;
 const info=data?.query?.pages?.[0]?.imageinfo?.[0];
 const license=plain(info?.extmetadata?.LicenseShortName?.value||'');
 const artist=plain(info?.extmetadata?.Artist?.value||info?.extmetadata?.Credit?.value||'');
 const uri=info?.thumburl;
 if(!license||!allowed(license)||!uri)return null;
 try{const hostname=new URL(uri).hostname;if(hostname!=='upload.wikimedia.org')return null;}
 catch{return null;}
 const licenseUrl=info?.extmetadata?.LicenseUrl?.value;
 const validLicenseUrl=licenseUrl&&/^https:\/\//.test(licenseUrl)?licenseUrl:null;
 return {
  url:uri,
  filePage:'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(file.replace(/ /g,'_')),
  artist:artist||'See file attribution',
  license,licenseUrl:validLicenseUrl,
  fileUpdatedAt:info?.timestamp||null
 };
}
export async function GET(req:NextRequest){
 const title=req.nextUrl.searchParams.get('title');
 if(!title||title.length>130||!/[A-Za-z]/.test(title))return NextResponse.json({photo:null},{status:400});
 const cached=cache.get(title);
 if(cached&&cached.expires>Date.now())return NextResponse.json({photo:cached.data},{headers:{'Cache-Control':'private, max-age=600'}});
 const ip=(req.headers.get('x-forwarded-for')||'anonymous').split(',')[0].slice(0,80);
 const now=Date.now();
 if(limits.size>700)for(const [k,v]of limits)if(v.until<now)limits.delete(k);
 const current=limits.get(ip);
 if(current&&current.until>now&&current.count>=30)return NextResponse.json({error:'Photo request limit reached.'},{status:429});
 limits.set(ip,current&&current.until>now?{until:current.until,count:current.count+1}:{until:now+900000,count:1});
 const photo=await retrieve(title);
 if(cache.size>200)cache.delete(cache.keys().next().value!);
 cache.set(title,{data:photo,expires:now+(photo?24*3600000:30*60000)});
 return NextResponse.json({photo},{headers:{'Cache-Control':'private, max-age=600'}});
}
