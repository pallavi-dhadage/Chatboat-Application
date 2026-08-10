/**
 * AnalyticsDashboard — admin-only platform metrics dashboard.
 * Uses Recharts for charts. Fetches from /api/v1/analytics.
 */

import { useEffect, useState } from 'react';
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { apiClient } from '../../lib/apiClient';
import type { AnalyticsPayload } from '../../types';

interface SentimentChartPoint {
  date: string;
  Positive: number;
  Neutral: number;
  Negative: number;
}

export default function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    apiClient.get<AnalyticsPayload>('/analytics')
      .then(({ data }) => setMetrics(data))
      .catch((err: { response?: { data?: { error?: string } } }) =>
        setError(err.response?.data?.error || 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-gray-500">Loading analytics…</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;
  if (!metrics) return <div className="p-8 text-gray-500">No analytics available.</div>;

  const sentimentData: SentimentChartPoint[] = (metrics.sentiment_trend || []).map((d) => ({
    date:     d.date,
    Positive: +(d.positive * 100).toFixed(1),
    Neutral:  +(d.neutral  * 100).toFixed(1),
    Negative: +(d.negative * 100).toFixed(1),
  }));

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Analytics</h2>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Messages',      value: metrics.message_volume },
          { label: 'Active Users',  value: metrics.active_users },
          { label: 'Flagged',       value: metrics.flagged_message_count },
          { label: 'Avg Response',  value: `${Math.round(metrics.response_time_ms)}ms` },
        ].map(({ label, value }) => (
          <div key={label}
               className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border
                          border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          </div>
        ))}
      </div>

      {/* Sentiment trend chart */}
      {sentimentData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border
                        border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Sentiment Trend (%)
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={sentimentData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Positive" fill="#10b981" />
              <Bar dataKey="Neutral"  fill="#6b7280" />
              <Bar dataKey="Negative" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* AI insights */}
      {metrics.ai_insights && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border
                        border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            AI Insights (last 7 days)
          </h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {metrics.ai_insights.smart_reply_requests}
              </p>
              <p className="text-xs text-gray-500">Smart Reply Requests</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {metrics.ai_insights.cache_hits}
              </p>
              <p className="text-xs text-gray-500">Cache Hits</p>
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {metrics.ai_insights.avg_latency_ms}ms
              </p>
              <p className="text-xs text-gray-500">Avg Latency</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
