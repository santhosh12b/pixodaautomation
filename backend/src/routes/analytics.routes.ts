import { Router } from 'express';
import {
  getDashboardMetricsHandler,
  getChartDataHandler,
} from '../controllers/analytics.controller.js';

const router = Router();

router.get('/dashboard', getDashboardMetricsHandler);
router.get('/charts', getChartDataHandler);

export default router;
