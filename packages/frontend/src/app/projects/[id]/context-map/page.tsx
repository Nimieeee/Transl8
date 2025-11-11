import { ContextMapVisualizer } from '@/components/monitoring/context-map-visualizer';

interface PageProps {
  params: {
    id: string;
  };
}

export default function ContextMapPage({ params }: PageProps) {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Context Map Monitoring</h1>
          <p className="mt-2 text-gray-600">
            Real-time visualization of pipeline processing status and segment metadata
          </p>
        </div>

        <ContextMapVisualizer projectId={params.id} />
      </div>
    </div>
  );
}
