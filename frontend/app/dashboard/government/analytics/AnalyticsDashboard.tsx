"use client";

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, Legend, AreaChart, Area 
} from 'recharts';

// Dynamically import Leaflet map with SSR disabled
const HotspotMap = dynamic(() => import('./HotspotMap'), { ssr: false });

export default function AnalyticsDashboard() {
  const [domains, setDomains] = useState([]);
  const [funnel, setFunnel] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, you'd pass the auth token. 
    // Assuming backend CORS allows this or Next.js rewrites it.
    // For demo, we just hit the backend API (adjust port if needed, defaulting to 8000).
    const API_URL = 'http://localhost:8000/api/analytics';

    // A mock token or hardcoded login for demo if required by middleware.
    // The instructions say use Government Officer demo login, but we can fetch as long as CORS permits.
    // However, our backend has role checks. Let's mock the authorization header for the demo.
    // You would normally use your auth context here.
    
    // As a workaround if auth is strictly enforced by `require_role`, we'll assume 
    // the user logged in and has a token in localStorage. 
    const token = localStorage.getItem('token');
    const headers = { 'Authorization': `Bearer ${token}` };

    const fetchAll = async () => {
      try {
        const [domRes, funRes, leadRes, hotRes, trendRes] = await Promise.all([
          fetch(`${API_URL}/domains`, { headers }),
          fetch(`${API_URL}/funnel`, { headers }),
          fetch(`${API_URL}/leaderboard`, { headers }),
          fetch(`${API_URL}/hotspots`, { headers }),
          fetch(`${API_URL}/trends`, { headers }),
        ]);

        if (domRes.ok) setDomains(await domRes.json());
        if (funRes.ok) setFunnel(await funRes.json());
        if (leadRes.ok) setLeaderboard(await leadRes.json());
        if (hotRes.ok) setHotspots(await hotRes.json());
        if (trendRes.ok) setTrends(await trendRes.json());
      } catch (e) {
        console.error("Failed to fetch analytics:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  if (loading) return <div className="text-gray-500">Loading analytics data...</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      
      {/* Domains Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Tickets by Domain</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={domains} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Funnel Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Status Funnel</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={funnel} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="#c4b5fd" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 lg:col-span-2">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Active Hotspots</h2>
        <div className="h-96 rounded overflow-hidden">
          <HotspotMap hotspots={hotspots} />
        </div>
      </div>

      {/* Trends */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 lg:col-span-2">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Performance Trends (Last 7 Days)</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{fontSize: 12}} />
              <YAxis yAxisId="left" tickFormatter={(v) => `${v}%`} />
              <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}h`} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="resolution_rate" name="Resolution Rate (%)" stroke="#10b981" strokeWidth={2} />
              <Line yAxisId="right" type="monotone" dataKey="avg_turnaround_hours" name="Avg Turnaround (hours)" stroke="#f59e0b" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 lg:col-span-2 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-4 text-gray-800">Institution Leaderboard</h2>
        <table className="min-w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-900">Rank</th>
              <th className="px-4 py-3 font-medium text-gray-900">Institution</th>
              <th className="px-4 py-3 font-medium text-gray-900">Type</th>
              <th className="px-4 py-3 font-medium text-gray-900 text-right">Reputation</th>
              <th className="px-4 py-3 font-medium text-gray-900 text-right">Current Load</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leaderboard.map((inst, idx) => (
              <tr key={inst.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">{idx + 1}</td>
                <td className="px-4 py-3 font-medium text-gray-800">{inst.name}</td>
                <td className="px-4 py-3 capitalize">{inst.type}</td>
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold text-blue-600">{inst.reputation_score.toFixed(2)}</span>
                  <div className="text-xs text-gray-400 mt-1">
                    {Object.entries(inst.reputation_by_domain || {}).map(([dom, score]) => (
                      <div key={dom}>{dom}: {Number(score).toFixed(2)}</div>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">{inst.current_load}</td>
              </tr>
            ))}
            {leaderboard.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-4 text-center">No data</td></tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
