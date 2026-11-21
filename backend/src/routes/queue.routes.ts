import { Router } from 'express';
import { processQueueHandler, getQueueStatsHandler, getQueueJobsHandler } from '../controllers/queue.controller.js';

const router = Router();

router.post('/process', processQueueHandler);
router.get('/stats', getQueueStatsHandler);
router.get('/jobs', getQueueJobsHandler);

export default router;

