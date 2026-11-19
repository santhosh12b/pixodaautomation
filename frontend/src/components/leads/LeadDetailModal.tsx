import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Lead } from '../../types';
import { LeadTimeline } from './LeadTimeline';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { X, RefreshCw, Phone, Mail, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

interface LeadDetailModalProps {
  leadId: string | null;
  onClose: () => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ leadId, onClose }) => {
  const queryClient = useQueryClient();
  const [retryFeedback, setRetryFeedback] = useState<string | null>(null);

  const { data: leadData, isLoading: leadLoading } = useQuery({
    queryKey: ['lead-detail', leadId],
    queryFn: () => (leadId ? api.getLead(leadId) : Promise.reject('No ID')),
    enabled: !!leadId,
  });

  const { data: messagesData } = useQuery({
    queryKey: ['lead-messages', leadId],
    queryFn: () => (leadId ? api.getMessages(leadId) : Promise.reject('No ID')),
    enabled: !!leadId,
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => api.retryLead(id),
    onSuccess: (data) => {
      setRetryFeedback(data.message || 'Retry job queued');
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['lead-messages', leadId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      setTimeout(() => setRetryFeedback(null), 4000);
    },
    onError: (err) => {
      setRetryFeedback(err instanceof Error ? err.message : 'Retry failed');
      setTimeout(() => setRetryFeedback(null), 4000);
    },
  });

  if (!leadId) return null;

  const lead = leadData?.lead;
  const messages = messagesData?.messages || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900">Lead Automation Profile</h3>
            <p className="text-xs text-slate-500">Timeline and delivery progression</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {leadLoading || !lead ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading lead details...</div>
          ) : (
            <>
              {/* Profile Card */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-slate-900">{lead.name}</h4>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-600">
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      {lead.phone}
                    </span>
                    {lead.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {lead.email}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
                      {lead.sourceSheet || 'Google Sheet'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={lead.consentStatus === 'granted' ? 'success' : 'danger'}>
                    Consent: {lead.consentStatus}
                  </Badge>
                  <Badge
                    variant={
                      lead.status === 'contacted' ? 'info' :
                      lead.status === 'converted' ? 'success' :
                      lead.status === 'opted_out' ? 'danger' : 'default'
                    }
                  >
                    {lead.status}
                  </Badge>
                </div>
              </div>

              {/* Custom Google Sheet Attributes */}
              {lead.customData && Object.keys(lead.customData).length > 0 && (
                <div>
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Ingested Sheet Attributes (Variables)
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(lead.customData).map(([key, val]) => (
                      <div key={key} className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs">
                        <span className="text-[10px] text-slate-400 block font-mono uppercase">{key}</span>
                        <span className="font-semibold text-slate-800">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Event Timeline */}
              <div>
                <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Outreach Progression Timeline
                </h5>
                <LeadTimeline lead={lead} messages={messages} />
              </div>
            </>
          )}
        </div>

        {/* Footer with Retry Action */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
          <div>
            {retryFeedback && (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {retryFeedback}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
            {lead && lead.consentStatus !== 'revoked' && (
              <Button
                variant="primary"
                size="sm"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                isLoading={retryMutation.isPending}
                onClick={() => retryMutation.mutate(lead.id)}
              >
                Retry WhatsApp Sequence
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

