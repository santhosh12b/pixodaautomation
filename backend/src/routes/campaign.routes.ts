import { Router } from 'express';
import {
  listCampaignsHandler,
  getCampaignHandler,
  createCampaignHandler,
  updateCampaignHandler,
  deleteCampaignHandler,
} from '../controllers/campaign.controller.js';

const router = Router();

router.get('/', listCampaignsHandler);
router.post('/', createCampaignHandler);
router.get('/:id', getCampaignHandler);
router.patch('/:id', updateCampaignHandler);
router.delete('/:id', deleteCampaignHandler);

export default router;
