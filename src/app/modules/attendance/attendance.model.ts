import mongoose, { Schema } from 'mongoose';
import { TAttendance } from './attendance.interface';

export const attendanceSchema: Schema<TAttendance> = new Schema<TAttendance>(
  {
    employee: {
      type: Schema.ObjectId,
      required: [true, 'Employee is required.'],
      ref: 'Employee',
    },
    employeeId: {
      type: String,
    },
    full_name: {
      type: String,
    },
    date: {
      type: String,
    },
    designation: {
      type: String,
    },
    present: {
      type: Boolean,
    },
    absent: {
      type: Boolean,
    },
    office_time: {
      type: String,
    },
    in_time: {
      type: String,
    },
    out_time: {
      type: String,
    },
    overtime: {
      type: Number,
    },
    late_status: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export const Attendance = mongoose.model<TAttendance>(
  'Attendance',
  attendanceSchema,
);
