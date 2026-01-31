import express from 'express';
import { ReportController } from './report.controller';

const router = express.Router();
router.get('/', ReportController.getReport);
export const reportRoutes = router;
