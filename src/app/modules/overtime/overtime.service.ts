import { Types } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import { IEmployeeOvertime } from './overtime.interface';
import { calculateOvertimeDetails } from './overtime.utils';
import { getTenantModel } from '../../utils/getTenantModels';
import AppError from '../../errors/AppError';
import httpStatus from 'http-status';

const createEmployeeOvertime = async (
  tenantDomain: string,
  payload: IEmployeeOvertime,
) => {
  const { Model: Employee } = await getTenantModel(tenantDomain, 'Employee');
  const { Model: EmployeeOvertime } = await getTenantModel(
    tenantDomain,
    'EmployeeOvertime',
  );

  try {
    const employee = await Employee.findById(payload.employee);
    if (!employee) {
      throw new AppError(httpStatus.NOT_FOUND, 'Employee not found');
    }

    const { totalHours, estimatedPay } = calculateOvertimeDetails(
      payload.entries,
    );
    payload.totalHours = totalHours;
    payload.estimatedPay = estimatedPay;

    const newEmployeeOvertime = await EmployeeOvertime.create(payload);

    return newEmployeeOvertime;
  } catch (error: any) {
    console.error('Error creating employee overtime:', error.message);
    throw new Error(
      error.message ||
        'An unexpected error occurred while creating the employee overtime',
    );
  }
};

const getAllEmployeeOvertimes = async (
  tenantDomain: string,
  query: Record<string, unknown>,
) => {
  const { Model: EmployeeOvertime, connection } = await getTenantModel(
    tenantDomain,
    'EmployeeOvertime',
  );

  const { Model: Employee } = await getTenantModel(
    tenantDomain,
    'Employee',
  );

  const overtimeQuery = new QueryBuilder(EmployeeOvertime.find(), query)
    .search(['employee', 'entries', 'totalHours'])
    // .filter()
    // .sort()
    .paginate()
    .fields();

  overtimeQuery.modelQuery.populate({
    path: 'employee',
    model: Employee, // ✅ explicitly pass the tenant-specific Employee model
    select: 'full_name',
  });

  const meta = await overtimeQuery.countTotal();
  const employeeOvertimes = await overtimeQuery.modelQuery;

  return {
    meta,
    employeeOvertimes,
  };
};


const getSingleEmployeeOvertime = async (
  tenantDomain: string,
  overtimeId: string,
) => {
  if (!Types.ObjectId.isValid(overtimeId)) {
    throw new Error('Invalid overtimeId format');
  }

  const { Model: EmployeeOvertime } = await getTenantModel(
    tenantDomain,
    'EmployeeOvertime',
  );

  const result = await EmployeeOvertime.findById(overtimeId).populate(
    'employee',
    'full_name',
  );

  if (!result) {
    throw new Error('Employee overtime not found');
  }

  return result;
};

const updateEmployeeOvertime = async (
  tenantDomain: string,
  overtimeId: string,
  payload: Partial<IEmployeeOvertime>,
) => {
  const { Model: EmployeeOvertime } = await getTenantModel(
    tenantDomain,
    'EmployeeOvertime',
  );

  try {
    if (!Types.ObjectId.isValid(overtimeId)) {
      throw new Error('Invalid overtimeId format');
    }

    const overtimeExists = await EmployeeOvertime.findById(overtimeId);
    if (!overtimeExists) {
      throw new Error('Employee overtime not found');
    }

    const updatedOvertime = await EmployeeOvertime.findByIdAndUpdate(
      overtimeId,
      payload,
      {
        new: true,
        runValidators: true,
      },
    );

    return updatedOvertime;
  } catch (error: any) {
    console.error('Error updating employee overtime:', error.message);
    throw new Error(
      error.message ||
        'An unexpected error occurred while updating the employee overtime',
    );
  }
};

const deleteEmployeeOvertime = async (
  tenantDomain: string,
  overtimeId: string,
) => {
  const { Model: EmployeeOvertime } = await getTenantModel(
    tenantDomain,
    'EmployeeOvertime',
  );

  try {
    if (!Types.ObjectId.isValid(overtimeId)) {
      throw new Error('Invalid overtimeId format');
    }

    const overtimeExists = await EmployeeOvertime.findById(overtimeId);
    if (!overtimeExists) {
      throw new Error('Employee overtime not found');
    }

    const result = await EmployeeOvertime.deleteOne({ _id: overtimeId });

    return result;
  } catch (error: any) {
    console.error('Error deleting employee overtime:', error.message);
    throw new Error(
      error.message ||
        'An unexpected error occurred while deleting the employee overtime',
    );
  }
};

export const employeeOvertimeServices = {
  createEmployeeOvertime,
  getAllEmployeeOvertimes,
  getSingleEmployeeOvertime,
  updateEmployeeOvertime,
  deleteEmployeeOvertime,
};
