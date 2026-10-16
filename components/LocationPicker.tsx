'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Globe2, LoaderCircle, MapPin, Search, X } from 'lucide-react';
import { COUNTRIES, POPULAR_PLACES, findCountry, normalizePlace } from '@/lib/places';

type PlaceResult = { id: string; name: string; region?: string; kind: 'popular' | 'online' };

type Props = {
  country: string;
  destination: string;
  onCountrySelect: (name: string) => void;
  onDestinationChange: (name: string) => void;
};

const FEATURED_COUNTRIES = ['VN','JP','KR','TH','SG','MY','FR','IT','GB','US'];

export default function LocationPicker({ country, destination, onCountrySelect, onDestinationChange }: Props) {
  const [countryQuery, setCountryQuery] = useState(country);
  const [countryOpen, setCountryOpen] = useState(false);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [countryIndex, setCountryIndex] = useState(0);
  const [placeIndex, setPlaceIndex] = useState(0);
  const [online, setOnline] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [remoteUnavailable, setRemoteUnavailable] = useState(false);
  const destinationRef = useRef<HTMLInputElement>(null);
  const currentCountry = findCountry(country);

  const countryResults = useMemo(() => {
    const query = normalizePlace(countryQuery).replace(/\s/g, '');
    if (!query) return FEATURED_COUNTRIES.map(code => COUNTRIES.find(c => c.code === code)!).filter(Boolean);
    return COUNTRIES.filter(c => normalizePlace(c.name).replace(/\s/g, '').includes(query) || c.code.toLowerCase() === query).slice(0, 10);
  }, [countryQuery]);

  const localPlaces = useMemo(() => {
    if (!currentCountry) return [];
    const query = normalizePlace(destination);
    return (POPULAR_PLACES[currentCountry.code] || []).filter(name => !query || normalizePlace(name).includes(query))
      .slice(0, 10).map((name, i): PlaceResult => ({ id: `local-${i}-${name}`, name, kind: 'popular' }));
  }, [currentCountry, destination]);

  useEffect(() => {
    setOnline([]);
    setRemoteUnavailable(false);
    setLoading(false);
    if (!currentCountry || destination.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const search = new URLSearchParams({ country: currentCountry.code, q: destination.trim() });
        const response = await fetch(`/api/locations?${search}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Places service temporarily unavailable');
        const data = await response.json() as { places?: Array<{ id: number; name: string; region?: string }> };
        if (!controller.signal.aborted) setOnline((data.places || []).map(place => ({ id:`remote-${place.id}`, name:place.name, region:place.region, kind:'online' })));
      } catch (error) {
        if (!controller.signal.aborted) setRemoteUnavailable(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 360);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [currentCountry?.code, destination]);

  const places = useMemo(() => {
    const keys = new Set<string>();
    return [...localPlaces, ...online]
      .filter(place => {
        const key = normalizePlace(place.name);
        if (keys.has(key)) return false;
        keys.add(key);
        return true;
      }).slice(0, 9);
  }, [localPlaces, online]);

  function selectCountry(name: string) {
    setCountryQuery(name);
    onCountrySelect(name);
    onDestinationChange('');
    setCountryOpen(false);
    setCountryIndex(0);
    setOnline([]);
    setPlaceIndex(0);
    setDestinationOpen(true);
    destinationRef.current?.focus();
  }
  function searchCountry(query: string) {
    setCountryQuery(query);
    if (country) { onCountrySelect(''); onDestinationChange(''); }
    setCountryIndex(0);
    setCountryOpen(true);
  }
  function selectPlace(name: string) {
    onDestinationChange(name);
    setDestinationOpen(false);
    setPlaceIndex(0);
  }

  return <div className="country-location-fields">
    <div className="field-label suggestion-field">
      <label htmlFor="trip-country">Country <span className="required-star">*</span></label>
      <div className="input-icon suggestion-input">
        <Globe2 size={18} aria-hidden="true" />
        <input id="trip-country" type="text" role="combobox" autoComplete="off" aria-autocomplete="list"
          aria-controls="country-option-list" aria-expanded={countryOpen} aria-activedescendant={countryOpen && countryResults.length ? `country-option-${countryIndex}` : undefined}
          value={countryQuery} onFocus={() => setCountryOpen(true)} onBlur={() => setCountryOpen(false)}
          onChange={e => searchCountry(e.target.value)} placeholder="Search for a country, e.g. Vietnam" maxLength={100}
          onKeyDown={e => {
            if (e.key === 'Escape') setCountryOpen(false);
            if (e.key === 'ArrowDown') { e.preventDefault(); setCountryOpen(true); setCountryIndex(i => Math.min(i + 1, countryResults.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setCountryIndex(i => Math.max(0, i - 1)); }
            if (e.key === 'Enter' && countryOpen && countryResults[countryIndex]) { e.preventDefault(); selectCountry(countryResults[countryIndex].name); }
          }} />
        {countryQuery && <button type="button" className="suggestion-clear" aria-label="Clear country" onMouseDown={e => e.preventDefault()} onClick={() => searchCountry('')}><X size={15}/></button>}
      </div>
      {countryOpen && <div className="suggestion-menu" id="country-option-list" role="listbox" aria-label="Country suggestions">
        <div className="suggestion-heading">{countryQuery ? 'Matching countries' : 'Popular countries'}</div>
        {countryResults.length ? countryResults.map((item, i) => <button key={item.code} type="button" id={`country-option-${i}`}
          role="option" aria-selected={item.name === country} className={`suggestion-option ${i === countryIndex ? 'highlighted' : ''}`}
          onMouseDown={e => e.preventDefault()} onClick={() => selectCountry(item.name)}>
          <Globe2 size={15} /> <span className="suggestion-name">{item.name}</span> <span className="suggestion-secondary">{item.code}</span>{country===item.name&&<Check size={15}/>} </button>)
          : <div className="suggestion-empty">No matching country. Try its English name.</div>}
        <div className="suggestion-footer">Search all {COUNTRIES.length} countries and territories</div>
      </div>}
    </div>
    <div className="field-label suggestion-field">
      <label htmlFor="trip-destination">City or destination <span className="required-star">*</span></label>
      <div className="input-icon suggestion-input">
        <MapPin size={18} aria-hidden="true" />
        <input ref={destinationRef} id="trip-destination" type="text" role="combobox" autoComplete="off" aria-autocomplete="list"
          aria-controls="destination-option-list" aria-expanded={destinationOpen && !!currentCountry} aria-activedescendant={destinationOpen && places.length ? `destination-option-${placeIndex}` : undefined}
          disabled={!currentCountry} value={destination} maxLength={100}
          onChange={e=>{onDestinationChange(e.target.value);setPlaceIndex(0);setDestinationOpen(true);}}
          onFocus={()=>setDestinationOpen(true)} onBlur={()=>setDestinationOpen(false)}
          placeholder={currentCountry ? `Search cities in ${currentCountry.name}...` : 'Select a country first'}
          onKeyDown={e => {
            if (e.key === 'Escape') setDestinationOpen(false);
            if (e.key === 'ArrowDown') { e.preventDefault(); setDestinationOpen(true); setPlaceIndex(i => Math.min(i + 1, places.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setPlaceIndex(i => Math.max(0, i - 1)); }
            if (e.key === 'Enter' && destinationOpen && places[placeIndex]) { e.preventDefault(); selectPlace(places[placeIndex].name); }
          }}/>
        {loading && <LoaderCircle size={16} className="suggestion-loading" aria-label="Searching for places"/>}
        {destination && !loading && <button type="button" className="suggestion-clear" aria-label="Clear destination" onMouseDown={e => e.preventDefault()} onClick={()=>{onDestinationChange('');setPlaceIndex(0);destinationRef.current?.focus()}}><X size={15}/></button>}
      </div>
      {destinationOpen && currentCountry && <div className="suggestion-menu" id="destination-option-list" role="listbox" aria-label="Destination suggestions">
        <div className="suggestion-heading">{destination.trim() ? `Places in ${currentCountry.name}` : `Popular places in ${currentCountry.name}`}</div>
        {places.map((place, i) => <button key={place.id} type="button" role="option" id={`destination-option-${i}`}
          aria-selected={i===placeIndex} className={`suggestion-option ${i===placeIndex?'highlighted':''}`}
          onMouseDown={e=>e.preventDefault()} onClick={()=>selectPlace(place.name)}>
          <MapPin size={15}/><span className="suggestion-name">{place.name}{place.region && <small>{place.region}</small>}</span>
          <span className="suggestion-secondary">{place.kind==='popular'?'Popular':'Place'}</span>
        </button>)}
        {!places.length && <div className="suggestion-empty">{loading ? 'Searching locations…' : 'No suggestions yet. You can still enter any destination manually.'}</div>}
        <div className="suggestion-footer">{remoteUnavailable?'Live suggestions unavailable — manual entry still works.': 'Select a suggestion or type a different destination.'} <a href="https://open-meteo.com/en/docs/geocoding-api" target="_blank" rel="noopener noreferrer">Open-Meteo / GeoNames</a></div>
      </div>}
      <p className="suggestion-hint">{currentCountry ? `Suggestions filtered to ${currentCountry.name}. Other destinations can be typed manually.` : 'Choose your country first to see destination ideas.'}</p>
    </div>
  </div>;
}