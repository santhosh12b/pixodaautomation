export interface Lead {
  id: string;
  externalId: string | null;
  name: string;
  phone: string;
  email: string | null;
  sourceSheet: string | null;
  customData: Record<string, unknown>;
  consentStatus: 'granted' | 'pending' | 'revoked';
  status: 'new' | 'contacted' | 'converted' | 'opted_out' | 'failed';
  campaignId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'paused' | 'completed';
  sheetUrl: string | null;
  sheetTab: string | null;
  messageTemplate: string;
  videoAssetId: string | null;
  videoDelaySeconds: number;
  cooldownHours: number;
  videoAsset?: {
    blobUrl: string;
    title: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  leadId: string;
  campaignId: string | null;
  unipileMessageId: string | null;
  direction: 'outbound' | 'inbound';
  type: 'text' | 'video' | 'image' | 'document';
  content: string;
  mediaUrl: string | null;
  deliveryStatus: 'queued' | 'sent' | 'delivered' | 'read' | 'failed';
  rawPayload: Record<string, unknown> | null;
  timestamp: string;
}

export interface Conversation {
  leadId: string;
  leadName: string;
  leadPhone: string;
  lastMessage: Message | null;
  unreadCount: number;
}

export interface MediaAsset {
  id: string;
  title: string;
  description: string | null;
  blobUrl: string;
  fileSize: number;
  mimeType: string;
  thumbnailUrl: string | null;
  createdAt: string;
}

export interface DashboardMetrics {
  totalLeads: number;
  contactedLeads: number;
  convertedLeads: number;
  activeCampaigns: number;
  totalMessages: number;
  messagesDelivered: number;
  messagesRead: number;
  deliveryRate: number;
  readRate: number;
  queueHealth: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    deadLetter: number;
  };
}

export interface DailyVolumeData {
  date: string;
  sent: number;
  delivered: number;
  read: number;
}

export interface FunnelStage {
  stage: string;
  count: number;
  rate: string;
}

export interface CampaignPerformance {
  name: string;
  sent: number;
  responseRate: string;
}

export interface AnalyticsKPIs {
  textOutreachRate: number;
  videoDeliveryRate: number;
  leadEngagementRate: number;
}


