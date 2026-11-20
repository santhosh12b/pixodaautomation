import { Request, Response } from 'express';
import { leadService } from '../services/lead.service.js';
import { campaignService } from '../services/campaign.service.js';
import { queueService } from '../services/queue.service.js';
import { inboxService } from '../services/inbox.service.js';

export async function getDashboardMetricsHandler(req: Request, res: Response) {
  const allLeads = await leadService.listLeads();
  const allCampaigns = await campaignService.listCampaigns();
  const queueStats = await queueService.getStats();
  const allMessages = await inboxService.getAllMessages();

  const totalLeads = allLeads.length;
  const contactedLeads = allLeads.filter(l => l.status === 'contacted' || l.status === 'converted').length;
  const convertedLeads = allLeads.filter(l => l.status === 'converted').length;
  const activeCampaigns = allCampaigns.filter(c => c.status === 'active').length;

  // Calculate message stats across real outbound messages
  const outboundMessages = allMessages.filter(m => m.direction === 'outbound');
  const totalMessages = outboundMessages.length;
  const messagesDelivered = outboundMessages.filter(m => m.deliveryStatus === 'delivered' || m.deliveryStatus === 'read').length;
  const messagesRead = outboundMessages.filter(m => m.deliveryStatus === 'read').length;
  const messagesFailed = outboundMessages.filter(m => m.deliveryStatus === 'failed').length;

  const deliveryRate = totalMessages > 0 ? Number(((messagesDelivered / totalMessages) * 100).toFixed(1)) : 0;
  const readRate = messagesDelivered > 0 ? Number(((messagesRead / messagesDelivered) * 100).toFixed(1)) : 0;

  return res.status(200).json({
    status: 'ok',
    metrics: {
      totalLeads,
      contactedLeads,
      convertedLeads,
      activeCampaigns,
      totalMessages,
      messagesDelivered,
      messagesRead,
      messagesFailed,
      deliveryRate,
      readRate,
      queueHealth: queueStats,
    },
  });
}

export async function getChartDataHandler(req: Request, res: Response) {
  const allLeads = await leadService.listLeads();
  const allCampaigns = await campaignService.listCampaigns();
  const allMessages = await inboxService.getAllMessages();

  // 1. Calculate Real Daily Volume for the past 7 days
  const today = new Date();
  const dailyVolume = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const targetYMD = d.toISOString().slice(0, 10);

    const dayOutbound = allMessages.filter(m => {
      if (m.direction !== 'outbound') return false;
      const mDate = new Date(m.timestamp).toISOString().slice(0, 10);
      return mDate === targetYMD;
    });

    const sent = dayOutbound.length;
    const delivered = dayOutbound.filter(m => m.deliveryStatus === 'delivered' || m.deliveryStatus === 'read').length;
    const read = dayOutbound.filter(m => m.deliveryStatus === 'read').length;

    dailyVolume.push({
      date: dateStr,
      sent,
      delivered,
      read,
    });
  }

  // 2. Real Outreach Funnel from actual leads and deliveries
  const totalLeads = allLeads.length;
  const consentCount = allLeads.filter(l => l.consentStatus === 'granted').length;

  const textDeliveredLeadIds = new Set<string>();
  const videoDeliveredLeadIds = new Set<string>();
  const engagedLeadIds = new Set<string>();

  for (const m of allMessages) {
    if (m.direction === 'outbound') {
      const isDelivered = m.deliveryStatus === 'delivered' || m.deliveryStatus === 'read';
      if (isDelivered && m.type === 'text') textDeliveredLeadIds.add(m.leadId);
      if (isDelivered && m.type === 'video') videoDeliveredLeadIds.add(m.leadId);
      if (m.deliveryStatus === 'read') engagedLeadIds.add(m.leadId);
    } else if (m.direction === 'inbound') {
      engagedLeadIds.add(m.leadId);
    }
  }

  const funnel = [
    {
      stage: 'Leads Ingested',
      count: totalLeads,
      rate: totalLeads > 0 ? '100%' : '0%',
    },
    {
      stage: 'Consent Verified',
      count: consentCount,
      rate: totalLeads > 0 ? `${((consentCount / totalLeads) * 100).toFixed(1)}%` : '0%',
    },
    {
      stage: 'Text Message Delivered',
      count: textDeliveredLeadIds.size,
      rate: totalLeads > 0 ? `${((textDeliveredLeadIds.size / totalLeads) * 100).toFixed(1)}%` : '0%',
    },
    {
      stage: 'Promotional Video Delivered',
      count: videoDeliveredLeadIds.size,
      rate: totalLeads > 0 ? `${((videoDeliveredLeadIds.size / totalLeads) * 100).toFixed(1)}%` : '0%',
    },
    {
      stage: 'Read & Engaged',
      count: engagedLeadIds.size,
      rate: totalLeads > 0 ? `${((engagedLeadIds.size / totalLeads) * 100).toFixed(1)}%` : '0%',
    },
  ];

  // 3. Real Campaign Performance
  const campaignPerformance = allCampaigns.map(c => {
    const campaignMessages = allMessages.filter(m => m.campaignId === c.id && m.direction === 'outbound');
    const sent = campaignMessages.length;
    const leadsForCamp = allLeads.filter(l => l.campaignId === c.id);
    const convertedOrEngaged = leadsForCamp.filter(l => l.status === 'converted' || engagedLeadIds.has(l.id)).length;
    const responseRate = leadsForCamp.length > 0
      ? `${((convertedOrEngaged / leadsForCamp.length) * 100).toFixed(1)}%`
      : '0%';

    return {
      name: c.name,
      sent,
      responseRate,
    };
  });

  // 4. Outreach Success KPIs
  const totalOutboundText = allMessages.filter(m => m.direction === 'outbound' && m.type === 'text');
  const deliveredOutboundText = totalOutboundText.filter(m => m.deliveryStatus === 'delivered' || m.deliveryStatus === 'read');
  const textOutreachRate = totalOutboundText.length > 0
    ? Number(((deliveredOutboundText.length / totalOutboundText.length) * 100).toFixed(1))
    : (totalLeads > 0 && textDeliveredLeadIds.size > 0 ? 100 : 0);

  const totalOutboundVideo = allMessages.filter(m => m.direction === 'outbound' && m.type === 'video');
  const deliveredOutboundVideo = totalOutboundVideo.filter(m => m.deliveryStatus === 'delivered' || m.deliveryStatus === 'read');
  const videoDeliveryRate = totalOutboundVideo.length > 0
    ? Number(((deliveredOutboundVideo.length / totalOutboundVideo.length) * 100).toFixed(1))
    : (totalLeads > 0 && videoDeliveredLeadIds.size > 0 ? 100 : 0);

  const leadEngagementRate = totalLeads > 0
    ? Number(((engagedLeadIds.size / totalLeads) * 100).toFixed(1))
    : 0;

  return res.status(200).json({
    status: 'ok',
    dailyVolume,
    funnel,
    campaignPerformance,
    kpis: {
      textOutreachRate,
      videoDeliveryRate,
      leadEngagementRate,
    },
  });
}
