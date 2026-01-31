import express from 'express';
import { metaController } from './meta.controller';

const router = express.Router();

router.get('/allcustomer', metaController.getAllCustomer);
router.get('/', metaController.getAllMetaFromDB);
router.get('/accounting-summary', metaController.calculateAccountingSummary);

export const metaroute = router;
