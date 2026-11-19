import { Request, Response } from 'express';
import { z } from 'zod';
import { leadService } from '../services/lead.service.js';

const singleLeadSchema = z.object({
  externalId: z.string().optional(),
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(5, 'Valid phone number required'),
  email: z.string().email().optional().or(z.literal('')),
  sourceSheet: z.string().optional(),
  customData: z.record(z.unknown()).optional(),
  consentStatus: z.enum(['granted', 'pending', 'revoked']).optional(),
});

const batchLeadsSchema = z.object({
  leads: z.array(singleLeadSchema).min(1, 'At least one lead is required'),
});

export async function ingestWebhookHandler(req: Request, res: Response) {
  let leadsToProcess = [];

  // Support either { leads: [...] } or a single lead object { name, phone }
  if (Array.isArray(req.body?.leads)) {
    const parsed = batchLeadsSchema.parse(req.body);
    leadsToProcess = parsed.leads;
  } else {
    const parsed = singleLeadSchema.parse(req.body);
    leadsToProcess = [parsed];
  }

  // Cast email empty string to undefined if needed
  const normalizedInputs = leadsToProcess.map(l => ({
    ...l,
    email: l.email || undefined,
  }));

  const result = await leadService.ingestBatch(normalizedInputs);

  return res.status(200).json({
    status: 'success',
    summary: result.summary,
    leads: result.ingested,
    duplicates: result.duplicates,
    optedOut: result.optedOut,
  });
}

export async function listLeadsHandler(req: Request, res: Response) {
  const { status, campaignId, search } = req.query;

  const leadsList = await leadService.listLeads({
    status: typeof status === 'string' ? status : undefined,
    campaignId: typeof campaignId === 'string' ? campaignId : undefined,
    search: typeof search === 'string' ? search : undefined,
  });

  return res.status(200).json({
    status: 'ok',
    count: leadsList.length,
    leads: leadsList,
  });
}

export async function getLeadByIdHandler(req: Request, res: Response) {
  const { id } = req.params;
  const lead = await leadService.getLeadById(id);

  if (!lead) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Lead with ID ${id} not found`,
    });
  }

  return res.status(200).json({
    status: 'ok',
    lead,
  });
}

export async function retryLeadHandler(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const result = await leadService.retryLeadOutreach(id);
    return res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(400).json({
      error: 'Retry Failed',
      message,
    });
  }
}
