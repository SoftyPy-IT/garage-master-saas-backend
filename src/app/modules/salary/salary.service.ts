/* eslint-disable @typescript-eslint/no-explicit-any */
import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import type {
  TSalary,
  TSalaryFilters,
  TPartialPayment,
  TPaymentHistory,
} from './salary.interface';
import mongoose from 'mongoose';
import { getMonthName } from './salary.const';
import { getTenantModel } from '../../utils/getTenantModels';

const allMonths = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const createSalaryIntoDB = async (tenantDomain: string, payload: TSalary[]) => {
  // Get tenant-specific models and DB connection
  const { Model: Employee, connection } = await getTenantModel(
    tenantDomain,
    'Employee',
  );
  const { Model: Salary } = await getTenantModel(tenantDomain, 'Salary');

  // Start a session on the tenant-specific connection
  const session = await connection.startSession();
  session.startTransaction();

  try {
    // Extract unique employee IDs from the payload
    const employeeIds = [...new Set(payload.map((entry) => entry.employee))];

    // Fetch employees
    const employees = await Employee.find({ _id: { $in: employeeIds } })
      .session(session)
      .lean();

    // Fetch existing salaries to check duplicates
    const existingSalaries = await Salary.find({
      employee: { $in: employeeIds },
      month_of_salary: { $in: payload.map((d) => d.month_of_salary) },
      year_of_salary: {
        $in: payload.map(
          (d) => d.year_of_salary || new Date().getFullYear().toString(),
        ),
      },
    })
      .session(session)
      .lean();

    // Create lookup maps
    const employeeMap = new Map(
      employees.map((e) => [
        (e as { _id: mongoose.Types.ObjectId })._id.toString(),
        e,
      ]),
    );
    const salaryMap = new Map(
      existingSalaries.map((s) => [
        `${s.employee}-${s.month_of_salary}-${s.year_of_salary}`,
        s,
      ]),
    );

    // Prepare salary documents
    const salaryPromises = payload.map(async (data) => {
      const existingEmployee = employeeMap.get(data.employee.toString());

      if (!existingEmployee) {
        throw new AppError(
          StatusCodes.NOT_FOUND,
          `Employee with ID ${data.employee} not found.`,
        );
      }

      const year = data.year_of_salary || new Date().getFullYear().toString();
      const salaryKey = `${data.employee}-${data.month_of_salary}-${year}`;

      if (salaryMap.has(salaryKey)) {
        throw new AppError(
          StatusCodes.CONFLICT,
          `Salary already exists for ${existingEmployee.full_name} in ${data.month_of_salary} ${year}.`,
        );
      }

      // Payment history
      const paymentHistory: TPaymentHistory[] = [];
      if (data.advance && data.advance > 0) {
        paymentHistory.push({
          amount: data.advance,
          date: new Date(),
          note: 'Advance payment',
          payment_method: 'cash',
        });
      }

      if (data.pay && data.pay > 0) {
        paymentHistory.push({
          amount: data.pay,
          date: new Date(),
          note: 'Initial payment',
          payment_method: 'cash',
        });
      }

      const salary = new Salary({
        ...data,
        employee: existingEmployee._id,
        employeeId: existingEmployee.employeeId,
        full_name: existingEmployee.full_name,
        year_of_salary: year,
        payment_history: paymentHistory,
      });

      await salary.save({ session });

      // Link salary to employee
      await Employee.findByIdAndUpdate(
        existingEmployee._id,
        { $push: { salary: salary._id } },
        { new: true, runValidators: true, session },
      );

      return salary;
    });

    const createdSalaries = await Promise.all(salaryPromises);

    await session.commitTransaction();
    session.endSession();
    return createdSalaries;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Error creating salary records:', error);
    throw error;
  }
};

const addPartialPayment = async (
  tenantDomain: string,
  paymentData: TPartialPayment,
) => {
  // Get tenant-specific Salary model and DB connection
  const { Model: Salary, connection } = await getTenantModel(
    tenantDomain,
    'Salary',
  );

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const salary = await Salary.findById(paymentData.salaryId).session(session);

    if (!salary) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Salary record not found.');
    }

    if (salary.payment_status === 'completed') {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        'Salary is already fully paid.',
      );
    }

    if (paymentData.amount <= 0) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        'Payment amount must be greater than 0.',
      );
    }

    const currentDueAmount = salary.due_amount || 0;
    if (paymentData.amount > currentDueAmount) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        `Payment amount (${paymentData.amount}) cannot exceed due amount (${currentDueAmount}).`,
      );
    }

    // Add payment to history
    salary.payment_history = salary.payment_history || [];
    salary.payment_history.push({
      amount: paymentData.amount,
      date: new Date(),
      note: paymentData.note || 'Partial payment',
      payment_method: paymentData.payment_method || 'cash',
      created_by: paymentData.created_by,
    });

    await salary.save({ session });

    await session.commitTransaction();
    session.endSession();
    return salary;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Error adding partial payment:', error);
    throw error;
  }
};

const deleteSalaryFromDB = async (tenantDomain: string, id: string) => {
  const { Model: Salary, connection } = await getTenantModel(
    tenantDomain,
    'Salary',
  );
  const { Model: Employee } = await getTenantModel(tenantDomain, 'Employee');

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const salary = await Salary.findById(id).session(session);

    if (!salary) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Salary record not found.');
    }

    // Remove salary reference from employee
    await Employee.findByIdAndUpdate(
      salary.employee,
      { $pull: { salary: salary._id } },
      { session },
    );

    // Delete the salary record
    const result = await Salary.deleteOne({ _id: id }).session(session);

    await session.commitTransaction();
    session.endSession();
    return result;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Error deleting salary:', error);
    throw error;
  }
};

const getSalariesForCurrentMonth = async (
  tenantDomain: string,
  searchTerm?: string,
) => {
  const { Model: Salary } = await getTenantModel(tenantDomain, 'Salary');

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentMonthName = getMonthName(currentMonth);

  const query: any = {
    month_of_salary: searchTerm || currentMonthName,
  };

  const salaries = await Salary.find(query)
    .populate('employee', 'full_name employeeId')
    .populate('payment_history.created_by', 'name')
    .sort({ createdAt: -1 })
    .lean();

  if (!salaries.length) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      `No salary found for: ${searchTerm || currentMonthName}`,
    );
  }

  return {
    month: searchTerm || currentMonthName,
    salaries,
  };
};

export const getAllSalaries = async (
  tenantDomain: string,
  limit: number = 10,
  page: number = 1,
  searchTerm?: string,
  month?: string,
  year?: string,
  day?: number,
) => {
  const { Model: Salary } = await getTenantModel(tenantDomain, 'Salary');

  const matchStage: any = {};

  // ===== Month filter =====
  if (month && month.trim() !== '') {
    const monthTrim = month.trim();
    const numeric = Number(monthTrim);
    let monthName = monthTrim;

    if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 12) {
      monthName = allMonths[numeric - 1];
    } else {
      const idx = allMonths.findIndex(
        (m) => m.toLowerCase() === monthTrim.toLowerCase(),
      );
      if (idx !== -1) monthName = allMonths[idx];
    }

    matchStage.month_of_salary = monthName;
  }

  // ===== Year filter =====
  if (year && year.trim() !== '') {
    matchStage.year_of_salary = year.trim();
  }

  // ===== Day filter (payment_history.date or createdAt) =====
  if (typeof day === 'number' && !Number.isNaN(day)) {
    const yearVal = year ? Number(year) : new Date().getFullYear();
    const monthVal =
      month && allMonths.includes(matchStage.month_of_salary)
        ? allMonths.indexOf(matchStage.month_of_salary)
        : new Date().getMonth();

    const startDate = new Date(yearVal, monthVal, day, 0, 0, 0);
    const endDate = new Date(yearVal, monthVal, day + 1, 0, 0, 0);

    matchStage.$or = [
      { 'payment_history.date': { $gte: startDate, $lt: endDate } },
      { createdAt: { $gte: startDate, $lt: endDate } },
    ];
  }

  // ===== Search filter =====
  if (searchTerm && searchTerm.trim() !== '') {
    const term = searchTerm.trim();
    const searchConditions = [
      { month_of_salary: { $regex: term, $options: 'i' } },
      { full_name: { $regex: term, $options: 'i' } },
      { employeeId: { $regex: term, $options: 'i' } },
    ];

    if (matchStage.$or) {
      matchStage.$and = [{ $or: matchStage.$or }, { $or: searchConditions }];
      delete matchStage.$or;
    } else {
      matchStage.$or = searchConditions;
    }
  }

  // ===== Aggregation pipeline =====
  const pipeline: any[] = [
    ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
    {
      $lookup: {
        from: 'employees',
        localField: 'employee',
        foreignField: '_id',
        as: 'employee',
      },
    },
    { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'users',
        localField: 'payment_history.created_by',
        foreignField: '_id',
        as: 'payment_user_docs',
      },
    },
    {
      $addFields: {
        payment_history: {
          $map: {
            input: { $ifNull: ['$payment_history', []] },
            as: 'ph',
            in: {
              $mergeObjects: [
                '$$ph',
                {
                  created_by: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$payment_user_docs',
                          as: 'user',
                          cond: { $eq: ['$$user._id', '$$ph.created_by'] },
                        },
                      },
                      0,
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },
    { $unset: 'payment_user_docs' },
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
  ];

  const salaries = await Salary.aggregate(pipeline);

  // ===== Total count for pagination =====
  const countPipeline = [
    ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
    { $count: 'totalCount' },
  ];

  const totalDataAggregation = await Salary.aggregate(countPipeline);
  const totalData =
    totalDataAggregation.length > 0 ? totalDataAggregation[0].totalCount : 0;

  return {
    salaries,
    meta: {
      totalData,
      totalPages: Math.ceil(totalData / limit),
      currentPage: page,
    },
  };
};

const getSalariesWithPaymentStatus = async (
  tenantDomain: string,
  filters: TSalaryFilters = {},
) => {
  const {
    page = 1,
    limit = 10,
    month,
    year,
    payment_status,
    searchTerm,
  } = filters;

  const { Model: Salary } = await getTenantModel(tenantDomain, 'Salary');

  const query: any = {};

  if (month) query.month_of_salary = month;
  if (year) query.year_of_salary = year;
  if (payment_status) query.payment_status = payment_status;
  if (searchTerm) {
    query.$or = [
      { full_name: { $regex: searchTerm, $options: 'i' } },
      { employeeId: { $regex: searchTerm, $options: 'i' } },
      { month_of_salary: { $regex: searchTerm, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;

  const salaries = await Salary.find(query)
    .populate('employee', 'full_name employeeId')
    .populate('payment_history.created_by', 'name')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Salary.countDocuments(query);

  return {
    salaries,
    pagination: {
      current_page: page,
      total_pages: Math.ceil(total / limit),
      total_records: total,
      has_next: page < Math.ceil(total / limit),
      has_prev: page > 1,
    },
  };
};

const getSalaryPaymentHistory = async (
  tenantDomain: string,
  salaryId: string,
) => {
  const { Model: Salary } = await getTenantModel(tenantDomain, 'Salary');

  const salary = await Salary.findById(salaryId)
    .populate('employee', 'full_name employeeId')
    .populate('payment_history.created_by', 'name')
    .lean();

  if (!salary) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Salary record not found.');
  }

  return salary;
};
const getSalaryStatistics = async (
  tenantDomain: string,
  month?: string,
  year?: string,
) => {
  const { Model: Salary } = await getTenantModel(tenantDomain, 'Salary');

  const currentDate = new Date();
  const currentMonth = month || getMonthName(currentDate.getMonth() + 1);
  const currentYear = year || currentDate.getFullYear().toString();

  const matchQuery: any = {
    month_of_salary: currentMonth,
    year_of_salary: currentYear,
  };

  const stats = await Salary.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalSalaries: { $sum: 1 },
        totalAmount: { $sum: '$total_payment' },
        totalPaidAmount: { $sum: '$paid_amount' },
        totalDueAmount: { $sum: '$due_amount' },
        completedPayments: {
          $sum: { $cond: [{ $eq: ['$payment_status', 'completed'] }, 1, 0] },
        },
        partialPayments: {
          $sum: { $cond: [{ $eq: ['$payment_status', 'partial'] }, 1, 0] },
        },
        pendingPayments: {
          $sum: { $cond: [{ $eq: ['$payment_status', 'pending'] }, 1, 0] },
        },
      },
    },
  ]);

  const result = stats[0] || {
    totalSalaries: 0,
    totalAmount: 0,
    totalPaidAmount: 0,
    totalDueAmount: 0,
    completedPayments: 0,
    partialPayments: 0,
    pendingPayments: 0,
  };

  return {
    ...result,
    paymentCompletionRate:
      result.totalSalaries > 0
        ? (result.completedPayments / result.totalSalaries) * 100
        : 0,
    month: currentMonth,
    year: currentYear,
  };
};

const recalculateAllSalaries = async (tenantDomain: string) => {
  const { Model: Salary, connection } = await getTenantModel(
    tenantDomain,
    'Salary',
  );

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const salaries = await Salary.find({}).session(session);

    let updatedCount = 0;
    for (const salary of salaries) {
      const oldDueAmount = salary.due_amount;
      salary.recalculatePayments();

      if (oldDueAmount !== salary.due_amount) {
        await salary.save({ session });
        updatedCount++;
      }
    }

    await session.commitTransaction();
    session.endSession();

    return { total: salaries.length, updated: updatedCount };
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Error recalculating salaries:', error);
    throw error;
  }
};

const calculateTotalPaymentManually = (
  tenantDomain: string,
  salaryData: any,
): number => {
  const bonus = Number(salaryData.bonus) || 0;
  const overtimeAmount = Number(salaryData.overtime_amount) || 0;
  const salaryAmount = Number(salaryData.salary_amount) || 0;
  const previousDue = Number(salaryData.previous_due) || 0;
  const cutSalary = Number(salaryData.cut_salary) || 0;

  return Math.max(
    0,
    bonus + overtimeAmount + salaryAmount + previousDue - cutSalary,
  );
};

export const getSingleSalary = async (
  tenantDomain: string,
  employeeId?: string,
  month?: string,
  year?: string,
  day?: number,
) => {
  const { Model: Salary } = await getTenantModel(tenantDomain, 'Salary');

  const matchQuery: any = {};

  if (employeeId) {
    matchQuery.employee = new mongoose.Types.ObjectId(employeeId);
  }

  // ===== Month filter =====
  if (month && month.trim() !== '') {
    const monthTrim = month.trim();
    const numeric = Number(monthTrim);
    let monthName = monthTrim;

    if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 12) {
      monthName = allMonths[numeric - 1];
    } else {
      const idx = allMonths.findIndex(
        (m) => m.toLowerCase() === monthTrim.toLowerCase(),
      );
      if (idx !== -1) monthName = allMonths[idx];
    }

    matchQuery.month_of_salary = monthName;
  }

  // ===== Year filter =====
  if (year && year.trim() !== '') {
    matchQuery.year_of_salary = year.trim();
  }

  // ===== Day filter (payment_history.date or createdAt) =====
  if (typeof day === 'number' && !Number.isNaN(day)) {
    const yearVal = year ? Number(year) : new Date().getFullYear();
    const monthVal =
      month && allMonths.includes(matchQuery.month_of_salary)
        ? allMonths.indexOf(matchQuery.month_of_salary)
        : new Date().getMonth();

    const startDate = new Date(yearVal, monthVal, day, 0, 0, 0);
    const endDate = new Date(yearVal, monthVal, day + 1, 0, 0, 0);

    matchQuery.$or = [
      { 'payment_history.date': { $gte: startDate, $lt: endDate } },
      { createdAt: { $gte: startDate, $lt: endDate } },
    ];
  }

  // ===== Aggregation pipeline =====
  const salaries = await Salary.aggregate([
    { $match: matchQuery },
    {
      $lookup: {
        from: 'employees',
        localField: 'employee',
        foreignField: '_id',
        as: 'employee',
      },
    },
    { $unwind: '$employee' },
    {
      $lookup: {
        from: 'users',
        localField: 'payment_history.created_by',
        foreignField: '_id',
        as: 'payment_user_docs',
      },
    },
    {
      $addFields: {
        payment_history: {
          $map: {
            input: { $ifNull: ['$payment_history', []] },
            as: 'ph',
            in: {
              $mergeObjects: [
                '$$ph',
                {
                  created_by: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$payment_user_docs',
                          as: 'user',
                          cond: { $eq: ['$$user._id', '$$ph.created_by'] },
                        },
                      },
                      0,
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },
    { $unset: 'payment_user_docs' },
    { $sort: { createdAt: -1 } },
  ]);

  return { salaries };
};

export const getSalariesByMonth = async (
  tenantDomain: string,
  month: string,
) => {
  const { Model: Salary } = await getTenantModel(tenantDomain, 'Salary');

  const matchQuery: any = {};

  // ===== Month filter =====
  if (month && month.trim() !== '') {
    const monthTrim = month.trim();
    const numeric = Number(monthTrim);
    let monthName = monthTrim;

    if (!Number.isNaN(numeric) && numeric >= 1 && numeric <= 12) {
      monthName = allMonths[numeric - 1];
    } else {
      const idx = allMonths.findIndex(
        (m) => m.toLowerCase() === monthTrim.toLowerCase(),
      );
      if (idx !== -1) monthName = allMonths[idx];
    }

    matchQuery.month_of_salary = monthName;
  }

  // ===== Aggregation pipeline =====
  const salaries = await Salary.aggregate([
    { $match: matchQuery },
    {
      $lookup: {
        from: 'employees',
        localField: 'employee',
        foreignField: '_id',
        as: 'employee',
      },
    },
    { $unwind: '$employee' },
    {
      $lookup: {
        from: 'users',
        localField: 'payment_history.created_by',
        foreignField: '_id',
        as: 'payment_user_docs',
      },
    },
    {
      $addFields: {
        payment_history: {
          $map: {
            input: { $ifNull: ['$payment_history', []] },
            as: 'ph',
            in: {
              $mergeObjects: [
                '$$ph',
                {
                  created_by: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: '$payment_user_docs',
                          as: 'user',
                          cond: { $eq: ['$$user._id', '$$ph.created_by'] },
                        },
                      },
                      0,
                    ],
                  },
                },
              ],
            },
          },
        },
      },
    },
    { $unset: 'payment_user_docs' },
    { $sort: { createdAt: -1 } }, // keep sorting if needed
    // { $limit: 1 }, // ❌ REMOVE THIS TO RETURN ALL
  ]);

  return salaries; // returns array of salaries
};

const updateSalaryIntoDB = async (
  tenantDomain: string,
  id: string,
  payload: Partial<TSalary>,
) => {
  const { Model: Salary, connection } = await getTenantModel(
    tenantDomain,
    'Salary',
  );

  const session = await connection.startSession();
  session.startTransaction();

  try {
    // Fetch the existing salary record with payment_history
    const existingSalary = await Salary.findById(id).session(session);

    if (!existingSalary) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Salary record not found.');
    }

    // Fields that should not be overwritten directly
    const excludedFields = [
      'payment_history',
      'paid_amount',
      'due_amount',
      'payment_status',
      '_id',
      'createdAt',
      'updatedAt',
      '__v',
    ];

    // Apply updates only to allowed fields
    Object.keys(payload).forEach((key) => {
      if (!excludedFields.includes(key)) {
        (existingSalary as any)[key] = (payload as any)[key];
      }
    });

    // Handle payment updates by adding to payment_history
    if (payload.advance !== undefined || payload.pay !== undefined) {
      const currentAdvance = Number(payload.advance) || 0;
      const currentPay = Number(payload.pay) || 0;

      // Calculate the difference from existing values
      const advanceDiff = currentAdvance - existingSalary.advance;
      const payDiff = currentPay - existingSalary.pay;

      // Update payment history with new payments
      if (advanceDiff > 0) {
        existingSalary.payment_history.push({
          amount: advanceDiff,
          date: new Date(),
          note: 'Additional advance payment',
          payment_method: 'cash',
        });
      }

      if (payDiff > 0) {
        existingSalary.payment_history.push({
          amount: payDiff,
          date: new Date(),
          note: 'Additional salary payment',
          payment_method: 'cash',
        });
      }

      // Update the legacy fields
      existingSalary.advance = currentAdvance;
      existingSalary.pay = currentPay;
    }

    existingSalary.recalculatePayments();

    await existingSalary.save({ session });

    await session.commitTransaction();
    session.endSession();

    return existingSalary;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Error updating salary:', error);
    throw error;
  }
};

export const SalaryServices = {
  createSalaryIntoDB,
  getSalariesForCurrentMonth,
  getSingleSalary,
  updateSalaryIntoDB,
  deleteSalaryFromDB,
  getAllSalaries,
  addPartialPayment,
  getSalariesWithPaymentStatus,
  getSalaryPaymentHistory,
  getSalaryStatistics,
  recalculateAllSalaries,
  calculateTotalPaymentManually,
  getSalariesByMonth,
};
