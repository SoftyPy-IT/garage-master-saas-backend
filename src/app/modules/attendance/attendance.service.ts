import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import { TAttendance } from './attendance.interface';
import { getTenantModel } from '../../utils/getTenantModels';

export const createAttendanceIntoDB = async (
  tenantDomain: string,
  payload: TAttendance[],
) => {
  // Get Employee model and connection from tenant model getter
  const { Model: Employee, connection } = await getTenantModel(
    tenantDomain,
    'Employee',
  );
  const { Model: Attendance } = await getTenantModel(
    tenantDomain,
    'Attendance',
  );

  // Start session from tenant-specific connection
  const session = await connection.startSession();
  session.startTransaction();

  try {
    const attendanceIds = payload.map((entry) => entry.employee);

    for (const id of attendanceIds) {
      const data = payload.find((d) => d.employee === id);
      if (!data) continue;

      // Use session on all queries
      const existingEmployee = await Employee.findById(id).session(session);
      if (!existingEmployee) continue;

      const checkTodaysAttendance = await Attendance.findOneAndUpdate(
        { employee: id, date: data.date },
        { $set: data },
        { session, new: true, runValidators: true },
      );

      if (!checkTodaysAttendance) {
        const attendance = new Attendance({
          ...data,
          employee: existingEmployee._id,
        });

        await attendance.save({ session });

        await Employee.findByIdAndUpdate(
          existingEmployee._id,
          { $push: { attendance: attendance._id } },
          { new: true, runValidators: true, session },
        );
      }
    }

    await session.commitTransaction();
    session.endSession();
    return null;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

export const getTodayAttendanceFromDB = async (tenantDomain: string) => {
  const { Model: Attendance } = await getTenantModel(
    tenantDomain,
    'Attendance',
  );

  const parsedDate = new Date();
  const day = parsedDate.getDate().toString().padStart(2, '0');
  const month = (parsedDate.getMonth() + 1).toString().padStart(2, '0');
  const year = parsedDate.getFullYear();
  const formattedDate = `${day}-${month}-${year}`;

  const todayAttendance = await Attendance.find({ date: formattedDate });

  if (!todayAttendance.length) {
    throw new AppError(StatusCodes.NOT_FOUND, "No today's attendance found");
  }

  const presentEntries = todayAttendance.filter(
    (attendance) => attendance.present,
  ).length;
  const absentEntries = todayAttendance.filter(
    (attendance) => attendance.absent,
  ).length;
  const lateEntries = todayAttendance.filter(
    (attendance) => attendance.late_status,
  ).length;

  const presentPercentage = (
    (presentEntries / todayAttendance.length) *
    100
  ).toFixed(2);
  const absentPercentage = (
    (absentEntries / todayAttendance.length) *
    100
  ).toFixed(2);
  const latePercentage = ((lateEntries / todayAttendance.length) * 100).toFixed(
    2,
  );

  const finalPresentPercentage = presentPercentage.endsWith('.00')
    ? parseInt(presentPercentage)
    : presentPercentage;
  const finalAbsentPercentage = absentPercentage.endsWith('.00')
    ? parseInt(absentPercentage)
    : absentPercentage;
  const finalLatePercentage = latePercentage.endsWith('.00')
    ? parseInt(latePercentage)
    : latePercentage;

  return {
    presentPercentage: finalPresentPercentage,
    presentEntries,
    absentPercentage: finalAbsentPercentage,
    absentEntries,
    latePercentage: finalLatePercentage,
    lateEntries,
    date: formattedDate,
  };
};
export const getAllAttendanceByCurrentMonth = async (
  tenantDomain: string,
  limit: number,
  page: number,
  searchTerm: string,
) => {
  const { Model: Attendance } = await getTenantModel(
    tenantDomain,
    'Attendance',
  );

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const formattedMonth = currentMonth.toString().padStart(2, '0');
  const formattedYear = currentYear.toString();

  const datePattern = new RegExp(`^\\d{2}-${formattedMonth}-${formattedYear}$`);

  const query: Record<string, any> = {
    date: datePattern,
  };

  if (searchTerm) {
    query.$or = [
      { date: new RegExp(searchTerm, 'i') },
      { full_name: new RegExp(searchTerm, 'i') },
    ];
  }

  const distinctDates = await Attendance.distinct('date', query);

  const currentMonthDates = distinctDates.filter((date) => {
    const [, month, year] = date.split('-');
    return (
      parseInt(month, 10) === currentMonth && parseInt(year, 10) === currentYear
    );
  });

  const attendanceResults = [];

  for (const date of currentMonthDates) {
    const todayAttendance = await Attendance.find({ date });

    const presentEntries = todayAttendance.filter((a) => a.present).length;
    const presentPercentage = Number(
      (presentEntries / todayAttendance.length) * 100,
    ).toFixed(2);

    const absentEntries = todayAttendance.filter((a) => a.absent).length;
    const absentPercentage = Number(
      (absentEntries / todayAttendance.length) * 100,
    ).toFixed(2);

    const lateEntries = todayAttendance.filter((a) => a.late_status).length;
    const latePercentage = Number(
      (lateEntries / todayAttendance.length) * 100,
    ).toFixed(2);

    if (!todayAttendance.length) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `No attendance found for date: ${date}`,
      );
    }

    attendanceResults.push({
      date,
      presentPercentage: presentPercentage.endsWith('.00')
        ? parseInt(presentPercentage)
        : presentPercentage,
      presentEntries,
      absentPercentage: absentPercentage.endsWith('.00')
        ? parseInt(absentPercentage)
        : absentPercentage,
      absentEntries,
      latePercentage: latePercentage.endsWith('.00')
        ? parseInt(latePercentage)
        : latePercentage,
      lateEntries,
    });
  }

  const startIndex = (page - 1) * limit;
  const paginatedResults = attendanceResults.slice(
    startIndex,
    startIndex + limit,
  );

  return {
    totalPages: Math.ceil(attendanceResults.length / limit),
    currentPage: page,
    totalRecords: attendanceResults.length,
    records: paginatedResults,
  };
};

export const getSingleAttendance = async (
  tenantDomain: string,
  employee: string,
) => {
  const { Model: Attendance } = await getTenantModel(
    tenantDomain,
    'Attendance',
  );

  const singleAttendance = await Attendance.find({ employee });

  if (!singleAttendance || singleAttendance.length === 0) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No attendance found');
  }

  return singleAttendance;
};

export const getSingleDateAttendance = async (
  tenantDomain: string,
  date: string,
) => {
  const { Model: Attendance } = await getTenantModel(
    tenantDomain,
    'Attendance',
  );

  const singleAttendance = await Attendance.find({ date });

  if (!singleAttendance || singleAttendance.length === 0) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No attendance found');
  }

  return singleAttendance;
};

export const deleteAttendanceFromDB = async (
  tenantDomain: string,
  attendanceId: string,
) => {
  const { Model: Attendance } = await getTenantModel(
    tenantDomain,
    'Attendance',
  );
  const { Model: Employee } = await getTenantModel(tenantDomain, 'Employee');

  const existingAttendance = await Attendance.findById(attendanceId);

  if (!existingAttendance) {
    return null;
  }

  const deleted = await Attendance.findByIdAndDelete(attendanceId);

  if (deleted) {
    const existingEmployee = await Employee.findById(deleted.employee);

    if (existingEmployee) {
      await Employee.findByIdAndUpdate(
        existingEmployee._id,
        { $pull: { attendance: attendanceId } },
        { new: true, runValidators: true },
      );
    }
  }

  return deleted;
};

export const getAllAttendance = async (
  tenantDomain: string,
  limit: number,
  page: number,
  searchTerm?: string,
  startDate?: string,
  endDate?: string,
  month?: string,
  year?: string,
  status?: string
) => {
  const { Model: Attendance } = await getTenantModel(tenantDomain, 'Attendance');
  const { Model: Employee } = await getTenantModel(tenantDomain, 'Employee');

  const aggregationPipeline: any[] = [];

  // Lookup employee
  aggregationPipeline.push({
    $lookup: {
      from: Employee.collection.name,
      localField: 'employee',
      foreignField: '_id',
      as: 'employee',
    },
  });

  aggregationPipeline.push({ $unwind: '$employee' });

  // Convert date field safely and normalize to ignore time
  aggregationPipeline.push({
    $addFields: {
      dateObj: {
        $cond: [
          { $eq: [{ $type: '$date' }, 'string'] },
          {
            $dateFromString: {
              dateString: '$date',
              timezone: 'UTC',
            },
          },
          '$date',
        ],
      },
    },
  });

  // Normalize date to remove time (keep only year, month, day)
  aggregationPipeline.push({
    $addFields: {
      dateNormalized: {
        $dateFromParts: {
          year: { $year: '$dateObj' },
          month: { $month: '$dateObj' },
          day: { $dayOfMonth: '$dateObj' },
        },
      },
    },
  });

  const matchStage: any = {};

  // Date filters (normalized)
  if (startDate && endDate) {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);
    matchStage.dateNormalized = { $gte: start, $lte: end };
  } else if (month) {
    const [y, m] = month.split('-');
    const start = new Date(Number(y), Number(m) - 1, 1, 0, 0, 0, 0);
    const end = new Date(Number(y), Number(m), 0, 23, 59, 59, 999);
    matchStage.dateNormalized = { $gte: start, $lte: end };
  } else if (year) {
    const start = new Date(Number(year), 0, 1, 0, 0, 0, 0);
    const end = new Date(Number(year), 11, 31, 23, 59, 59, 999);
    matchStage.dateNormalized = { $gte: start, $lte: end };
  }

  // Status filter
  if (status && status !== '') {
    if (status === 'present') matchStage.present = true;
    if (status === 'absent') matchStage.absent = true;
    if (status === 'late') matchStage.late_status = true;
  }

  // Search filter
  if (searchTerm && searchTerm.trim() !== '') {
    matchStage.$or = [
      { 'employee.full_name': new RegExp(searchTerm, 'i') },
      { 'employee.employeeId': new RegExp(searchTerm, 'i') },
    ];
  }

  // Apply match stage
  if (Object.keys(matchStage).length > 0) {
    aggregationPipeline.push({ $match: matchStage });
  }

  // Sort by normalized date descending
  aggregationPipeline.push({ $sort: { dateNormalized: -1 } });

  // Pagination
  aggregationPipeline.push({
    $facet: {
      metadata: [{ $count: 'totalRecords' }],
      data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
    },
  });

  const result = await Attendance.aggregate(aggregationPipeline);

  const totalRecords = result[0]?.metadata[0]?.totalRecords || 0;
  const attendances = result[0]?.data || [];

  return {
    totalRecords,
    totalPages: Math.ceil(totalRecords / limit),
    currentPage: page,
    attendances,
  };
};



export const AttendanceServices = {
  createAttendanceIntoDB,
  getTodayAttendanceFromDB,
  getAllAttendanceByCurrentMonth,
  getSingleDateAttendance,
  deleteAttendanceFromDB,
  getSingleAttendance,
  getAllAttendance,
};
