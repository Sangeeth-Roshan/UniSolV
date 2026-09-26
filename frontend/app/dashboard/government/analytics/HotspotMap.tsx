"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLngBoundsExpression } from 'leaflet';

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

// Bounding box strictly encompassing Jharkhand state:
// SW: Simdega / West Singhbhum border [21.80, 83.25]
// NE: Sahibganj / Rajmahal border [25.35, 87.95]
const JHARKHAND_BOUNDS: LatLngBoundsExpression = [
  [21.80, 83.25],
  [25.35, 87.95],
];

const JHARKHAND_CENTER: [number, number] = [23.6102, 85.2799];

export default function HotspotMap({ hotspots, ticketLocations = [] }: { hotspots: Hotspot[]; ticketLocations?: TicketLoc[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Filter coordinates so only points in or directly adjacent to Jharkhand are rendered
  const isInsideJharkhand = (lat: number, lon: number) => {
    return lat >= 21.7 && lat <= 25.5 && lon >= 83.1 && lon <= 88.1;
  };

  const validTickets = ticketLocations.filter(t => t.lat && t.lon && isInsideJharkhand(t.lat, t.lon));
  const validHotspots = hotspots.filter(h => h.lat && h.lon && isInsideJharkhand(h.lat, h.lon));

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden border border-slate-200 shadow-inner">
      {/* Floating State Boundary Badge - Liquid Glass */}
      <div className="absolute top-3 right-3 z-[400] bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-orange-200/80 shadow-md text-xs font-bold text-slate-800 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#138808] animate-ping" />
        <span className="text-orange-600 font-extrabold">Jharkhand</span>
        <span className="text-slate-400">|</span>
        <span className="text-slate-600 font-medium">State Surveillance Active</span>
      </div>

      <MapContainer 
        center={JHARKHAND_CENTER} 
        zoom={7.5}
        minZoom={7}
        maxZoom={15}
        maxBounds={JHARKHAND_BOUNDS}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Plot all individual tickets with Indian Flag colors */}
        {validTickets.map(t => {
          const isResolved = t.status === 'closed' || t.status === 'verified';
          const isEscalated = t.status === 'escalated' || (t.severity && t.severity >= 0.8);
          const color = isResolved ? '#138808' : isEscalated ? '#dc2626' : '#FF9933';

          return (
            <CircleMarker 
              key={`t-${t.id}`} 
              center={[t.lat, t.lon]}
              radius={6}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.85, weight: 2 }}
            >
              <Popup>
                <div className="text-xs p-1 font-sans">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1 mb-1.5">
                    <strong className="text-slate-900 font-bold">Ticket #{t.id}</strong>
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase bg-slate-100 text-slate-700">
                      {t.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-slate-800 font-semibold mb-1">{t.title}</p>
                  <p className="text-[11px] text-orange-600 font-bold capitalize">
                    {t.domain ? t.domain.replace(/[-_]/g, ' ') : 'General Grievance'}
                  </p>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* Plot hotspots as larger red clusters */}
        {validHotspots.map(spot => (
          <CircleMarker 
            key={`h-${spot.id}`} 
            center={[spot.lat, spot.lon]}
            radius={22}
            pathOptions={{ color: '#ef4444', fillColor: '#dc2626', fillOpacity: 0.35, weight: 2.5 }}
          >
            <Popup>
              <div className="text-xs p-1.5 font-sans">
                <div className="flex items-center gap-1.5 text-red-600 font-extrabold mb-1">
                  <span>🚨 Critical Hotspot #{spot.id}</span>
                </div>
                <div className="text-slate-700 space-y-0.5">
                  <p><strong>Domain:</strong> <span className="capitalize">{spot.domain.replace(/[-_]/g, ' ')}</span></p>
                  <p><strong>Correlated Tickets:</strong> <span className="text-red-600 font-bold">{spot.member_count}</span></p>
                  <p><strong>Severity Index:</strong> {(spot.severity * 100).toFixed(0)}%</p>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
