import { Router } from 'express';
import { unipileWebhookHandler } from '../controllers/webhook.controller.js';

const router = Router();

router.post('/unipile', unipileWebhookHandler);

export default router;
