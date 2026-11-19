import { Router } from 'express';
import {
  listMediaHandler,
  uploadMediaHandler,
  deleteMediaHandler,
} from '../controllers/media.controller.js';

const router = Router();

router.get('/', listMediaHandler);
router.post('/upload', uploadMediaHandler);
router.delete('/:id', deleteMediaHandler);

export default router;
