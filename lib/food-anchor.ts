import type {Activity} from './types';

export type FoodAnchor = {lat:number;lng:number;source:'activity'|'day'};

function mapped(a:Activity):a is Activity & {lat:number;lng:number}{
  return typeof a.lat==='number'&&typeof a.lng==='number'&&Number.isFinite(a.lat)&&Number.isFinite(a.lng)
    &&Math.abs(a.lat)<=85&&Math.abs(a.lng)<=180;
}
/** Reuse only a mapped stop on the same day if an activity lacks its own pin. */
export function foodAnchor(activity:Activity,activities:Activity[]):FoodAnchor|null{
  if(mapped(activity))return {lat:activity.lat,lng:activity.lng,source:'activity'};
  const index=activities.findIndex(x=>x.id===activity.id);
  const possible=activities.map((a,i)=>({a,i})).filter((x):x is {a:Activity&{lat:number;lng:number};i:number}=>mapped(x.a));
  if(!possible.length)return null;
  possible.sort((a,b)=>Math.abs(a.i-index)-Math.abs(b.i-index));
  const closest=possible[0].a;
  return {lat:closest.lat,lng:closest.lng,source:'day'};
}
