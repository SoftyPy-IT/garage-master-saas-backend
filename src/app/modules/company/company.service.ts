
import { generateCompanyId } from './company.utils';
import AppError from '../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import sanitizePayload from '../../middlewares/updateDataValidation';
import { TVehicle } from '../vehicle/vehicle.interface';
import { CompanySearchableFields, vehicleFields } from './company.const';
import { TCompany } from './company.interface';
import { Company } from './company.model';
import { getTenantModel } from '../../utils/getTenantModels';

const createCompanyDetails = async (
  tenantDomain: string,
  payload: { company: TCompany; vehicle: TVehicle },
) => {
  const { Model: Company, connection: companyConnection } =
    await getTenantModel(tenantDomain, 'Company');

  const { Model: Vehicle, connection: vehicleConnection } =
    await getTenantModel(tenantDomain, 'Vehicle');

  if (companyConnection !== vehicleConnection) {
    throw new Error(
      'Company and Vehicle models must use the same tenant connection',
    );
  }

  const session = await companyConnection.startSession();
  session.startTransaction();

  try {
    const { company, vehicle } = payload;
const companyId = await generateCompanyId(Company);
    const sanitizedCompany = sanitizePayload(company);

    const companyData = new Company({
      ...sanitizedCompany,
      companyId,
    });

    const savedCompany = await companyData.save({ session });

    if (savedCompany.user_type === 'company' && vehicle) {
      const sanitizedVehicle = sanitizePayload(vehicle);

      const vehicleData = new Vehicle({
        ...sanitizedVehicle,
        company: savedCompany._id,
        Id: savedCompany.companyId,
        user_type: savedCompany.user_type,
      });

      if (!vehicleData.customer) vehicleData.customer = undefined;
      if (!vehicleData.showRoom) vehicleData.showRoom = undefined;

      await vehicleData.save({ session });

      savedCompany.vehicles.push(vehicleData._id);
      await savedCompany.save({ session });
    } else {
      throw new AppError(
        StatusCodes.CONFLICT,
        'Vehicle data is missing or user type mismatch',
      );
    }

    await session.commitTransaction();
    session.endSession();

    return savedCompany;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getAllCompanyFromDB = async (
  limit: number,
  page: number,
  searchTerm: string,
  isRecycled: string | undefined,
  tenantDomain: string
) => {
  const { Model: Company } = await getTenantModel(tenantDomain, 'Company');

  let searchQuery: { [key: string]: any } = {};

  if (searchTerm) {
    const escapedFilteringData = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const companySearchQuery = CompanySearchableFields.map(field => ({
      [field]: { $regex: escapedFilteringData, $options: 'i' },
    }));

    const vehicleSearchQuery = vehicleFields.map(field => {
      if (field === 'vehicles.vehicle_model') {
        return { [field]: { $eq: Number(searchTerm) } };
      }
      return { [field]: { $regex: escapedFilteringData, $options: 'i' } };
    });

    searchQuery = {
      $or: [...companySearchQuery, ...vehicleSearchQuery],
    };
  }

  if (isRecycled !== undefined) {
    searchQuery.isRecycled = isRecycled === 'true';
  }

  const companies = await Company.aggregate([
    {
      $lookup: {
        from: 'vehicles',
        localField: 'vehicles',
        foreignField: '_id',
        as: 'vehicles',
      },
    },
    { $match: searchQuery },
    { $sort: { createdAt: -1 } },
    ...(page && limit ? [{ $skip: (page - 1) * limit }, { $limit: limit }] : []),
  ]);

  const totalData = await Company.countDocuments(searchQuery);
  const totalPages = Math.ceil(totalData / limit);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return {
    companies,
    meta: {
      totalData,
      totalPages,
      currentPage: page,
      pageNumbers,
    },
  };
};

const getSingleCompanyDetails = async (tenantDomain: string, id: string) => {
  const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
  await getTenantModel(tenantDomain, 'JobCard');
  await getTenantModel(tenantDomain, 'Quotation');
  await getTenantModel(tenantDomain, 'Invoice');
  await getTenantModel(tenantDomain, 'Vehicle');
  await getTenantModel(tenantDomain, 'MoneyReceipt');

  const singleCompany = await Company.findById(id)
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
    .populate('vehicles');

  if (!singleCompany) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No company found');
  }

  return singleCompany;
};


const updateCompany = async (
  tenantDomain: string,
  id: string,
  payload: {
    company: Partial<TCompany>;
    vehicle: Partial<TVehicle>;
  }
) => {
  const { Model: Company, connection } = await getTenantModel(tenantDomain, 'Company');
  const { Model: Vehicle } = await getTenantModel(tenantDomain, 'Vehicle');

  if (Company.db !== Vehicle.db) {
    throw new Error('Company and Vehicle must come from the same tenant connection.');
  }

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const { company, vehicle } = payload;
    const sanitizedCompanyData = sanitizePayload(company);

    const updatedCompany = await Company.findByIdAndUpdate(
      id,
      { $set: sanitizedCompanyData },
      { new: true, runValidators: true, session }
    );

    if (!updatedCompany) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Company not found');
    }

    if (vehicle?.chassis_no) {
      const sanitizedVehicleData = sanitizePayload(vehicle);

      const existingVehicle = await Vehicle.findOne({
        chassis_no: vehicle.chassis_no,
      }).session(session);

      if (existingVehicle) {
        await Vehicle.findByIdAndUpdate(
          existingVehicle._id,
          { $set: sanitizedVehicleData },
          { new: true, runValidators: true, session }
        );
      } else {
        const newVehicle = new Vehicle({
          ...sanitizedVehicleData,
          company: updatedCompany._id,
          Id: updatedCompany.companyId,
          user_type: updatedCompany.user_type,
        });

        await newVehicle.save({ session });
        updatedCompany.vehicles.push(newVehicle._id);
        await updatedCompany.save({ session });
      }
    }

    await session.commitTransaction();
    session.endSession();

    return updatedCompany;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};


const deleteCompany = async (tenantDomain: string, id: string) => {
  const { Model: Company, connection } = await getTenantModel(tenantDomain, 'Company');
  const { Model: Vehicle } = await getTenantModel(tenantDomain, 'Vehicle');

  if (Company.db !== Vehicle.db) {
    throw new Error('Company and Vehicle must come from the same tenant connection.');
  }

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const existingCompany = await Company.findById(id).session(session);
    if (!existingCompany) {
      throw new AppError(StatusCodes.NOT_FOUND, 'Company not found');
    }

    await Vehicle.deleteMany({ Id: existingCompany.companyId }).session(session);
    await Company.findByIdAndDelete(existingCompany._id).session(session);

    await session.commitTransaction();
    session.endSession();

    return null;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};


const permanantlyDeleteCompany = async (tenantDomain: string, id: string) => {
  const { Model: Company, connection } = await getTenantModel(tenantDomain, 'Company');
  const { Model: Vehicle } = await getTenantModel(tenantDomain, 'Vehicle');

  const session = await connection.startSession();
  session.startTransaction();

  try {
    const existingCompany = await Company.findById(id).session(session);
    if (!existingCompany) {
      throw new AppError(StatusCodes.NOT_FOUND, 'No company exists.');
    }

    await Vehicle.deleteMany({ Id: existingCompany.companyId }).session(session);
    await Company.findByIdAndDelete(existingCompany._id).session(session);

    await session.commitTransaction();
    session.endSession();

    return null;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const moveToRecyledbinCompany = async (tenantDomain: string, id: string) => {

  const { Model: Company } = await getTenantModel(tenantDomain, 'Company');

  const existingCompany = await Company.findById(id);
  if (!existingCompany) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No company exists.');
  }

  const updatedCompany = await Company.findByIdAndUpdate(
    id,
    {
      isRecycled: true,
      recycledAt: new Date(),
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedCompany) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Company not found for recycling.');
  }

  return updatedCompany;
};

const restoreFromRecyledbinCompany = async (tenantDomain: string, id: string) => {
  const { Model: Company } = await getTenantModel(tenantDomain, 'Company');

  const existingCompany = await Company.findById(id);
  if (!existingCompany) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No company exists.');
  }

  const restoredCompany = await Company.findByIdAndUpdate(
    existingCompany._id,
    {
      isRecycled: false,
      recycledAt: null,
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!restoredCompany) {
    throw new AppError(StatusCodes.NOT_FOUND, 'Company could not be restored.');
  }

  return restoredCompany;
};


const moveAllToRecycledBin = async () => {
  const result = await Company.updateMany(
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
  const result = await Company.updateMany(
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

export const CompanyServices = {
  createCompanyDetails,
  getAllCompanyFromDB,
  getSingleCompanyDetails,
  deleteCompany,
  updateCompany,
  restoreFromRecyledbinCompany,
  moveToRecyledbinCompany,
  permanantlyDeleteCompany,
  restoreAllFromRecycledBin,
  moveAllToRecycledBin,
};
