'use client';
import dynamic from 'next/dynamic';
import type { Activity } from '@/lib/types';
const MapCanvas = dynamic(() => import('./TripMapCanvas'), {ssr:false, loading: () => <div className="map-loading">Loading your map…</div>});
export default function TripMap({ activities, destination }:{activities:Activity[]; destination:string}) {
  return <MapCanvas activities={activities} destination={destination}/>;
}