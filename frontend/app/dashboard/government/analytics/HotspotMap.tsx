"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in Next.js + Leaflet
// Leaflet uses relative paths for images, which breaks in Webpack
const icon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function HotspotMap({ hotspots }: { hotspots: any[] }) {
  // Use a default center if no hotspots
  const defaultCenter: [number, number] = [23.0, 85.0]; // Roughly central India based on dataset
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <MapContainer 
      center={hotspots.length > 0 ? [hotspots[0].lat, hotspots[0].lon] : defaultCenter} 
      zoom={5} 
      style={{ height: '100%', width: '100%', zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {hotspots.map(spot => (
        spot.lat && spot.lon ? (
          <CircleMarker 
            key={spot.id} 
            center={[spot.lat, spot.lon]}
            radius={20}
            pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.4 }}
          >
            <Popup>
              <div className="text-sm">
                <strong>Hotspot #{spot.id}</strong><br/>
                Domain: {spot.domain}<br/>
                Tickets: {spot.member_count}<br/>
                Severity: {spot.severity.toFixed(2)}
              </div>
            </Popup>
          </CircleMarker>
        ) : null
      ))}
    </MapContainer>
  );
}
