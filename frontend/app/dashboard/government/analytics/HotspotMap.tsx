"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface Hotspot {
  id: number;
  domain: string;
  member_count: number;
  severity: number;
  lat: number;
  lon: number;
}

interface TicketLoc {
  id: number;
  title: string;
  domain: string;
  status: string;
  severity: number;
  lat: number;
  lon: number;
}

export default function HotspotMap({ hotspots, ticketLocations = [] }: { hotspots: Hotspot[], ticketLocations?: TicketLoc[] }) {
  // Center on Jharkhand, India
  const defaultCenter: [number, number] = [23.6102, 85.2799]; 
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <MapContainer 
      center={defaultCenter} 
      zoom={7} 
      style={{ height: '100%', width: '100%', zIndex: 0 }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Plot all individual tickets as small blue markers */}
      {ticketLocations.map(t => (
        t.lat && t.lon ? (
          <CircleMarker 
            key={`t-${t.id}`} 
            center={[t.lat, t.lon]}
            radius={6}
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.7, weight: 1 }}
          >
            <Popup>
              <div className="text-sm">
                <strong>Ticket #{t.id}</strong><br/>
                {t.title}<br/>
                <span className="text-xs text-slate-500 uppercase">{t.domain || 'Unclassified'}</span><br/>
                Status: {t.status.replace(/_/g, ' ')}
              </div>
            </Popup>
          </CircleMarker>
        ) : null
      ))}

      {/* Plot hotspots as larger red areas */}
      {hotspots.map(spot => (
        spot.lat && spot.lon ? (
          <CircleMarker 
            key={`h-${spot.id}`} 
            center={[spot.lat, spot.lon]}
            radius={24}
            pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.3, weight: 2 }}
          >
            <Popup>
              <div className="text-sm">
                <strong>🚨 Hotspot Cluster #{spot.id}</strong><br/>
                Domain: {spot.domain}<br/>
                Tickets: {spot.member_count}<br/>
                Aggregated Severity: {spot.severity.toFixed(2)}
              </div>
            </Popup>
          </CircleMarker>
        ) : null
      ))}
    </MapContainer>
  );
}
