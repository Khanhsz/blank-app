'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bike, CarFront, CircleAlert, Clock3, ExternalLink, Footprints, MapPin, Navigation, Route, TrainFront } from 'lucide-react';
import type { Activity, Trip } from '@/lib/types';
import { approxDurationSeconds, directDistanceMeters, googleDirectionsUrl, hasCoordinates, osmDrivingRouteUrl, readableDistance, readableDuration, validateRoadRoute, type RoadRoute, type TravelMode } from '@/lib/routing';
import TripMap from './TripMap';

const modes = [
  { id: 'walking', label: 'Walk', Icon: Footprints },
  { id: 'bicycling', label: 'Bike', Icon: Bike },
  { id: 'driving', label: 'Car / Taxi', Icon: CarFront },
  { id: 'transit', label: 'Transit', Icon: TrainFront }
] as const;

export default function RouteExplorer({ trip, dayIndex, setDayIndex }: {trip: Trip; dayIndex: number; setDayIndex: (n: number) => void}) {
  const day = trip.days[dayIndex];
  const located = useMemo(() => day.activities.filter(hasCoordinates), [day.activities]);
  const coordKey = located.map(a => `${a.id}:${a.lat},${a.lng}`).join('|');
  const [mode, setMode] = useState<TravelMode>('driving');
  const [roadRoute, setRoadRoute] = useState<RoadRoute | null>(null);
  const [roadStatus, setRoadStatus] = useState<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');
  const [selectedLeg, setSelectedLeg] = useState<number | null>(null);

  useEffect(() => { setSelectedLeg(null); }, [dayIndex, trip.id]);
  useEffect(() => {
    const controller = new AbortController();
    const url = osmDrivingRouteUrl(located);
    if (!url) { setRoadRoute(null); setRoadStatus('idle'); return; }
    setRoadRoute(null); setRoadStatus('loading');
    const timeout = setTimeout(() => controller.abort(), 8500);
    fetch(url, {signal: controller.signal})
      .then(res => { if (!res.ok) throw new Error('Routing service unavailable'); return res.json(); })
      .then(json => {
        if (controller.signal.aborted) return;
        const route = validateRoadRoute(json, located.length);
        setRoadRoute(route);
        setRoadStatus(route ? 'ready' : 'unavailable');
      })
      .catch(() => { if (!controller.signal.aborted) {setRoadRoute(null);setRoadStatus('unavailable');} })
      .finally(() => clearTimeout(timeout));
    return () => { clearTimeout(timeout); controller.abort(); };
    // Coordinate key represents the routed stops, avoiding refetches when switching transport tabs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coordKey]);

  const directLegs = located.slice(1).map((to, i) => directDistanceMeters(located[i], to));
  const isRoadRoute = mode === 'driving' && roadStatus === 'ready' && !!roadRoute;
  const displayLegs = directLegs.map((direct, i) => {
    if (mode === 'transit') return {distance: null as number | null, seconds: null as number | null};
    if (isRoadRoute) return {distance: roadRoute!.legs[i].distanceMeters, seconds: roadRoute!.legs[i].durationSeconds};
    if (mode === 'driving') return {distance: direct, seconds: null as number | null};
    return {distance: direct, seconds: approxDurationSeconds(direct, mode)};
  });
  const totalDistance = displayLegs.some(p => p.distance !== null) ? displayLegs.reduce((sum, p) => sum + (p.distance || 0), 0) : null;
  const totalSeconds = displayLegs.length && displayLegs.every(p => p.seconds !== null) ? displayLegs.reduce((sum, p) => sum + (p.seconds || 0), 0) : null;
  const directionsUrl = googleDirectionsUrl(located, mode);
  const selected = selectedLeg !== null && selectedLeg < located.length - 1 ? [located[selectedLeg], located[selectedLeg + 1]] : null;
  const transportCaution = mode === 'transit'
    ? 'Transit routes, real-time departures and fares are not available here. Open Google Maps for local services and schedules.'
    : isRoadRoute
      ? 'Driving route and travel times come from an OpenStreetMap-based routing service. Traffic and closures are not included.'
      : mode === 'driving'
        ? (roadStatus === 'loading' ? 'Fetching a road route. Numbers below may update.' : 'Driving route unavailable. Only straight-line distances are shown; no driving ETA is provided.')
        : 'Straight-line distance and speed-based time estimate only — not a walkable/cyclable route. Open Google Maps for real directions.';

  return <div className="screen-fade">
    <div className="section-top"><div><p className="kicker">PLAN THE JOURNEY</p><h2>Explore {trip.destination}</h2><p className="subheading">Explore stops, compare transport options and preview distances between activities.</p></div></div>
    <div className="route-toolbar" aria-label="Choose transport mode">
      <div className="route-toolbar-caption"><Navigation size={17}/><span>How will you get around?</span></div>
      <div className="route-modes">{modes.map(({id,label,Icon}) => <button key={id} className={`route-mode ${mode === id ? 'active' : ''}`} type="button" onClick={() => {setMode(id);setSelectedLeg(null);}} aria-pressed={mode === id}><Icon size={17}/>{label}</button>)}</div>
      {directionsUrl && <a className="route-open-maps" href={directionsUrl} target="_blank" rel="noopener noreferrer">Directions <ExternalLink size={15}/></a>}
    </div>
    <div className="route-summary" aria-live="polite">
      <div className="route-metric"><span><Route size={16}/> Route distance</span><strong>{totalDistance !== null ? `${!isRoadRoute ? '≈ ' : ''}${readableDistance(totalDistance)}` : 'See Google Maps'}</strong><small>{isRoadRoute ? 'Road route' : mode === 'transit' ? 'Transit distance not calculated' : 'Straight-line only'}</small></div>
      <div className="route-metric"><span><Clock3 size={16}/> Travel time</span><strong>{totalSeconds !== null ? `≈ ${readableDuration(totalSeconds)}` : mode === 'driving' && roadStatus === 'loading' ? 'Loading…' : 'Check directions'}</strong><small>{isRoadRoute ? 'No traffic adjustment' : mode === 'walking' || mode === 'bicycling' ? 'Speed-based estimate' : 'No local schedules'}</small></div>
      <div className="route-metric"><span><MapPin size={16}/> Mapped stops</span><strong>{located.length} / {day.activities.length}</strong><small>Day {dayIndex + 1} of {trip.days.length}</small></div>
    </div>
    <div className="route-notice" role="note"><CircleAlert size={16}/><span>{transportCaution} Place pins may be AI-generated; verify stops before travel.</span></div>
    <div className="map-view-layout">
      <div className="map-plan-panel">
        <div className="map-sidebar-head"><h3>Daily travel route</h3><p>Select a day or a journey leg to explore its distance.</p></div>
        <div className="map-day-options">{trip.days.map((d,i) => <button key={d.date} className={i === dayIndex ? 'active' : ''} onClick={() => setDayIndex(i)}>Day {i + 1}</button>)}</div>
        <div className="route-stops" aria-label="Journey legs">
          {located.length < 2 && <div className="route-placeholder">Add at least two activities with map coordinates to calculate travel distances.</div>}
          {located.map((stop, i) => <div className="route-stop-group" key={stop.id}>
            <div className="route-stop"><span className="map-place-num">{day.activities.indexOf(stop) + 1}</span><div><strong>{stop.title}</strong><small>{stop.time} · {stop.location}</small></div></div>
            {i < located.length - 1 && <button className={`route-leg ${selectedLeg === i ? 'active' : ''}`} onClick={() => setSelectedLeg(selectedLeg === i ? null : i)} aria-pressed={selectedLeg === i} type="button"><span className="route-leg-dash"/><span>{mode === 'transit' ? 'Check transit' : `${!isRoadRoute ? '≈ ' : ''}${readableDistance(displayLegs[i].distance || 0)}`} {displayLegs[i].seconds !== null ? ` · ${readableDuration(displayLegs[i].seconds!)}` : ''}</span><span className="route-leg-action">View leg</span></button>}
          </div>)}
        </div>
        {selected && <div className="route-selected"><strong>{selected[0].title} → {selected[1].title}</strong><p>{mode === 'transit' ? 'Choose live public transport routes.' : `Distance: ${!isRoadRoute ? '≈ ' : ''}${readableDistance(displayLegs[selectedLeg!].distance || 0)}${displayLegs[selectedLeg!].seconds !== null ? ` · ${readableDuration(displayLegs[selectedLeg!].seconds!)}` : ''}`}</p>{googleDirectionsUrl(selected, mode) && <a href={googleDirectionsUrl(selected,mode)!} target="_blank" rel="noopener noreferrer">Navigate this leg <ExternalLink size={13}/></a>}</div>}
        {day.activities.length > located.length && <p className="map-footnote"><CircleAlert size={14}/>{day.activities.length - located.length} stop(s) without map coordinates are excluded from route calculations.</p>}
        <p className="route-provider">Map data © OpenStreetMap contributors. Road routes provided for planning only; verify before departure.</p>
      </div>
      <div className="map-main"><TripMap activities={day.activities} destination={trip.destination} mode={mode} selectedIds={selected?.map(p => p.id) || []} routeLine={isRoadRoute ? roadRoute!.line : undefined}/></div>
    </div>
  </div>;
}