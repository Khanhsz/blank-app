'use client';
import type { Activity } from '@/lib/types';
import { foodAnchor } from '@/lib/food-anchor';
import FoodRecommendations, { type FoodVenue } from './FoodRecommendations';
import PlaceDetails from './PlaceDetails';

export default function ActivityPlacePanel({activity,dayActivities,destination,country,onChoose}:{
  activity:Activity;dayActivities:Activity[];destination:string;country:string;
  onChoose?:(activityId:string,venue:FoodVenue)=>void;
}){
  if(activity.category==='food'){
    return <FoodRecommendations activity={activity} anchor={foodAnchor(activity,dayActivities)} onChoose={onChoose}/>;
  }
  return <PlaceDetails activity={activity} destination={destination} country={country}/>;
}
