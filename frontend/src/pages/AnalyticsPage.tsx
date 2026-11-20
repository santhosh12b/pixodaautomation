import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { MessageVolumeChart } from '../components/analytics/MessageVolumeChart';
import { ConversionFunnel } from '../components/analytics/ConversionFunnel';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { BarChart3, Filter, ArrowUpRight, CheckCircle2, Video, MessageCircle } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | 'all'>('7d');

  const { data: chartsData, isLoading } = useQuery({
    queryKey: ['analytics-charts', timeRange],
    queryFn: api.getCharts,
  });

  const dailyVolume = chartsData?.dailyVolume || [];
  const funnel = chartsData?.funnel || [];
  const campaignPerformance = chartsData?.campaignPerformance || [];
  const kpis = chartsData?.kpis;

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Campaign Outreach & Engagement Metrics</h3>
          <p className="text-xs text-slate-500">Track delivery rates, WhatsApp read receipts, and promotional video engagement</p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 p-1 rounded-lg">
          <Button
            size="sm"
            variant={timeRange === '7d' ? 'primary' : 'ghost'}
            onClick={() => setTimeRange('7d')}
          >
            Last 7 Days
          </Button>
          <Button
            size="sm"
            variant={timeRange === '30d' ? 'primary' : 'ghost'}
            onClick={() => setTimeRange('30d')}
          >
            Last 30 Days
          </Button>
          <Button
            size="sm"
            variant={timeRange === 'all' ? 'primary' : 'ghost'}
            onClick={() => setTimeRange('all')}
          >
            All Time
          </Button>
        </div>
      </div>

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Text Outreach Success</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <MessageCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {isLoading ? '...' : `${kpis?.textOutreachRate ?? 0}%`}
            </span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Live
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">First-touch text successfully received</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Video Asset Delivery</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {isLoading ? '...' : `${kpis?.videoDeliveryRate ?? 0}%`}
            </span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Live
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Chained promotional video sent after text</p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase">Lead Engagement Rate</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {isLoading ? '...' : `${kpis?.leadEngagementRate ?? 0}%`}
            </span>
            <span className="text-xs text-emerald-600 font-semibold flex items-center">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Live
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Read receipt or 2-way chat reply received</p>
        </Card>
      </div>

      {/* Charts & Funnel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: 5-Stage Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              Automated Outreach Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-xs">Loading funnel...</div>
            ) : (
              <ConversionFunnel stages={funnel} />
            )}
          </CardContent>
        </Card>

        {/* Right: Message Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Delivery & Receipt Trends</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center text-slate-400 text-xs">Loading chart...</div>
            ) : (
              <MessageVolumeChart data={dailyVolume} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Campaign Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Performance Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500">
                <th className="py-3 px-6">Campaign Source</th>
                <th className="py-3 px-6">Messages Dispatched</th>
                <th className="py-3 px-6">Response / Conversion Rate</th>
                <th className="py-3 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {campaignPerformance.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                    No active campaign data found.
                  </td>
                </tr>
              ) : (
                campaignPerformance.map((c) => (
                  <tr key={c.name} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-6 font-medium text-slate-900">{c.name}</td>
                    <td className="py-3.5 px-6 font-mono text-xs">{c.sent} deliveries</td>
                    <td className="py-3.5 px-6">
                      <span className="font-semibold text-emerald-600">{c.responseRate}</span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <Badge variant="success">Active Automations</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
