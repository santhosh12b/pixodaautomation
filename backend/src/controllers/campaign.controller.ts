import { Request, Response } from 'express';
import { z } from 'zod';
import { campaignService } from '../services/campaign.service.js';

const createCampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required'),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'paused', 'completed']).optional(),
  sheetUrl: z.string().optional(),
  sheetTab: z.string().optional(),
  messageTemplate: z.string().min(1, 'Message template is required'),
  videoAssetId: z.string().uuid().optional().or(z.literal('')),
  videoCaption: z.string().optional(),
  videoDelaySeconds: z.number().int().min(0).max(300).optional(),
  documentAssetId: z.string().uuid().optional().or(z.literal('')),
  documentCaption: z.string().optional(),
  documentDelaySeconds: z.number().int().min(0).max(300).optional(),
  cooldownHours: z.number().int().min(1).max(720).optional(),
});

const updateCampaignSchema = createCampaignSchema.partial();

export async function listCampaignsHandler(req: Request, res: Response) {
  const campaigns = await campaignService.listCampaigns();
  return res.status(200).json({
    status: 'ok',
    count: campaigns.length,
    campaigns,
  });
}

export async function getCampaignHandler(req: Request, res: Response) {
  const { id } = req.params;
  const campaign = await campaignService.getCampaignById(id);

  if (!campaign) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Campaign with ID ${id} not found`,
    });
  }

  return res.status(200).json({
    status: 'ok',
    campaign,
  });
}

export async function createCampaignHandler(req: Request, res: Response) {
  const parsed = createCampaignSchema.parse(req.body);
  const campaign = await campaignService.createCampaign({
    ...parsed,
    videoAssetId: parsed.videoAssetId || undefined,
    documentAssetId: parsed.documentAssetId || undefined,
  });

  return res.status(201).json({
    status: 'created',
    campaign,
  });
}

export async function updateCampaignHandler(req: Request, res: Response) {
  const { id } = req.params;
  const parsed = updateCampaignSchema.parse(req.body);
  const updated = await campaignService.updateCampaign(id, {
    ...parsed,
    videoAssetId: parsed.videoAssetId || undefined,
  });

  if (!updated) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Campaign with ID ${id} not found`,
    });
  }

  return res.status(200).json({
    status: 'updated',
    campaign: updated,
  });
}

export async function deleteCampaignHandler(req: Request, res: Response) {
  const { id } = req.params;
  const success = await campaignService.deleteCampaign(id);

  if (!success) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Campaign with ID ${id} not found`,
    });
  }

  return res.status(200).json({
    status: 'deleted',
    message: `Campaign ${id} deleted successfully`,
  });
}

