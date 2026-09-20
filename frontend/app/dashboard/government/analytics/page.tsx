import AnalyticsDashboard from './AnalyticsDashboard';

export default function AnalyticsPage() {
  return (
    <div className="p-8 min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-gray-900">Platform Analytics</h1>
          <p className="text-gray-500 mt-2">Monitor civic issues, institutional performance, and hotspot activity.</p>
        </header>

        <AnalyticsDashboard />
      </div>
    </div>
  );
}
