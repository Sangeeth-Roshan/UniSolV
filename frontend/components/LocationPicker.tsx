'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix missing marker icons in React Leaflet
const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

// Jharkhand strict geographical bounding box
// South-West: [21.90, 83.20], North-East: [25.40, 87.90]
export const JHARKHAND_BOUNDS: [[number, number], [number, number]] = [
  [21.90, 83.20],
  [25.40, 87.90],
]

export const JHARKHAND_CENTER: [number, number] = [23.6102, 85.2799] // Central Jharkhand

export function isWithinJharkhand(lat: number, lng: number): boolean {
  return lat >= 21.90 && lat <= 25.40 && lng >= 83.20 && lng <= 87.90
}

// Prominent Jharkhand cities, districts and towns for fast instant suggestions
const JHARKHAND_PLACES = [
  { name: 'Ranchi', district: 'Ranchi', lat: 23.3441, lng: 85.3096 },
  { name: 'Jamshedpur (Tatanagar)', district: 'East Singhbhum', lat: 22.8046, lng: 86.2029 },
  { name: 'Dhanbad', district: 'Dhanbad', lat: 23.7957, lng: 86.4304 },
  { name: 'Bokaro Steel City', district: 'Bokaro', lat: 23.6693, lng: 86.1511 },
  { name: 'Deoghar', district: 'Deoghar', lat: 24.4826, lng: 86.7001 },
  { name: 'Hazaribagh', district: 'Hazaribagh', lat: 23.9925, lng: 85.3637 },
  { name: 'Giridih', district: 'Giridih', lat: 24.1856, lng: 86.3075 },
  { name: 'Ramgarh Cantonment', district: 'Ramgarh', lat: 23.6300, lng: 85.5186 },
  { name: 'Medininagar (Daltonganj)', district: 'Palamu', lat: 24.0416, lng: 84.0722 },
  { name: 'Chaibasa', district: 'West Singhbhum', lat: 22.5542, lng: 85.8083 },
  { name: 'Dumka', district: 'Dumka', lat: 24.2686, lng: 87.2486 },
  { name: 'Sahibganj', district: 'Sahibganj', lat: 25.2425, lng: 87.6437 },
  { name: 'Pakur', district: 'Pakur', lat: 24.6333, lng: 87.8489 },
  { name: 'Godda', district: 'Godda', lat: 24.8277, lng: 87.2142 },
  { name: 'Jamtara', district: 'Jamtara', lat: 23.9632, lng: 86.8028 },
  { name: 'Koderma (Jhumri Telaiya)', district: 'Koderma', lat: 24.4682, lng: 85.5947 },
  { name: 'Simdega', district: 'Simdega', lat: 22.6167, lng: 84.5000 },
  { name: 'Latehar', district: 'Latehar', lat: 23.7431, lng: 84.4984 },
  { name: 'Lohardaga', district: 'Lohardaga', lat: 23.4393, lng: 84.6789 },
  { name: 'Khunti', district: 'Khunti', lat: 23.0722, lng: 85.2789 },
  { name: 'Gumla', district: 'Gumla', lat: 23.0442, lng: 84.5422 },
  { name: 'Saraikela', district: 'Saraikela Kharsawan', lat: 22.7000, lng: 85.9333 },
  { name: 'Garhwa', district: 'Garhwa', lat: 24.1812, lng: 83.8055 },
  { name: 'Chatra', district: 'Chatra', lat: 24.2094, lng: 84.8711 },
  { name: 'Phusro', district: 'Bokaro', lat: 23.7667, lng: 85.9833 },
  { name: 'Chakradharpur', district: 'West Singhbhum', lat: 22.7000, lng: 85.6333 },
  { name: 'Ghatshila', district: 'East Singhbhum', lat: 22.5833, lng: 86.4833 },
  { name: 'Patratu', district: 'Ramgarh', lat: 23.6700, lng: 85.3100 },
  { name: 'Netarhat', district: 'Latehar', lat: 23.4833, lng: 84.2667 },
  { name: 'Madhupur', district: 'Deoghar', lat: 24.2500, lng: 86.6500 },
  { name: 'Kanke', district: 'Ranchi', lat: 23.4312, lng: 85.3211 },
  { name: 'Doranda', district: 'Ranchi', lat: 23.3325, lng: 85.3275 },
  { name: 'Morabadi', district: 'Ranchi', lat: 23.3872, lng: 85.3347 },
  { name: 'Bistupur', district: 'East Singhbhum', lat: 22.7932, lng: 86.1856 },
  { name: 'Sakchi', district: 'East Singhbhum', lat: 22.8054, lng: 86.2058 },
  { name: 'Govindpur', district: 'Dhanbad', lat: 23.8344, lng: 86.5186 },
]

interface LocationPickerProps {
  lat: string
  lng: string
  onChange: (lat: string, lng: string, locationName?: string) => void
}

interface SuggestionItem {
  id: string
  title: string
  subtitle: string
  lat: number
  lng: number
  source: 'preset' | 'nominatim'
}

// Map click handler bounded to Jharkhand
function LocationMarker({
  lat,
  lng,
  onChange,
  onError,
}: {
  lat: string
  lng: string
  onChange: (lat: string, lng: string) => void
  onError: (msg: string | null) => void
}) {
  useMapEvents({
    click(e) {
      const clickLat = e.latlng.lat
      const clickLng = e.latlng.lng

      if (isWithinJharkhand(clickLat, clickLng)) {
        onError(null)
        onChange(clickLat.toFixed(6), clickLng.toFixed(6))
      } else {
        onError('Please pick a location strictly within Jharkhand state.')
      }
    },
  })

  return lat && lng ? (
    <Marker position={[parseFloat(lat), parseFloat(lng)]} icon={markerIcon} />
  ) : null
}

// Controller to smoothly animate map to new location
function MapController({ target }: { target: [number, number] | null }) {
  const map = useMap()
  useEffect(() => {
    if (target) {
      map.flyTo(target, Math.max(map.getZoom(), 13), { duration: 1.2 })
    }
  }, [target, map])
  return null
}

export default function LocationPicker({ lat, lng, onChange }: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Map center: target if available, or current lat/lng, or default to central Jharkhand
  const mapCenter = useMemo<[number, number]>(() => {
    if (lat && lng) {
      const parsedLat = parseFloat(lat)
      const parsedLng = parseFloat(lng)
      if (isWithinJharkhand(parsedLat, parsedLng)) {
        return [parsedLat, parsedLng]
      }
    }
    return JHARKHAND_CENTER
  }, [lat, lng])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Search logic with instant preset match + bounded Nominatim OpenStreetMap search
  const handleSearchChange = (query: string) => {
    setSearchQuery(query)
    setValidationError(null)

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    const trimmed = query.trim().toLowerCase()
    if (trimmed.length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      setIsSearching(false)
      return
    }

    // 1. Instant local suggestions from Jharkhand dataset
    const localMatches: SuggestionItem[] = JHARKHAND_PLACES.filter(
      (p) =>
        p.name.toLowerCase().includes(trimmed) ||
        p.district.toLowerCase().includes(trimmed)
    ).slice(0, 5).map((p) => ({
      id: `local-${p.name}`,
      title: p.name,
      subtitle: `${p.district} District, Jharkhand`,
      lat: p.lat,
      lng: p.lng,
      source: 'preset',
    }))

    setSuggestions(localMatches)
    setShowDropdown(true)
    setIsSearching(true)

    // 2. Fetch live bounded suggestions from Nominatim (restricted strictly to Jharkhand bounding box)
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&viewbox=83.2,25.4,87.9,21.9&bounded=1&countrycodes=in&limit=6`

        const response = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
          },
        })

        if (response.ok) {
          const data = await response.json()
          const apiMatches: SuggestionItem[] = (data || [])
            .map((item: any) => {
              const itemLat = parseFloat(item.lat)
              const itemLng = parseFloat(item.lon)
              return {
                id: `nom-${item.place_id || item.osm_id || Math.random()}`,
                title: item.name || item.display_name.split(',')[0],
                subtitle: item.display_name,
                lat: itemLat,
                lng: itemLng,
                source: 'nominatim' as const,
              }
            })
            // Filter strictly to ensure results are inside Jharkhand
            .filter((item: SuggestionItem) => isWithinJharkhand(item.lat, item.lng))

          // Combine local and API matches, avoiding duplicates
          const combined = [...localMatches]
          for (const apiItem of apiMatches) {
            if (!combined.some((c) => Math.abs(c.lat - apiItem.lat) < 0.01 && Math.abs(c.lng - apiItem.lng) < 0.01)) {
              combined.push(apiItem)
            }
          }
          setSuggestions(combined.slice(0, 8))
        }
      } catch (err) {
        // Fallback gracefully to local matches if network fails
      } finally {
        setIsSearching(false)
      }
    }, 300)
  }

  const handleSelectSuggestion = (item: SuggestionItem) => {
    setSearchQuery(item.title)
    setShowDropdown(false)
    setValidationError(null)
    onChange(item.lat.toFixed(6), item.lng.toFixed(6), item.title)
    setFlyTarget([item.lat, item.lng])
  }

  // Handle manual coordinate typing
  const handleManualCoordChange = (newLatStr: string, newLngStr: string) => {
    const pLat = parseFloat(newLatStr)
    const pLng = parseFloat(newLngStr)

    if (!isNaN(pLat) && !isNaN(pLng)) {
      if (isWithinJharkhand(pLat, pLng)) {
        setValidationError(null)
        onChange(newLatStr, newLngStr)
        setFlyTarget([pLat, pLng])
      } else {
        setValidationError('Coordinates are outside Jharkhand state boundaries.')
        onChange(newLatStr, newLngStr)
      }
    } else {
      onChange(newLatStr, newLngStr)
    }
  }

  return (
    <div className="space-y-3">
      {/* ── Search & Autocomplete Input ── */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative flex items-center">
          <div className="absolute left-3.5 text-slate-400 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowDropdown(true)
            }}
            placeholder="Search address, landmark, or town in Jharkhand (e.g. Ranchi, Bokaro, Bistupur)..."
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all shadow-inner"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setSuggestions([])
                setShowDropdown(false)
              }}
              className="absolute right-3 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Suggestions Dropdown ── */}
        {showDropdown && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto backdrop-blur-md">
            <div className="px-3 py-1.5 bg-slate-800/60 border-b border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>Suggested Locations (Jharkhand)</span>
              {isSearching && <span className="text-indigo-400 animate-pulse">Searching...</span>}
            </div>
            {suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectSuggestion(item)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-indigo-600/20 hover:border-l-2 hover:border-indigo-500 transition-colors flex items-start gap-2.5 border-b border-white/5 last:border-b-0 group"
              >
                <span className="text-indigo-400 mt-0.5 group-hover:scale-110 transition-transform">📍</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white truncate group-hover:text-indigo-200">
                    {item.title}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {item.subtitle}
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded border border-white/5 shrink-0">
                  {item.lat.toFixed(2)}, {item.lng.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Validation / Warning Alert ── */}
      {validationError && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
          <span>⚠️</span>
          <span>{validationError}</span>
        </div>
      )}

      {/* ── Leaflet Map Restricted strictly to Jharkhand ── */}
      <div className="h-[320px] w-full rounded-2xl overflow-hidden border border-white/10 relative z-0 shadow-lg">
        {/* State Restriction Watermark Badge */}
        <div className="absolute top-2.5 right-2.5 z-[1000] bg-slate-900/80 backdrop-blur-md border border-indigo-500/30 px-2.5 py-1 rounded-full text-[11px] font-semibold text-indigo-300 flex items-center gap-1.5 shadow-md">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>Restricted to Jharkhand</span>
        </div>

        <MapContainer
          center={mapCenter}
          zoom={lat && lng ? 13 : 8}
          minZoom={7}
          maxZoom={18}
          maxBounds={JHARKHAND_BOUNDS}
          maxBoundsViscosity={1.0}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker
            lat={lat}
            lng={lng}
            onChange={onChange}
            onError={setValidationError}
          />
          <MapController target={flyTarget} />
        </MapContainer>
      </div>

      {/* ── Manual Coordinate Inputs ── */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Manual Coordinates:</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900/70 border border-white/10 rounded-lg px-2.5 py-1">
            <span className="text-[11px] font-mono text-slate-500 mr-1.5">Lat:</span>
            <input
              type="text"
              value={lat}
              onChange={(e) => handleManualCoordChange(e.target.value, lng)}
              placeholder="e.g. 23.3441"
              className="w-24 bg-transparent text-xs font-mono text-white focus:outline-none placeholder-slate-600"
            />
          </div>
          <div className="flex items-center bg-slate-900/70 border border-white/10 rounded-lg px-2.5 py-1">
            <span className="text-[11px] font-mono text-slate-500 mr-1.5">Lng:</span>
            <input
              type="text"
              value={lng}
              onChange={(e) => handleManualCoordChange(lat, e.target.value)}
              placeholder="e.g. 85.3096"
              className="w-24 bg-transparent text-xs font-mono text-white focus:outline-none placeholder-slate-600"
            />
          </div>
        </div>

        {lat && lng && isWithinJharkhand(parseFloat(lat), parseFloat(lng)) && (
          <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full ml-auto">
            ✓ Valid Jharkhand Location
          </span>
        )}
      </div>
    </div>
  )
}
