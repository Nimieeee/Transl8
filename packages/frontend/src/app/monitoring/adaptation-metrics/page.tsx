import { AdaptationMetricsDashboard } from '@/components/monitoring/adaptation-metrics-dashboard';

export default function AdaptationMetricsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Adaptation Quality Monitoring</h1>
          <p className="mt-2 text-gray-600">
            Track translation adaptation performance, success rates, and validation metrics
          </p>
        </div>

        <AdaptationMetricsDashboard />
      </div>
    </div>
  );
}
