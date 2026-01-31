import { StatusCodes } from 'http-status-codes';
import AppError from '../../errors/AppError';
import sanitizePayload from '../../middlewares/updateDataValidation';
import { SearchableFields } from './employee.const';
import { TEmployee } from './employee.interface';
import { generateEmployeeId } from './employee.utils';
import mongoose from 'mongoose';
import { getTenantModel } from '../../utils/getTenantModels';

const getAllEmployeesFromDB = async (
  tenantDomain: string,
  limit: number,
  page: number,
  searchTerm: string,
) => {
  const { Model: Employee } = await getTenantModel(tenantDomain, 'Employee');

  // Ensure limit and page have safe defaults
  limit = Number(limit) > 0 ? Number(limit) : 10;
  page = Number(page) > 0 ? Number(page) : 1;

  let searchQuery = {};

  if (searchTerm) {
    const escapedFilteringData = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const employeeSearchQuery = SearchableFields.map((field) => ({
      [field]: { $regex: escapedFilteringData, $options: 'i' },
    }));

    searchQuery = { $or: [...employeeSearchQuery] };
  }

  const employees = await Employee.aggregate([
    {
      $lookup: {
        from: 'attendances',
        localField: 'attendance',
        foreignField: '_id',
        as: 'attendance',
      },
    },
    {
      $lookup: {
        from: 'salaries',
        localField: 'salary',
        foreignField: '_id',
        as: 'salary',
      },
    },
    { $match: searchQuery },
    { $sort: { createdAt: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },

    // 🔹 Calculate employee-wise overtime summary
    {
      $addFields: {
        overtimeSummary: {
          $map: {
            input: {
              $setUnion: [
                {
                  $map: {
                    input: "$attendance",
                    as: "att",
                    in: {
                      year: { $year: { $toDate: "$$att.createdAt" } },
                      month: { $month: { $toDate: "$$att.createdAt" } },
                    },
                  },
                },
              ],
            },
            as: "ym",
            in: {
              year: "$$ym.year",
              month: "$$ym.month",
              totalOvertime: {
                $sum: {
                  $map: {
                    input: {
                      $filter: {
                        input: "$attendance",
                        as: "att2",
                        cond: {
                          $and: [
                            { $eq: [{ $year: { $toDate: "$$att2.createdAt" } }, "$$ym.year"] },
                            { $eq: [{ $month: { $toDate: "$$att2.createdAt" } }, "$$ym.month"] },
                          ],
                        },
                      },
                    },
                    as: "filteredAtt",
                    in: "$$filteredAtt.overtime",
                  },
                },
              },
            },
          },
        },
      },
    },
  ]);

  const totalData = await Employee.countDocuments(searchQuery);
  const totalPages = Math.ceil(totalData / limit);

  // 🔹 Convert month numbers → names in Node.js layer
  const monthNames = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const formattedEmployees = employees.map((emp) => ({
    ...emp,
    overtimeSummary: emp.overtimeSummary.map((o:any) => ({
      month: monthNames[o.month],
      year: o.year,
      totalOvertime: `${o.totalOvertime}`,
    })),
  }));

  return {
    employees: formattedEmployees,
    meta: { totalPages },
  };
};


const createEmployeeIntoDB = async (
  tenantDomain: string,
  payload: TEmployee,
) => {
  const { Model: Employee } = await getTenantModel(tenantDomain, 'Employee');
  const sanitizeData = sanitizePayload(payload);
  const employeeId = await generateEmployeeId();

  const employee = new Employee({
    ...sanitizeData,
    employeeId,
  });

  await employee.save();
  return null;
};

const getSingleEmployeeDetails = async (tenantDomain: string, id: string) => {
  await getTenantModel(tenantDomain, 'Attendance');
  await getTenantModel(tenantDomain, 'Salary');

  const { Model: Employee } = await getTenantModel(tenantDomain, 'Employee');

  const singleEmployee = await Employee.findById(id)
    .populate('attendance')
    .populate('salary');

  if (!singleEmployee) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No employee found');
  }

  return singleEmployee;
};

export const updateEmployeeIntoDB = async (
  tenantDomain: string,
  id: string,
  payload: TEmployee,
) => {
  const { Model: Employee } = await getTenantModel(tenantDomain, 'Employee');
  const sanitizeData = sanitizePayload(payload);

  const updateEmployee = await Employee.findByIdAndUpdate(
    id,
    { $set: sanitizeData },
    { new: true, runValidators: true },
  );

  if (!updateEmployee) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No employee found');
  }

  return updateEmployee;
};

export const deleteEmployee = async (tenantDomain: string, id: string) => {
  const { Model: Employee } = await getTenantModel(tenantDomain, 'Employee');

  const employee = await Employee.findByIdAndDelete(id);
  if (!employee) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No employee available');
  }

  return null;
};

export const permanentlyDeleteEmployee = async (
  tenantDomain: string,
  id: string,
) => {
  const { Model: Employee } = await getTenantModel(tenantDomain, 'Employee');
  const { Model: Attendance } = await getTenantModel(
    tenantDomain,
    'Attendance',
  );

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const existingEmployee = await Employee.findById(id).session(session);
    if (!existingEmployee) {
      throw new AppError(StatusCodes.NOT_FOUND, 'No employee exists.');
    }

    const attendanceResult = await Attendance.deleteMany(
      { Id: existingEmployee.employeeId },
      { session },
    );

    const employeeResult = await Employee.findByIdAndDelete(
      existingEmployee._id,
      { session },
    );

    if (!employeeResult || attendanceResult.deletedCount === 0) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        'No employee or attendance found to delete.',
      );
    }

    await session.commitTransaction();
    return employeeResult;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

export const moveToRecycledEmployee = async (
  tenantDomain: string,
  id: string,
) => {
  const { Model: Employee } = await getTenantModel(tenantDomain, 'Employee');

  const existingEmployee = await Employee.findById(id);
  if (!existingEmployee) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No employee exist.');
  }

  const customer = await Employee.findByIdAndUpdate(
    existingEmployee._id,
    { isRecycled: true, recycledAt: new Date() },
    { new: true, runValidators: true },
  );

  if (!customer) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No employee available');
  }

  return customer;
};

export const restoreFromRecycledEmployee = async (
  tenantDomain: string,
  id: string,
) => {
  const { Model: Employee } = await getTenantModel(tenantDomain, 'Employee');

  const recycledCustomer = await Employee.findById(id);
  if (!recycledCustomer) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No employee exist.');
  }

  const restoredCustomer = await Employee.findByIdAndUpdate(
    recycledCustomer._id,
    { isRecycled: false, recycledAt: null },
    { new: true, runValidators: true },
  );

  if (!restoredCustomer) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      'No employee available for restoration.',
    );
  }

  return restoredCustomer;
};

export const moveAllToRecycledBin = async (tenantDomain: string) => {
  const { Model: Employee } = await getTenantModel(tenantDomain, 'Employee');

  const result = await Employee.updateMany(
    {},
    {
      $set: {
        isRecycled: true,
        recycledAt: new Date(),
      },
    },
    { runValidators: true },
  );

  return result;
};

export const restoreAllFromRecycledBin = async (tenantDomain: string) => {
  const { Model: Employee } = await getTenantModel(tenantDomain, 'Employee');

  const result = await Employee.updateMany(
    { isRecycled: true },
    {
      $set: {
        isRecycled: false,
      },
      $unset: {
        recycledAt: '',
      },
    },
    { runValidators: true },
  );

  return result;
};
export const EmployeeServices = {
  createEmployeeIntoDB,
  getAllEmployeesFromDB,
  getSingleEmployeeDetails,
  updateEmployeeIntoDB,
  deleteEmployee,
  permanentlyDeleteEmployee,
  moveToRecycledEmployee,
  restoreFromRecycledEmployee,
  moveAllToRecycledBin,
  restoreAllFromRecycledBin,
};
