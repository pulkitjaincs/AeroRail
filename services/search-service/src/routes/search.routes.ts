import { Router } from 'express';
import { SearchController } from '../controllers/search.controller.js';

const router = Router();

router.get('/trains', SearchController.search);
router.get('/availability', SearchController.availability);

export default router;
