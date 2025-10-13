import mongoose from 'mongoose';
import { generateCustomerId } from './customer.utils';
import { Customer } from './customer.model';
import AppError from '../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import sanitizePayload from '../../middlewares/updateDataValidation';

import { Vehicle } from '../vehicle/vehicle.model';
import { TCustomer } from './customer.interface';
import { TVehicle } from '../vehicle/vehicle.interface';
import { CustomerSearchableFields, vehicleFields } from './customer.const';
import { getTenantModel } from '../../utils/getTenantModels';

const createCustomerDetails = async (
  tenantDomain: string,
  payload: { customer: TCustomer; vehicle: TVehicle },
) => {
  const { Model: Customer, connection: customerConnection } =
    await getTenantModel(tenantDomain, 'Customer');

  const { Model: Vehicle, connection: vehicleConnection } =
    await getTenantModel(tenantDomain, 'Vehicle');

  if (customerConnection !== vehicleConnection) {
    throw new Error(
      'Customer and Vehicle models must be from the same tenant connection',
    );
  }

  const session = await customerConnection.startSession();
  session.startTransaction();

  try {
    const { customer, vehicle } = payload;
    const customerId = await generateCustomerId(Customer);

    const sanitizedCustomer = sanitizePayload(customer);
    const customerData = new Customer({
      ...sanitizedCustomer,
      customerId,
    });

    const savedCustomer = await customerData.save({ session });

    if (savedCustomer.user_type === 'customer' && vehicle) {
      const sanitizedVehicle = sanitizePayload(vehicle);

      const vehicleData = new Vehicle({
        ...sanitizedVehicle,
        customer: savedCustomer._id,
        Id: savedCustomer.customerId,
        user_type: savedCustomer.user_type,
      });

      if (!vehicleData.company) vehicleData.company = undefined;
      if (!vehicleData.showRoom) vehicleData.showRoom = undefined;

      await vehicleData.save({ session });

      savedCustomer.vehicles.push(vehicleData._id);
      await savedCustomer.save({ session });
    } else {
      throw new AppError(
        StatusCodes.CONFLICT,
        'Vehicle data is missing or user type mismatch',
      );
    }

    await session.commitTransaction();
    session.endSession();

    return savedCustomer;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getAllCustomersFromDB = async (
  tenantDomain: string,
  limit: number,
  page: number,
  searchTerm: string,
  isRecycled?: string,
) => {
  const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');

  let searchQuery: { [key: string]: any } = {};
  if (searchTerm) {
    const escapedFilteringData = searchTerm.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );

    const customerSearchQuery = CustomerSearchableFields.map((field) => ({
      [field]: { $regex: escapedFilteringData, $options: 'i' },
    }));

    const vehicleSearchQuery = vehicleFields.map((field) => {
      if (field === 'vehicles.vehicle_model') {
        return { [field]: { $eq: Number(searchTerm) } };
      }
      return { [field]: { $regex: escapedFilteringData, $options: 'i' } };
    });

    searchQuery = {
      $or: [...vehicleSearchQuery, ...customerSearchQuery],
    };
  }

  if (isRecycled !== undefined) {
    searchQuery.isRecycled = isRecycled === 'true';
  }

  const customers = await Customer.aggregate([
    {
      $lookup: {
        from: 'vehicles',
        localField: 'vehicles',
        foreignField: '_id',
        as: 'vehicles',
      },
    },
    {
      $lookup: {
        from: 'quotations',
        localField: 'quotations',
        foreignField: '_id',
        as: 'quotations',
      },
    },
    {
      $lookup: {
        from: 'invoices',
        localField: 'invoices',
        foreignField: '_id',
        as: 'invoices',
      },
    },
    {
      $lookup: {
        from: 'money_receipts',
        localField: 'money_receipts',
        foreignField: '_id',
        as: 'money_receipts',
      },
    },
    {
      $match: searchQuery,
    },
    {
      $sort: { createdAt: -1 },
    },
    ...(page && limit
      ? [{ $skip: (page - 1) * limit }, { $limit: limit }]
      : []),
  ]);

  const totalData = await Customer.countDocuments(searchQuery);
  const totalPages = Math.ceil(totalData / limit);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return {
    customers,
    meta: {
      totalData,
      totalPages,
      currentPage: page,
      pageNumbers,
    },
  };
};

export const getSingleCustomerDetails = async (
  tenantDomain: string,
  id: string,
) => {
  await getTenantModel(tenantDomain, 'JobCard');
  await getTenantModel(tenantDomain, 'Quotation');
  await getTenantModel(tenantDomain, 'Invoice');
  await getTenantModel(tenantDomain, 'Vehicle');
  await getTenantModel(tenantDomain, 'MoneyReceipt');

  const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');

  const singleCustomer = await Customer.findById(id)
    .populate('jobCards')
    .populate({
      path: 'quotations',
      populate: { path: 'vehicle' },
    })
    .populate({
      path: 'invoices',
      populate: { path: 'vehicle' },
    })
    .populate('money_receipts')
    .populate('vehicles')
    .exec();

  if (!singleCustomer) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No customer found');
  }

  return singleCustomer;
};

const updateCustomer = async (
  tenantDomain: string,
  id: string,
  payload: {
    customer: Partial<TCustomer>;
    vehicle: Partial<TVehicle>;
  },
) => {
  const { customer, vehicle } = payload;
  const { Model: Customer, connection: customerConnection } =
    await getTenantModel(tenantDomain, 'Customer');

  const { Model: Vehicle, connection: vehicleConnection } =
    await getTenantModel(tenantDomain, 'Vehicle');

  if (customerConnection !== vehicleConnection) {
    throw new Error(
      'Customer and Vehicle models must be from the same tenant connection',
    );
  }

  const session = await customerConnection.startSession();
  session.startTransaction();

  try {
    const sanitizedCustomerData = sanitizePayload(customer);

    const updatedCustomer = await Customer.findByIdAndUpdate(
      id,
      { $set: sanitizedCustomerData },
      {
        new: true,
        runValidators: true,
        session,
      },
    );

    if (!updatedCustomer) {
      throw new AppError(StatusCodes.NOT_FOUND, 'No customer available');
    }

    // If vehicle data exists and has chassis_no, try to update or create
    if (vehicle?.chassis_no) {
      const sanitizedVehicleData = sanitizePayload(vehicle);

      const existingVehicle = await Vehicle.findOne({
        chassis_no: vehicle.chassis_no,
      }).session(session);

      if (existingVehicle) {
        await Vehicle.findByIdAndUpdate(
          existingVehicle._id,
          {
            $set: sanitizedVehicleData,
          },
          {
            new: true,
            runValidators: true,
            session,
          },
        );
      } else {
        const newVehicle = new Vehicle({
          ...sanitizedVehicleData,
          customer: updatedCustomer._id,
          Id: updatedCustomer.customerId,
          user_type: updatedCustomer.user_type,
        });

        // Optional: ensure optional fields like company/showRoom are undefined if empty
        if (!newVehicle.company) newVehicle.company = undefined;
        if (!newVehicle.showRoom) newVehicle.showRoom = undefined;

        await newVehicle.save({ session });

        // Update the customer's vehicle list
        updatedCustomer.vehicles.push(newVehicle._id);
        await updatedCustomer.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    return updatedCustomer;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const deleteCustomer = async (id: string) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const existingCustomer = await Customer.findById(id).session(session);
    if (!existingCustomer) {
      throw new AppError(StatusCodes.NOT_FOUND, 'No customer exist.');
    }

    const vehicle = await Vehicle.deleteMany({
      Id: existingCustomer.customerId,
    }).session(session);

    const customer = await Customer.findByIdAndDelete(
      existingCustomer._id,
    ).session(session);

    if (!customer || !vehicle) {
      throw new AppError(StatusCodes.NOT_FOUND, 'No customer available');
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
const permanantlyDeleteCustomer = async (tenantDomain: string, id: string) => {
  const { Model: Customer, connection } = await getTenantModel(
    tenantDomain,
    'Customer',
  );
  const { Model: Vehicle } = await getTenantModel(tenantDomain, 'Vehicle');

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const existingCustomer = await Customer.findById(id).session(session);
    if (!existingCustomer) {
      throw new AppError(StatusCodes.NOT_FOUND, 'No customer exist.');
    }

    const vehicle = await Vehicle.deleteMany({
      Id: existingCustomer.customerId,
    }).session(session);

    const deletedCustomer = await Customer.findByIdAndDelete(
      existingCustomer._id,
    ).session(session);

    if (!deletedCustomer || !vehicle) {
      throw new AppError(StatusCodes.NOT_FOUND, 'No customer available');
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

const moveToRecycledCustomer = async (tenantDomain: string, id: string) => {
  const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');

  const existingCustomer = await Customer.findById(id);
  if (!existingCustomer) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No customer exist.');
  }

  const updatedCustomer = await Customer.findByIdAndUpdate(
    existingCustomer._id,
    { isRecycled: true, recycledAt: new Date() },
    { new: true, runValidators: true },
  );

  if (!updatedCustomer) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No customer available');
  }

  return updatedCustomer;
};

const restoreFromRecycledCustomer = async (
  tenantDomain: string,
  id: string,
) => {
  const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');

  const recycledCustomer = await Customer.findById(id);
  if (!recycledCustomer) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No customer exist.');
  }

  const restoredCustomer = await Customer.findByIdAndUpdate(
    recycledCustomer._id,
    { isRecycled: false, recycledAt: null },
    { new: true, runValidators: true },
  );

  if (!restoredCustomer) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      'No customer available for restoration.',
    );
  }

  return restoredCustomer;
};

const moveAllToRecycledBin = async () => {
  const result = await Customer.updateMany(
    {}, // Match all documents
    {
      $set: {
        isRecycled: true,
        recycledAt: new Date(),
      },
    },
    {
      runValidators: true,
    },
  );

  return result;
};
const restoreAllFromRecycledBin = async () => {
  const result = await Customer.updateMany(
    { isRecycled: true },
    {
      $set: {
        isRecycled: false,
      },
      $unset: {
        recycledAt: '',
      },
    },
    {
      runValidators: true,
    },
  );

  return result;
};
export const CustomerServices = {
  createCustomerDetails,
  getAllCustomersFromDB,
  getSingleCustomerDetails,
  deleteCustomer,
  updateCustomer,
  restoreFromRecycledCustomer,
  moveToRecycledCustomer,
  permanantlyDeleteCustomer,
  moveAllToRecycledBin,
  restoreAllFromRecycledBin,
};
