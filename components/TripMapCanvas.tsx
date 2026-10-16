'use client';
import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Activity } from '@/lib/types';
import { googleDirectionsUrl, hasCoordinates, type TravelMode } from '@/lib/routing';

function markersIcon(number: number, highlighted: boolean) {
  return L.divIcon({ className: 'pin-icon-wrapper', html: `<div class="pin-icon${highlighted ? ' pin-icon-selected' : ''}">${number}</div>`, iconSize: [30, 36], iconAnchor: [15, 34] });
}
function SyncMap({points}:{points:Activity[]}) {
  const map = useMap();
  const key = points.map(p => `${p.id}:${p.lat},${p.lng}`).join('|');
  useEffect(() => {
    if (!points.length) {map.setView([20,0],2);return;}
    const bounds = L.latLngBounds(points.map(p => [p.lat!, p.lng!]));
    if (points.length === 1) map.setView([points[0].lat!, points[0].lng!],13);
    else map.fitBounds(bounds.pad(0.3),{maxZoom:13,animate:false});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map,key]);
  return null;
}
export default function TripMapCanvas({activities, destination, mode, routeLine, selectedIds}: {
  activities: Activity[];
  destination: string;
  mode: TravelMode;
  routeLine?: [number, number][];
  selectedIds: string[];
}) {
  const points = useMemo(() => activities.filter(hasCoordinates), [activities]);
  const directLine: [number, number][] = points.map(p => [p.lat!,p.lng!]);
  const selected = selectedIds.map(id => points.find(p => p.id === id)).filter((p): p is Activity => !!p);
  const selectedLine: [number,number][] = selected.map(p => [p.lat!,p.lng!]);
  return <div className="map-widget">
    <MapContainer center={[20,0]} zoom={2} scrollWheelZoom={false} style={{height:'100%',width:'100%'}}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"/>
      <SyncMap points={points}/>
      {routeLine && mode === 'driving' && routeLine.length >= 2
        ? <Polyline positions={routeLine} pathOptions={{color:'#246b58',weight:5,opacity:.8}}/>
        : directLine.length >= 2 && mode !== 'transit' ? <Polyline positions={directLine} pathOptions={{color:'#427aa4',weight:3,opacity:.75,dashArray:'6 9'}}/> : null}
      {selectedLine.length === 2 && <Polyline positions={selectedLine} pathOptions={{color:'#e38b30',weight:5,opacity:.95,dashArray:'9 5'}}/>}
      {points.map((a,i) => <Marker key={a.id} position={[a.lat!,a.lng!]} icon={markersIcon(activities.indexOf(a)+1,selectedIds.includes(a.id))}><Popup><strong>{a.title}</strong><br/>{a.location}<br/><a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a.title+', '+destination)}`} target="_blank" rel="noopener noreferrer">Verify place in Google Maps ↗</a>{i > 0 && <><br/><a href={googleDirectionsUrl([points[i-1],a],mode) || '#'} target="_blank" rel="noopener noreferrer">Directions from previous stop ↗</a></>}</Popup></Marker>)}
    </MapContainer>
    {!points.length && <div className="map-empty">No coordinates available for this plan. Verify a place in Google Maps to explore it.</div>}
    {points.length >= 2 && <div className="route-map-legend"><span className={routeLine && mode === 'driving' ? 'route-legend-solid' : 'route-legend-dotted'}/>{routeLine && mode === 'driving' ? 'Driving road route' : mode === 'transit' ? 'Select a stop for directions' : 'Straight-line guide (not navigable)'}</div>}
  </div>;
}