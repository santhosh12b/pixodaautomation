import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { MetricCard } from '../components/analytics/MetricCard';
import { MessageVolumeChart } from '../components/analytics/MessageVolumeChart';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { 
  Users, 
  Send, 
  CheckCircle, 
  Eye, 
  Flame, 
  Clock, 
  AlertCircle,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: api.getDashboardMetrics,
    refetchInterval: 10000,
  });

  const { data: chartsData, isLoading: chartsLoading } = useQuery({
    queryKey: ['dashboard-charts'],
    queryFn: api.getCharts,
  });

  const { data: leadsData } = useQuery({
    queryKey: ['recent-leads'],
    queryFn: () => api.getLeads(),
    refetchInterval: 10000,
  });

  const metrics = metricsData?.metrics;
  const recentLeads = (leadsData?.leads || []).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Ingested Leads"
          value={metricsLoading ? '...' : (metrics?.totalLeads ?? 0)}
          change="Synced"
          subtitle="From Google Sheets"
          icon={Users}
          iconColor="text-blue-600 bg-blue-50 border-blue-100"
        />
        <MetricCard
          title="WhatsApp Sent"
          value={metricsLoading ? '...' : (metrics?.totalMessages ?? 0)}
          change="Dispatched"
          subtitle={`${metrics?.contactedLeads ?? 0} leads engaged`}
          icon={Send}
          iconColor="text-emerald-600 bg-emerald-50 border-emerald-100"
        />
        <MetricCard
          title="Delivery Rate"
          value={metricsLoading ? '...' : `${metrics?.deliveryRate ?? 0}%`}
          change="Real-time"
          subtitle="Delivered via WhatsApp"
          icon={CheckCircle}
          iconColor="text-teal-600 bg-teal-50 border-teal-100"
        />
        <MetricCard
          title="Message Read Rate"
          value={metricsLoading ? '...' : `${metrics?.readRate ?? 0}%`}
          change="Real-time"
          subtitle="WhatsApp blue check receipts"
          icon={Eye}
          iconColor="text-purple-600 bg-purple-50 border-purple-100"
        />
      </div>

      {/* Main Grid: Queue Health + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Message Volume Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Daily WhatsApp Outreach Volume</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">Automated text & promotional video deliveries</p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Sent
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Delivered
                </span>
                <span className="flex items-center gap-1.5 text-slate-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Read
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {chartsLoading || !chartsData ? (
                <div className="h-72 flex items-center justify-center text-slate-400 text-sm">
                  Loading metrics chart...
                </div>
              ) : (
                <MessageVolumeChart data={chartsData.dailyVolume} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Persistent Queue Status */}
        <div>
          <Card className="h-full flex flex-col justify-between">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-emerald-600" />
                  Neon Queue Health
                </CardTitle>
                <Badge variant="success">Atomic Safe</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 flex-1">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Pending Jobs</span>
                </div>
                <span className="text-sm font-bold text-slate-900 font-mono">
                  {metrics?.queueHealth?.pending ?? 0}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                  <span>Processing (Locked)</span>
                </div>
                <span className="text-sm font-bold text-blue-600 font-mono">
                  {metrics?.queueHealth?.processing ?? 0}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span>Completed</span>
                </div>
                <span className="text-sm font-bold text-emerald-600 font-mono">
                  {metrics?.queueHealth?.completed ?? 0}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span>Dead Letter / Retries</span>
                </div>
                <span className="text-sm font-bold text-red-600 font-mono">
                  {metrics?.queueHealth?.deadLetter ?? 0}
                </span>
              </div>

              <div className="pt-2">
                <Link to="/leads">
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    <span>View Lead Activity Timeline</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Lead Ingestion Activity Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Captured Leads</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">Real-time leads ingested from Google Sheets</p>
          </div>
          <Link to="/leads">
            <Button variant="ghost" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />}>
              View All Leads
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-xs font-semibold text-slate-500">
                  <th className="py-3 px-6">Lead Name</th>
                  <th className="py-3 px-6">Phone Number</th>
                  <th className="py-3 px-6">Source Sheet</th>
                  <th className="py-3 px-6">Consent</th>
                  <th className="py-3 px-6">Automation Status</th>
                  <th className="py-3 px-6 text-right">Captured</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {recentLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                      No leads detected yet. Newly populated rows in Google Sheets will appear here automatically.
                    </td>
                  </tr>
                ) : (
                  recentLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-6 font-medium text-slate-900">{lead.name}</td>
                      <td className="py-3.5 px-6 font-mono text-xs text-slate-600">{lead.phone}</td>
                      <td className="py-3.5 px-6 text-xs text-slate-500">{lead.sourceSheet || 'Direct Webhook'}</td>
                      <td className="py-3.5 px-6">
                        <Badge variant={lead.consentStatus === 'granted' ? 'success' : 'danger'}>
                          {lead.consentStatus}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-6">
                        <Badge 
                          variant={
                            lead.status === 'contacted' ? 'info' :
                            lead.status === 'converted' ? 'success' :
                            lead.status === 'opted_out' ? 'danger' : 'default'
                          }
                        >
                          {lead.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-6 text-right text-xs text-slate-400 font-mono">
                        {new Date(lead.createdAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
