'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface AdaptationMetrics {
  languagePair: string;
  totalSegments: number;
  successfulSegments: number;
  failedSegments: number;
  successRate: number;
  averageAttempts: number;
  validationFailureReasons: Record<string, number>;
}

interface DashboardData {
  overallMetrics: {
    totalProjects: number;
    totalSegments: number;
    overallSuccessRate: number;
    averageAttempts: number;
  };
  byLanguagePair: AdaptationMetrics[];
  recentFailures: Array<{
    projectId: string;
    segmentId: number;
    text: string;
    reason: string;
    attempts: number;
    timestamp: string;
  }>;
  validationFailureBreakdown: Record<string, number>;
  trendsOverTime: Array<{
    date: string;
    successRate: number;
    averageAttempts: number;
  }>;
}

export function AdaptationMetricsDashboard() {
  const [days, setDays] = useState(30);

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['adaptation-metrics', days],
    queryFn: async () => {
      const response = await apiClient.get(`/api/adaptation-metrics/dashboard?days=${days}`);
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
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
        <p className="text-red-800">Failed to load adaptation metrics</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Adaptation Quality Metrics</h2>
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Time Range:</label>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Overall Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-blue-600">Total Projects</p>
            <p className="text-2xl font-bold text-blue-900">{data.overallMetrics.totalProjects}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-600">Total Segments</p>
            <p className="text-2xl font-bold text-purple-900">{data.overallMetrics.totalSegments.toLocaleString()}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-sm text-green-600">Success Rate</p>
            <p className={`text-2xl font-bold ${getSuccessRateColor(data.overallMetrics.overallSuccessRate)}`}>
              {data.overallMetrics.overallSuccessRate.toFixed(1)}%
            </p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <p className="text-sm text-yellow-600">Avg Attempts</p>
            <p className="text-2xl font-bold text-yellow-900">{data.overallMetrics.averageAttempts.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Language Pair Performance */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Performance by Language Pair</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Language Pair
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Segments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Success Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Attempts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Failed
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.byLanguagePair.map((metrics) => (
                <tr key={metrics.languagePair} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{metrics.languagePair}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {metrics.totalSegments.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className={`font-semibold ${getSuccessRateColor(metrics.successRate)}`}>
                        {metrics.successRate.toFixed(1)}%
                      </span>
                      <div className="ml-3 w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            metrics.successRate >= 90 ? 'bg-green-500' :
                            metrics.successRate >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${metrics.successRate}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {metrics.averageAttempts.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded">
                      {metrics.failedSegments}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validation Failure Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Validation Failure Reasons</h3>
        <div className="space-y-3">
          {Object.entries(data.validationFailureBreakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([reason, count]) => {
              const total = Object.values(data.validationFailureBreakdown).reduce((sum, c) => sum + c, 0);
              const percentage = total > 0 ? (count / total) * 100 : 0;
              
              return (
                <div key={reason} className="flex items-center">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{reason}</span>
                      <span className="text-sm text-gray-500">{count} ({percentage.toFixed(1)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Trends Over Time */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Trends Over Time</h3>
        <div className="space-y-4">
          {data.trendsOverTime.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Success Rate</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Avg Attempts</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.trendsOverTime.slice(-14).map((trend) => (
                    <tr key={trend.date} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {new Date(trend.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-sm font-medium ${getSuccessRateColor(trend.successRate)}`}>
                          {trend.successRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {trend.averageAttempts.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No trend data available</p>
          )}
        </div>
      </div>

      {/* Recent Failures */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Failures</h3>
        </div>
        <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
          {data.recentFailures.length > 0 ? (
            data.recentFailures.slice(0, 20).map((failure, index) => (
              <div key={`${failure.projectId}-${failure.segmentId}-${index}`} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs font-mono text-gray-500">
                        Project: {failure.projectId.substring(0, 8)}...
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">Segment {failure.segmentId}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500">{failure.attempts} attempts</span>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{failure.text}</p>
                    <p className="text-xs text-red-600 font-medium">Reason: {failure.reason}</p>
                  </div>
                  <span className="text-xs text-gray-400 ml-4">
                    {new Date(failure.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              No recent failures
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
