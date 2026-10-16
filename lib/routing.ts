import type { Activity } from './types';

export type TravelMode = 'walking' | 'bicycling' | 'driving' | 'transit';
export type RoadLeg = { distanceMeters: number; durationSeconds: number };
export type RoadRoute = { legs: RoadLeg[]; line: [number, number][] };

export function hasCoordinates(activity: Activity): boolean {
  return typeof activity.lat === 'number' && Number.isFinite(activity.lat) && Math.abs(activity.lat) <= 90 &&
    typeof activity.lng === 'number' && Number.isFinite(activity.lng) && Math.abs(activity.lng) <= 180;
}

export function directDistanceMeters(a: Activity, b: Activity): number {
  if (!hasCoordinates(a) || !hasCoordinates(b)) return 0;
  const toRad = Math.PI / 180;
  const dLat = (b.lat! - a.lat!) * toRad;
  const dLng = (b.lng! - a.lng!) * toRad;
  const lat1 = a.lat! * toRad;
  const lat2 = b.lat! * toRad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 12742000 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}

export function readableDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '—';
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

export function readableDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours} h${minutes % 60 ? ` ${minutes % 60} min` : ''}`;
}

export function approxDurationSeconds(distanceMeters: number, mode: 'walking' | 'bicycling'): number {
  // Straight-line planning estimates only, NOT real navigation times or routed distances.
  const averageKmPerHour = mode === 'walking' ? 4.5 : 14;
  return (distanceMeters / 1000 / averageKmPerHour) * 3600;
}

export function googleDirectionsUrl(stops: Activity[], mode: TravelMode): string | null {
  const points = stops.filter(hasCoordinates);
  if (points.length < 2) return null;
  // Google Maps URLs support fewer waypoints on mobile; cap links to a manageable size.
  const limited = points.slice(0, 9);
  const params = new URLSearchParams({
    api: '1',
    origin: `${limited[0].lat},${limited[0].lng}`,
    destination: `${limited[limited.length - 1].lat},${limited[limited.length - 1].lng}`,
    travelmode: mode
  });
  if (limited.length > 2) params.set('waypoints', limited.slice(1, -1).map(p => `${p.lat},${p.lng}`).join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function osmDrivingRouteUrl(stops: Activity[]): string | null {
  if (stops.length < 2 || stops.length > 20 || !stops.every(hasCoordinates)) return null;
  const coords = stops.map(p => `${p.lng},${p.lat}`).join(';');
  return `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;
}

export function validateRoadRoute(data: unknown, count: number): RoadRoute | null {
  if (!data || typeof data !== 'object') return null;
  const json = data as {code?: unknown; routes?: unknown};
  if (json.code !== 'Ok' || !Array.isArray(json.routes)) return null;
  const first = json.routes[0] as {legs?: unknown; geometry?: {coordinates?: unknown}} | undefined;
  if (!first || !Array.isArray(first.legs) || first.legs.length !== count - 1 ||
      !Array.isArray(first.geometry?.coordinates)) return null;
  const legs: RoadLeg[] = [];
  for (const leg of first.legs) {
    const value = leg as {distance?: unknown; duration?: unknown};
    if (typeof value.distance !== 'number' || !Number.isFinite(value.distance) ||
        typeof value.duration !== 'number' || !Number.isFinite(value.duration)) return null;
    legs.push({distanceMeters: value.distance, durationSeconds: value.duration});
  }
  const line: [number, number][] = [];
  for (const coord of first.geometry.coordinates) {
    if (!Array.isArray(coord) || coord.length < 2 ||
        !Number.isFinite(coord[0]) || !Number.isFinite(coord[1])) return null;
    line.push([coord[1], coord[0]]);
  }
  return legs.length && line.length > 1 ? {legs, line} : null;
}