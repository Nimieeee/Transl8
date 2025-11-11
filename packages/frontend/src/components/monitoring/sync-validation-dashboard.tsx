'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface SyncDashboard {
  overallMetrics: {
    totalProjects: number;
    averageSyncQuality: number;
    projectsWithIssues: number;
  };
  recentReports: Array<{
    projectId: string;
    syncQualityScore: number;
    maxDriftMs: number;
    timestamp: string;
  }>;
  driftDistribution: {
    excellent: number;
    good: number;
    acceptable: number;
    poor: number;
  };
}

export function SyncValidationDashboard() {
  const { data, isLoading, error } = useQuery<SyncDashboard>({
    queryKey: ['sync-validation-dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/api/sync-validation/dashboard?days=30');
      return response.data;
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load sync validation dashboard</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const getQualityColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getQualityBgColor = (score: number) => {
    if (score >= 90) return 'bg-green-50';
    if (score >= 70) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const totalDistribution =
    data.driftDistribution.excellent +
    data.driftDistribution.good +
    data.driftDistribution.acceptable +
    data.driftDistribution.poor;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Synchronization Quality Dashboard</h2>

        {/* Overall Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600">Total Projects</p>
            <p className="text-2xl font-bold text-blue-900">{data.overallMetrics.totalProjects}</p>
          </div>
          <div
            className={
              getQualityBgColor(data.overallMetrics.averageSyncQuality) + ' rounded-lg p-4'
            }
          >
            <p className="text-sm text-gray-600">Average Sync Quality</p>
            <p
              className={`text-2xl font-bold ${getQualityColor(data.overallMetrics.averageSyncQuality)}`}
            >
              {data.overallMetrics.averageSyncQuality.toFixed(1)}%
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-sm text-red-600">Projects with Issues</p>
            <p className="text-2xl font-bold text-red-900">
              {data.overallMetrics.projectsWithIssues}
            </p>
          </div>
        </div>
      </div>

      {/* Drift Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Drift Distribution</h3>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-700">Excellent (&lt; 10ms)</span>
              <span className="text-sm text-gray-600">
                {data.driftDistribution.excellent} (
                {totalDistribution > 0
                  ? ((data.driftDistribution.excellent / totalDistribution) * 100).toFixed(1)
                  : 0}
                %)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full"
                style={{
                  width: `${totalDistribution > 0 ? (data.driftDistribution.excellent / totalDistribution) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700">Good (10-50ms)</span>
              <span className="text-sm text-gray-600">
                {data.driftDistribution.good} (
                {totalDistribution > 0
                  ? ((data.driftDistribution.good / totalDistribution) * 100).toFixed(1)
                  : 0}
                %)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-500 h-3 rounded-full"
                style={{
                  width: `${totalDistribution > 0 ? (data.driftDistribution.good / totalDistribution) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-yellow-700">Acceptable (50-100ms)</span>
              <span className="text-sm text-gray-600">
                {data.driftDistribution.acceptable} (
                {totalDistribution > 0
                  ? ((data.driftDistribution.acceptable / totalDistribution) * 100).toFixed(1)
                  : 0}
                %)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-yellow-500 h-3 rounded-full"
                style={{
                  width: `${totalDistribution > 0 ? (data.driftDistribution.acceptable / totalDistribution) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-red-700">Poor (&gt; 100ms)</span>
              <span className="text-sm text-gray-600">
                {data.driftDistribution.poor} (
                {totalDistribution > 0
                  ? ((data.driftDistribution.poor / totalDistribution) * 100).toFixed(1)
                  : 0}
                %)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-red-500 h-3 rounded-full"
                style={{
                  width: `${totalDistribution > 0 ? (data.driftDistribution.poor / totalDistribution) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Sync Reports</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sync Quality
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Max Drift
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.recentReports.map((report) => (
                <tr key={report.projectId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-gray-900">
                      {report.projectId.substring(0, 12)}...
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span
                        className={`text-sm font-semibold ${getQualityColor(report.syncQualityScore)}`}
                      >
                        {report.syncQualityScore.toFixed(1)}%
                      </span>
                      <div className="ml-3 w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            report.syncQualityScore >= 90
                              ? 'bg-green-500'
                              : report.syncQualityScore >= 70
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                          }`}
                          style={{ width: `${report.syncQualityScore}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm ${
                        report.maxDriftMs < 10
                          ? 'text-green-600'
                          : report.maxDriftMs < 50
                            ? 'text-blue-600'
                            : report.maxDriftMs < 100
                              ? 'text-yellow-600'
                              : 'text-red-600'
                      }`}
                    >
                      {report.maxDriftMs.toFixed(2)}ms
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(report.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quality Legend */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Thresholds</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-700">Excellent: &lt; 10ms drift</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-gray-700">Good: 10-50ms drift</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-gray-700">Acceptable: 50-100ms drift</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-gray-700">Poor: &gt; 100ms drift</span>
          </div>
        </div>
      </div>
    </div>
  );
}
