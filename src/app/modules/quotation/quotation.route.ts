import express from 'express';
import { quotationController } from './quotation.controller';

const router = express.Router();

router
  .route('/')
  .post(quotationController.createQuotation)
  .get(quotationController.getAllQuotations);
router
  .route('/quotation/dashboard')
  .get(quotationController.getAllQuotationsForDashboard);

router
  .route('/:id')
  .get(quotationController.getSingleQuotation)
  .put(quotationController.updateQuotation)
  .delete(quotationController.deleteQuotation);
router.get('/quotation/:quotationId', quotationController.generateQuotationPdf);

router
  .route('/remove-quotation')
  .patch(quotationController.removeQuotationFromUpdate);
router
  .route('/recycle/:id')
  .patch(quotationController.moveToRecyclebinQuotation);
router
  .route('/restore/:id')
  .patch(quotationController.restoreFromRecyclebinQuotation);
router
  .route('/delete-permanantly/:id')
  .delete(quotationController.permanantlyDeleteQuotation);

router.patch(
  '/recycle-all',
  quotationController.moveAllToRecycledBinMoneyReceipts,
);
router.patch(
  '/restore-all',
  quotationController.restoreAllFromRecycledBinMoneyReceipts,
);
export const QuotationRoutes = router;
