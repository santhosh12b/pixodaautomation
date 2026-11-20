import { 
  DashboardMetrics, 
  DailyVolumeData, 
  FunnelStage, 
  CampaignPerformance,
  AnalyticsKPIs,
  Campaign,
  Lead,
  Conversation,
  Message,
  MediaAsset
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')
    ? 'https://pixodaautomation.vercel.app' 
    : '');

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const errorText = await res.text();
    let parsedMessage = errorText;
    try {
      const json = JSON.parse(errorText);
      parsedMessage = json.message || json.error || errorText;
    } catch {
      // ignore
    }
    throw new Error(parsedMessage || `API Error: ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Analytics
  getDashboardMetrics: async (): Promise<{ metrics: DashboardMetrics }> => {
    return request<{ metrics: DashboardMetrics }>('/api/analytics/dashboard');
  },
  getCharts: async (): Promise<{ dailyVolume: DailyVolumeData[]; funnel: FunnelStage[]; campaignPerformance: CampaignPerformance[]; kpis?: AnalyticsKPIs }> => {
    return request('/api/analytics/charts');
  },

  // Campaigns
  getCampaigns: async (): Promise<{ campaigns: Campaign[] }> => {
    return request<{ campaigns: Campaign[] }>('/api/campaigns');
  },
  getCampaign: async (id: string): Promise<{ campaign: Campaign }> => {
    return request<{ campaign: Campaign }>(`/api/campaigns/${id}`);
  },
  createCampaign: async (data: Partial<Campaign>): Promise<{ campaign: Campaign }> => {
    return request<{ campaign: Campaign }>('/api/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  updateCampaign: async (id: string, data: Partial<Campaign>): Promise<{ campaign: Campaign }> => {
    return request<{ campaign: Campaign }>(`/api/campaigns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  deleteCampaign: async (id: string): Promise<{ status: string }> => {
    return request<{ status: string }>(`/api/campaigns/${id}`, {
      method: 'DELETE',
    });
  },

  // Leads
  getLeads: async (params?: { status?: string; campaignId?: string; search?: string }): Promise<{ leads: Lead[] }> => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.campaignId) query.set('campaignId', params.campaignId);
    if (params?.search) query.set('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request<{ leads: Lead[] }>(`/api/leads${qs}`);
  },
  getLead: async (id: string): Promise<{ lead: Lead }> => {
    return request<{ lead: Lead }>(`/api/leads/${id}`);
  },
  retryLead: async (id: string): Promise<{ success: boolean; message: string }> => {
    return request<{ success: boolean; message: string }>(`/api/leads/${id}/retry`, {
      method: 'POST',
    });
  },

  // Inbox & Chat
  getConversations: async (): Promise<{ conversations: Conversation[] }> => {
    return request<{ conversations: Conversation[] }>('/api/inbox/conversations');
  },
  getMessages: async (leadId: string): Promise<{ messages: Message[] }> => {
    return request<{ messages: Message[] }>(`/api/inbox/${leadId}/messages`);
  },
  sendReply: async (leadId: string, text: string): Promise<{ message: Message }> => {
    return request<{ message: Message }>(`/api/inbox/${leadId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    });
  },

  // Media & Video Library
  getMedia: async (): Promise<{ assets: MediaAsset[] }> => {
    return request<{ assets: MediaAsset[] }>('/api/media');
  },
  uploadMedia: async (data: {
    title: string;
    description?: string;
    fileName: string;
    fileBase64: string;
    mimeType?: string;
  }): Promise<{ asset: MediaAsset }> => {
    return request<{ asset: MediaAsset }>('/api/media/upload', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  deleteMedia: async (id: string): Promise<{ status: string }> => {
    return request<{ status: string }>(`/api/media/${id}`, {
      method: 'DELETE',
    });
  },

  // Queue Processing (Manual / Trigger)
  processQueue: async (batchSize: number = 10): Promise<{ status: string; result: unknown }> => {
    return request('/api/queue/process', {
      method: 'POST',
      body: JSON.stringify({ batchSize }),
    });
  },
};

