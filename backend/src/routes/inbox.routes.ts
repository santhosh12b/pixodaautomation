import { Router } from 'express';
import { 
  listConversationsHandler, 
  getLeadMessagesHandler, 
  sendLeadReplyHandler 
} from '../controllers/inbox.controller.js';

const router = Router();

router.get('/conversations', listConversationsHandler);
router.get('/:leadId/messages', getLeadMessagesHandler);
router.post('/:leadId/messages', sendLeadReplyHandler);

export default router;

