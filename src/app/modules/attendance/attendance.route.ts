import express from 'express';

import { attendanceController } from './attendance.controller';

const router = express.Router();

router
  .route('/')
  .post(attendanceController.createAttendance)
  .get(attendanceController.getAllAttendanceByCurrentMonth);

router.route('/remove').delete(attendanceController.deleteAttendance);

router.route('/today').get(attendanceController.getTodayAttendance);
router.route('/all').get(attendanceController.getAllAttendance);

router.route('/:date').get(attendanceController.getSingleDateAttendance);
router.route('/single/:id').get(attendanceController.getSingleAttendance);

export const AttendanceRoutes = router;
