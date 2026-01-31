import { Types } from 'mongoose';
import QueryBuilder from '../../builder/QueryBuilder';
import { ILeaveRequest } from './leave.interface';
import { getTenantModel } from '../../utils/getTenantModels';

const createLeaveRequest = async (
  tenantDomain: string,
  payload: ILeaveRequest,
) => {
  try {
    const { Model: Employee } = await getTenantModel(tenantDomain, 'Employee');
    const { Model: LeaveRequest } = await getTenantModel(
      tenantDomain,
      'LeaveRequest',
    );

    const employeeExists = await Employee.findById(payload.employee);
    if (!employeeExists) {
      throw new Error('Employee not found');
    }

    const newLeaveRequest = await LeaveRequest.create(payload);
    return newLeaveRequest;
  } catch (error: any) {
    console.error('Error creating leave request:', error.message);
    throw new Error(
      error.message ||
        'An unexpected error occurred while creating the leave request',
    );
  }
};

const getAllLeaveRequests = async (
  tenantDomain: string,
  query: Record<string, unknown>,
) => {

  const { Model: LeaveRequest } = await getTenantModel(
    tenantDomain,
    'LeaveRequest',
  );
  await getTenantModel(tenantDomain, 'Employee');

  const leaveRequestQuery = new QueryBuilder(LeaveRequest.find(), query)
    .search(['status', 'leaveType'])
    .paginate()
    .fields();

  const meta = await leaveRequestQuery.countTotal();
  const leaveRequests = await leaveRequestQuery.modelQuery.populate('employee', 'full_name');

  return {
    meta,
    leaveRequests,
  };
};

const getSingleLeaveRequest = async (
  tenantDomain: string,
  leaveRequestId: string,
) => {
  const { Model: LeaveRequest } = await getTenantModel(
    tenantDomain,
    'LeaveRequest',
  );
  const result = await LeaveRequest.findById(leaveRequestId);

  return result;
};

const employeeLeaveRequest = async (
  tenantDomain: string,
  employeeId: string,
) => {
  const { Model: LeaveRequest } = await getTenantModel(
    tenantDomain,
    'LeaveRequest',
  );
  const result = await LeaveRequest.find({ employee: employeeId });
  return result;
};

const updateLeaveRequest = async (
  tenantDomain: string,
  leaveRequestId: string,
  payload: Partial<ILeaveRequest>,
) => {
  try {
    if (!Types.ObjectId.isValid(leaveRequestId)) {
      throw new Error('Invalid leaveRequestId format');
    }

    const { Model: LeaveRequest } = await getTenantModel(
      tenantDomain,
      'LeaveRequest',
    );
    const { Model: Employee } = await getTenantModel(tenantDomain, 'Employee');

    const leaveRequestExists = await LeaveRequest.findById(leaveRequestId);
    if (!leaveRequestExists) {
      throw new Error('Leave request not found');
    }

    if (payload.employee) {
      const employeeExists = await Employee.findById(payload.employee);
      if (!employeeExists) {
        throw new Error('Employee not found');
      }
    }

    const updatedLeaveRequest = await LeaveRequest.findByIdAndUpdate(
      leaveRequestId,
      payload,
      {
        new: true,
        runValidators: true,
      },
    );

    return updatedLeaveRequest;
  } catch (error: any) {
    console.error('Error updating leave request:', error.message);
    throw new Error(
      error.message ||
        'An unexpected error occurred while updating the leave request',
    );
  }
};

const deleteLeaveRequest = async (
  tenantDomain: string,
  leaveRequestId: string,
) => {
  try {
    // Validate ObjectId format
    if (!Types.ObjectId.isValid(leaveRequestId)) {
      throw new Error('Invalid leaveRequestId format');
    }

    // Get tenant-specific LeaveRequest model
    const { Model: LeaveRequest } = await getTenantModel(
      tenantDomain,
      'LeaveRequest',
    );

    // Check if the leave request exists
    const leaveRequestExists = await LeaveRequest.findById(leaveRequestId);
    if (!leaveRequestExists) {
      throw new Error('Leave request not found');
    }

    // Delete the leave request
    const result = await LeaveRequest.deleteOne({ _id: leaveRequestId });

    return result;
  } catch (error: any) {
    console.error('Error deleting leave request:', error.message);
    throw new Error(
      error.message ||
        'An unexpected error occurred while deleting the leave request',
    );
  }
};

export const leaveRequestServices = {
  createLeaveRequest,
  getAllLeaveRequests,
  getSingleLeaveRequest,
  updateLeaveRequest,
  deleteLeaveRequest,
  employeeLeaveRequest,
};
