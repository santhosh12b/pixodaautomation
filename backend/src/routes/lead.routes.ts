import { Router } from 'express';
import { 
  ingestWebhookHandler, 
  listLeadsHandler, 
  getLeadByIdHandler, 
  retryLeadHandler 
} from '../controllers/lead.controller.js';
import { requireWebhookSecret } from '../middleware/auth.js';

const router = Router();

router.post('/webhook', requireWebhookSecret, ingestWebhookHandler);
router.get('/', listLeadsHandler);
router.get('/:id', getLeadByIdHandler);
router.post('/:id/retry', retryLeadHandler);

export default router;

