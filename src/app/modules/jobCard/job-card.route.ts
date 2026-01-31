import express from 'express';
import { jobCardController } from './job-card.controller';

const router = express.Router();

router
  .route('/')
  .get(jobCardController.getAllJobCards)
  .post(jobCardController.createJobCard);
router
  .route('/getWithJobNo')
  .get(jobCardController.getSingleJobCardDetailsWithJobNo);

router
  .route('/:id')
  .get(jobCardController.getSingleJobCardDetails)
  .put(jobCardController.updateJobCardDetails)
  .delete(jobCardController.deleteJobCard);
router
  .route('/recycle-bin/:id')
  .delete(jobCardController.movetoRecyclebinJobCard);
router
  .route('/recycle-bin/restore/:id')
  .delete(jobCardController.restorfromRecyclebinJobCard);
router
  .route('/recycle-bin/delete-permanantly/:id')
  .delete(jobCardController.permanantlyDeleteJobcard);

router.get('/jobcard/:jobcardId', jobCardController.generateJobCardPdf);

router.get('/:id/:userType', jobCardController.getUserDetailsForJobCard);

export const JobCardRoutes = router;
