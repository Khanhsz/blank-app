'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Activity } from '@/lib/types';

function markersIcon(number:number) {
 return L.divIcon({ className:'pin-icon-wrapper', html:`<div class="pin-icon">${number}</div>`, iconSize:[30,36],iconAnchor:[15,34] });
}
function SyncMap({points}:{points:Activity[]}) {
 const map=useMap();
 useEffect(()=>{
   if (!points.length) {map.setView([20,0],2);return;}
   const bounds=L.latLngBounds(points.map(p=>[p.lat!,p.lng!]));
   if (points.length===1) map.setView([points[0].lat!,points[0].lng!],13);
   else map.fitBounds(bounds.pad(0.3),{maxZoom:13,animate:false});
 },[map,points]);
 return null;
}
export default function TripMapCanvas({activities,destination}:{activities:Activity[];destination:string}) {
 const points=activities.filter(a=>Number.isFinite(a.lat) && Number.isFinite(a.lng));
 return <div className="map-widget">
    <MapContainer center={[20,0]} zoom={2} scrollWheelZoom={false} style={{height:'100%',width:'100%'}}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      <SyncMap points={points}/>
      {points.map((a,i)=><Marker key={a.id} position={[a.lat!,a.lng!]} icon={markersIcon(i+1)}><Popup><strong>{a.title}</strong><br/>{a.location}<br/><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.title+', '+destination)}`} target="_blank" rel="noopener noreferrer">Verify place in Google Maps ↗</a></Popup></Marker>)}
    </MapContainer>
    {!points.length && <div className="map-empty">No coordinates available for this plan. Verify a place in Google Maps to explore it.</div>}
  </div>;
}