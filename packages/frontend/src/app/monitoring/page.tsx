import Link from 'next/link';

export default function MonitoringPage() {
  const monitoringTools = [
    {
      title: 'Context Map Visualization',
      description: 'View segment timeline, status indicators, and pipeline metadata',
      href: '/monitoring/context-map',
      icon: '🗺️',
      color: 'bg-blue-50 border-blue-200',
    },
    {
      title: 'Adaptation Quality Metrics',
      description: 'Track translation adaptation success rates and validation metrics',
      href: '/monitoring/adaptation-metrics',
      icon: '📊',
      color: 'bg-green-50 border-green-200',
    },
    {
      title: 'Audio Quality Monitoring',
      description: 'Monitor vocal isolation, noise reduction, and TTS output quality',
      href: '/monitoring/audio-quality',
      icon: '🎵',
      color: 'bg-purple-50 border-purple-200',
    },
    {
      title: 'Synchronization Validation',
      description: 'Detect timing drift and validate audio-video synchronization',
      href: '/monitoring/sync-validation',
      icon: '⏱️',
      color: 'bg-yellow-50 border-yellow-200',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pipeline Monitoring & Debugging</h1>
          <p className="mt-2 text-gray-600">
            Comprehensive tools for monitoring robust pipeline performance and quality
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {monitoringTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`${tool.color} border-2 rounded-lg p-6 hover:shadow-lg transition-shadow`}
            >
              <div className="flex items-start space-x-4">
                <div className="text-4xl">{tool.icon}</div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{tool.title}</h2>
                  <p className="text-gray-600">{tool.description}</p>
                </div>
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Stats Overview */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Monitoring Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Context Maps</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
              <p className="text-xs text-gray-500 mt-1">Real-time tracking</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Adaptation Success</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
              <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Audio Quality</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
              <p className="text-xs text-gray-500 mt-1">Average score</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Sync Quality</p>
              <p className="text-2xl font-bold text-gray-900">-</p>
              <p className="text-xs text-gray-500 mt-1">Average drift</p>
            </div>
          </div>
        </div>

        {/* Documentation */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">📚 Documentation</h3>
          <p className="text-blue-800 mb-4">
            Learn more about the robust pipeline architecture and monitoring tools:
          </p>
          <ul className="space-y-2 text-blue-700">
            <li>• Context Map: Central data structure for pipeline metadata</li>
            <li>• Adaptation Engine: LLM-based translation with timing constraints</li>
            <li>• Vocal Isolation: Demucs + noisereduce for clean audio</li>
            <li>• Absolute Synchronization: Drift-free audio assembly</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
