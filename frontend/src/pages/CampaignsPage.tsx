import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Campaign } from '../types';
import { CampaignModal } from '../components/campaigns/CampaignModal';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { 
  Plus, 
  Search, 
  Send, 
  Video, 
  Clock, 
  Play, 
  Pause, 
  Trash2, 
  Edit, 
  Sparkles 
} from 'lucide-react';

export const CampaignsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: api.getCampaigns,
  });

  const campaigns = data?.campaigns || [];

  // Toggle active/pause mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const nextStatus = currentStatus === 'active' ? 'paused' : 'active';
      return api.updateCampaign(id, { status: nextStatus as 'active' | 'paused' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteCampaign(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
    },
  });

  const filteredCampaigns = campaigns.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) || 
      (c.sheetUrl && c.sheetUrl.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setIsModalOpen(true);
  };

  const handleCreateNew = () => {
    setEditingCampaign(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900">Campaign Management</h3>
          <p className="text-xs text-slate-500">Configure automated message templates, Google Sheet triggers, and promotional videos</p>
        </div>

        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={handleCreateNew}
        >
          Create Campaign
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search campaigns by name or sheet..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {['all', 'active', 'paused', 'draft'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                statusFilter === s
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 py-12 text-center text-slate-400 text-sm">
            Loading campaigns...
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="col-span-2 py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-white p-8">
            <Send className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">No campaigns found</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Create your first campaign to automatically match and message leads as soon as they appear in Google Sheets.
            </p>
            <div className="mt-4">
              <Button size="sm" onClick={handleCreateNew}>
                Create New Campaign
              </Button>
            </div>
          </div>
        ) : (
          filteredCampaigns.map((campaign) => (
            <Card key={campaign.id} className="flex flex-col justify-between hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-bold text-slate-900">{campaign.name}</CardTitle>
                    <Badge
                      variant={
                        campaign.status === 'active' ? 'success' :
                        campaign.status === 'paused' ? 'warning' : 'default'
                      }
                    >
                      {campaign.status}
                    </Badge>
                  </div>
                  {campaign.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{campaign.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleStatusMutation.mutate({ id: campaign.id, currentStatus: campaign.status })}
                    title={campaign.status === 'active' ? 'Pause Campaign' : 'Activate Campaign'}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      campaign.status === 'active'
                        ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {campaign.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEdit(campaign)}
                    className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Delete campaign "${campaign.name}"?`)) {
                        deleteMutation.mutate(campaign.id);
                      }
                    }}
                    className="p-1.5 rounded-lg border border-slate-200 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>

              <CardContent className="space-y-3.5 text-xs">
                {/* Template preview */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-700 font-mono text-[11px] line-clamp-2">
                  {campaign.messageTemplate}
                </div>

                {/* Metadata Pills */}
                <div className="flex flex-wrap items-center gap-3 text-slate-500 pt-1">
                  <span className="flex items-center gap-1 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Sheet: <strong className="text-slate-800">{campaign.sheetUrl || 'Any'}</strong>
                  </span>

                  {campaign.videoAssetId ? (
                    <span className="flex items-center gap-1 font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <Video className="w-3.5 h-3.5" />
                      Video Attached (+{campaign.videoDelaySeconds}s delay)
                    </span>
                  ) : (
                    <span className="text-slate-400">Text Only</span>
                  )}

                  <span className="flex items-center gap-1 text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    {campaign.cooldownHours}h Cooldown
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Campaign Modal */}
      <CampaignModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['campaigns'] })}
        campaignToEdit={editingCampaign}
      />
    </div>
  );
};

export default CampaignsPage;
