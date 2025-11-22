import express from 'express';
import { reportControllers } from './report.controller';

const router = express.Router();

router.get('/income/monthly', reportControllers.getMonthlyIncomeReport);
router.get('/income/yearly', reportControllers.getYearlyIncomeReport);
router.get('/income/total', reportControllers.getTotalIncomeReport);

export const reportRoutes = router;
