'use client'

import React from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix missing marker icons in React Leaflet
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

interface LocationPickerProps {
  lat: string
  lng: string
  onChange: (lat: string, lng: string) => void
}

function LocationMarker({ lat, lng, onChange }: LocationPickerProps) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat.toString(), e.latlng.lng.toString())
    },
  })

  return lat && lng ? (
    <Marker position={[parseFloat(lat), parseFloat(lng)]} icon={icon} />
  ) : null
}

export default function LocationPicker({ lat, lng, onChange }: LocationPickerProps) {
  // Default to a central location (e.g., India) if nothing selected
  const defaultCenter: [number, number] = [20.5937, 78.9629]
  const center: [number, number] = lat && lng 
    ? [parseFloat(lat), parseFloat(lng)] 
    : defaultCenter

  return (
    <div className="h-[300px] w-full rounded-xl overflow-hidden border border-white/10 relative z-0">
      <MapContainer 
        center={center} 
        zoom={lat && lng ? 13 : 4} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker lat={lat} lng={lng} onChange={onChange} />
      </MapContainer>
    </div>
  )
}
