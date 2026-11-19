import { Router } from 'express';
import { processQueueHandler, getQueueStatsHandler } from '../controllers/queue.controller.js';

const router = Router();

router.post('/process', processQueueHandler);
router.get('/stats', getQueueStatsHandler);

export default router;

