import express from 'express';

import validateRequest from '../../middlewares/validateRequest';
import { WarrantyController } from './warranties.controller';

const router = express.Router();

router.get('/', WarrantyController.getAllWarranty);

router.get('/:id', WarrantyController.getSingleWarranty);
router.post('/', WarrantyController.createWarranty);

router.patch('/:id', WarrantyController.updateWarranty);

router.delete('/:id', WarrantyController.deleteWarranty);

export const warrantyRoutes = router;
