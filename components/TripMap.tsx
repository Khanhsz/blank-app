'use client';
import dynamic from 'next/dynamic';
import type { Activity } from '@/lib/types';
import type { TravelMode } from '@/lib/routing';
const MapCanvas = dynamic(() => import('./TripMapCanvas'), {ssr:false, loading: () => <div className="map-loading">Loading your map…</div>});
export default function TripMap({ activities, destination, mode, routeLine, selectedIds }: {
  activities: Activity[];
  destination: string;
  mode: TravelMode;
  routeLine?: [number, number][];
  selectedIds: string[];
}) {
  return <MapCanvas activities={activities} destination={destination} mode={mode} routeLine={routeLine} selectedIds={selectedIds}/>;
}