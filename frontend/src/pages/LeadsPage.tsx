import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';
import { Lead } from '../types';
import { LeadDetailModal } from '../components/leads/LeadDetailModal';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { 
  Users, 
  Search, 
  Filter, 
  Eye, 
  RefreshCw, 
  Phone, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export const LeadsPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [consentFilter, setConsentFilter] = useState<string>('all');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['leads'],
    queryFn: () => api.getLeads(),
    refetchInterval: 10000,
  });

  const leads = data?.leads || [];

  const filteredLeads = leads.filter((lead) => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(search.toLowerCase()) || 
      lead.phone.includes(search) ||
      (lead.email && lead.email.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesConsent = consentFilter === 'all' || lead.consentStatus === consentFilter;

    return matchesSearch && matchesStatus && matchesConsent;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Lead Directory & Management</h3>
          <p className="text-xs text-slate-500">Every lead synced from Google Sheets with consent audit logs</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
          <Users className="w-4 h-4 text-emerald-600" />
          <span>Total Captured: <strong className="text-slate-900">{leads.length}</strong></span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search leads by name, phone or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['all', 'new', 'contacted', 'converted', 'opted_out'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                statusFilter === s
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-xs font-semibold text-slate-500">
                  <th className="py-3.5 px-6">Lead Name</th>
                  <th className="py-3.5 px-6">WhatsApp Phone</th>
                  <th className="py-3.5 px-6">Source Sheet</th>
                  <th className="py-3.5 px-6">Consent</th>
                  <th className="py-3.5 px-6">Pipeline Status</th>
                  <th className="py-3.5 px-6">Added At</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      Loading leads...
                    </td>
                  </tr>
                ) : filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      No matching leads found.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-6 font-medium text-slate-900">
                        {lead.name}
                        {lead.email && <span className="block text-xs font-normal text-slate-400">{lead.email}</span>}
                      </td>
                      <td className="py-3.5 px-6 font-mono text-xs text-slate-700">
                        {lead.phone}
                      </td>
                      <td className="py-3.5 px-6 text-xs text-slate-500">
                        {lead.sourceSheet || 'Direct Webhook'}
                      </td>
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
                          {lead.status.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-6 text-xs text-slate-400 font-mono">
                        {new Date(lead.createdAt).toLocaleDateString()} {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          icon={<Eye className="w-3.5 h-3.5" />}
                          onClick={() => setSelectedLeadId(lead.id)}
                        >
                          Timeline
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Lead Detail & Timeline Modal */}
      <LeadDetailModal
        leadId={selectedLeadId}
        onClose={() => setSelectedLeadId(null)}
      />
    </div>
  );
};

export default LeadsPage;
