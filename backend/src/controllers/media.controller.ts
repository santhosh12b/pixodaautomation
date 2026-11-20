import { Request, Response } from 'express';
import { z } from 'zod';
import { mediaService } from '../services/media.service.js';

const uploadMediaSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  videoUrl: z.string().url().optional(),
  fileName: z.string().optional(),
  fileBase64: z.string().optional(),
  fileSize: z.number().optional(),
  mimeType: z.string().optional().default('video/mp4'),
  thumbnailUrl: z.string().optional(),
}).refine(data => data.videoUrl || (data.fileBase64 && data.fileName), {
  message: 'Either videoUrl or fileBase64 with fileName is required',
});

export async function listMediaHandler(req: Request, res: Response) {
  const assets = await mediaService.listMedia();
  return res.status(200).json({
    status: 'ok',
    count: assets.length,
    assets,
  });
}

export async function uploadMediaHandler(req: Request, res: Response) {
  const parsed = uploadMediaSchema.parse(req.body);

  if (parsed.videoUrl) {
    const asset = await mediaService.createFromUrl({
      title: parsed.title,
      description: parsed.description,
      videoUrl: parsed.videoUrl,
      fileSize: parsed.fileSize,
      mimeType: parsed.mimeType,
      thumbnailUrl: parsed.thumbnailUrl,
    });

    return res.status(201).json({
      status: 'created',
      asset,
    });
  }

  const fileBuffer = Buffer.from(parsed.fileBase64!, 'base64');
  const asset = await mediaService.uploadAndCreate({
    title: parsed.title,
    description: parsed.description,
    fileName: parsed.fileName!,
    fileBuffer,
    mimeType: parsed.mimeType,
    thumbnailUrl: parsed.thumbnailUrl,
  });

  return res.status(201).json({
    status: 'created',
    asset,
  });
}

export async function deleteMediaHandler(req: Request, res: Response) {
  const { id } = req.params;
  const deleted = await mediaService.deleteMedia(id);

  if (!deleted) {
    return res.status(404).json({
      error: 'Not Found',
      message: `Media asset with ID ${id} not found`,
    });
  }

  return res.status(200).json({
    status: 'deleted',
    message: `Media asset ${id} deleted`,
  });
}

