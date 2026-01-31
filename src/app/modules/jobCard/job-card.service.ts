/* eslint-disable @typescript-eslint/no-explicit-any */
import AppError from '../../errors/AppError';
import { StatusCodes } from 'http-status-codes';
import sanitizePayload from '../../middlewares/updateDataValidation';
import { TVehicle } from '../vehicle/vehicle.interface';
import { TJobCard } from './job-card.interface';
import { TCustomer } from '../customer/customer.interface';
import { TCompany } from '../company/company.interface';
import { TShowRoom } from '../showRoom/showRoom.interface';
import { generateCustomerId } from '../customer/customer.utils';
import { generateJobCardNo } from './job-card.utils';
import { SearchableFields, usersFields } from './job-card.const';
import { generateCompanyId } from '../company/company.utils';
import { generateShowRoomId } from '../showRoom/showRoom.utils';
import mongoose from 'mongoose';
import puppeteer from 'puppeteer';
import { join } from 'path';
import ejs from 'ejs';
import { getTenantModel } from '../../utils/getTenantModels';

const createJobCardDetails = async (
  tenantDomain: string,
  payload: {
    jobCard: TJobCard;
    customer: TCustomer;
    company: TCompany;
    showroom: TShowRoom;
    vehicle: TVehicle;
  },
) => {
  const { Model: Customer, connection: tenantConnection } =
    await getTenantModel(tenantDomain, 'Customer');
  const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
  const { Model: ShowRoom } = await getTenantModel(tenantDomain, 'ShowRoom');
  const { Model: Vehicle } = await getTenantModel(tenantDomain, 'Vehicle');
  const { Model: JobCard } = await getTenantModel(tenantDomain, 'JobCard');

  const session = await tenantConnection.startSession();
  session.startTransaction();

  try {
    const { jobCard, customer, company, showroom, vehicle } = payload;

    let newUserForJobCard;

    const sanitizeCustomerData = sanitizePayload(customer);
    const sanitizeCompanyData = sanitizePayload(company);
    const sanitizeShowRoomData = sanitizePayload(showroom);

    const updateOrCreateUserForJobCard = async (
      userType: string,
      id: string | undefined,
      sanitizedData: any,
      findQuery: any,
      createNewUser: () => any,
    ) => {
      if (id) {
        return await findQuery.findOneAndUpdate(
          { [`${userType}Id`]: id },
          { $set: sanitizedData },
          { new: true, runValidators: true, session },
        );
      } else {
        return createNewUser();
      }
    };

    // Determine user type
    switch (jobCard.user_type) {
      case 'customer':
        newUserForJobCard = await updateOrCreateUserForJobCard(
          'customer',
          jobCard.Id,
          sanitizeCustomerData,
          Customer,
          async () => {
            const customerId = await generateCustomerId(Customer);
            return new Customer({ ...sanitizeCustomerData, customerId });
          },
        );
        break;
      case 'company':
        newUserForJobCard = await updateOrCreateUserForJobCard(
          'company',
          jobCard.Id,
          sanitizeCompanyData,
          Company,
          async () => {
            const companyId = await generateCompanyId(Company);
            return new Company({ ...sanitizeCompanyData, companyId });
          },
        );
        break;
      case 'showRoom':
        newUserForJobCard = await updateOrCreateUserForJobCard(
          'showRoom',
          jobCard.Id,
          sanitizeShowRoomData,
          ShowRoom,
          async () => {
            const showRoomId = await generateShowRoomId(ShowRoom);
            return new ShowRoom({ ...sanitizeShowRoomData, showRoomId });
          },
        );
        break;
      default:
        throw new AppError(StatusCodes.CONFLICT, 'Invalid user type provided');
    }

    const updateJobCard = await newUserForJobCard?.save({ session });

    if (!updateJobCard) {
      throw new AppError(StatusCodes.NOT_ACCEPTABLE, 'Something went wrong!');
    }

    let vehicleData;
    if (vehicle.chassis_no) {
      const sanitizedVehicleData = sanitizePayload(vehicle);
      const existingVehicle = await Vehicle.findOne(
        { chassis_no: vehicle.chassis_no },
        null,
        { session },
      );

      if (existingVehicle) {
        vehicleData = await Vehicle.findByIdAndUpdate(
          existingVehicle._id,
          { $set: sanitizedVehicleData },
          { new: true, runValidators: true, session },
        );
      } else {
        vehicleData = new Vehicle({
          ...sanitizedVehicleData,
          user_type: updateJobCard.user_type,
          customer:
            jobCard.user_type === 'customer' ? updateJobCard._id : undefined,
          company:
            jobCard.user_type === 'company' ? updateJobCard._id : undefined,
          showRoom:
            jobCard.user_type === 'showRoom' ? updateJobCard._id : undefined,
          Id:
            jobCard.user_type === 'customer'
              ? updateJobCard.customerId
              : jobCard.user_type === 'company'
                ? updateJobCard.companyId
                : jobCard.user_type === 'showRoom'
                  ? updateJobCard.showRoomId
                  : undefined,
        });

        await vehicleData.save({ session });

        updateJobCard.vehicles.push(vehicleData._id);
        await updateJobCard.save({ session });
      }
    }

    const newJobCard = new JobCard({
      ...jobCard,
      job_no: await generateJobCardNo(JobCard),

      vehicle: vehicleData?._id,
      customer:
        jobCard.user_type === 'customer' ? updateJobCard._id : undefined,
      company: jobCard.user_type === 'company' ? updateJobCard._id : undefined,
      showRoom:
        jobCard.user_type === 'showRoom' ? updateJobCard._id : undefined,
      Id:
        jobCard.user_type === 'customer'
          ? updateJobCard.customerId
          : jobCard.user_type === 'company'
            ? updateJobCard.companyId
            : jobCard.user_type === 'showRoom'
              ? updateJobCard.showRoomId
              : undefined,
    });

    await newJobCard.save({ session });

    updateJobCard.jobCards.push(newJobCard._id);
    await updateJobCard.save({ session });

    await session.commitTransaction();
    session.endSession();

    return newJobCard;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getAllJobCardsFromDB = async (
  tenantDomain: string,
  id: string | null,
  limit: number,
  page: number,
  searchTerm: string,
  isRecycled?: string,
) => {
  const { Model: JobCard } = await getTenantModel(tenantDomain, 'JobCard');
  const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');
  const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
  const { Model: ShowRoom } = await getTenantModel(tenantDomain, 'ShowRoom');
  const { Model: Vehicle } = await getTenantModel(tenantDomain, 'Vehicle');

  let idMatchQuery: any = {};
  let searchQuery: Record<string, any> = {};

  if (id) {
    idMatchQuery = {
      $or: [
        { 'customer._id': new mongoose.Types.ObjectId(id) },
        { 'company._id': new mongoose.Types.ObjectId(id) },
        { 'showRoom._id': new mongoose.Types.ObjectId(id) },
      ],
    };
  }

  if (searchTerm) {
    const escapedFilteringData = searchTerm.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );

    const userSearchQuery = SearchableFields.map((field) => ({
      [field]: { $regex: escapedFilteringData, $options: 'i' },
    }));

    const usersSearchQuery = usersFields.map((field) => {
      if (field === 'vehicle.vehicle_model') {
        return { [field]: { $eq: Number(searchTerm) } };
      }
      return { [field]: { $regex: escapedFilteringData, $options: 'i' } };
    });

    searchQuery = {
      $or: [...userSearchQuery, ...usersSearchQuery],
    };
  }

  if (isRecycled !== undefined) {
    searchQuery.isRecycled = isRecycled === 'true';
  }

  const jobCards = await JobCard.aggregate([
    {
      $lookup: {
        from: Customer.collection.name,
        localField: 'customer',
        foreignField: '_id',
        as: 'customer',
      },
    },
    {
      $lookup: {
        from: Company.collection.name,
        localField: 'company',
        foreignField: '_id',
        as: 'company',
      },
    },
    {
      $lookup: {
        from: ShowRoom.collection.name,
        localField: 'showRoom',
        foreignField: '_id',
        as: 'showRoom',
      },
    },
    { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$showRoom', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: Vehicle.collection.name,
        localField: 'vehicle',
        foreignField: '_id',
        as: 'vehicle',
      },
    },
    ...(id ? [{ $match: idMatchQuery }] : []),
    { $match: searchQuery },
    { $sort: { createdAt: -1 } },
    ...(page && limit
      ? [{ $skip: (page - 1) * limit }, { $limit: limit }]
      : []),
  ]);

  const totalDataAggregation = await JobCard.aggregate([
    {
      $lookup: {
        from: Customer.collection.name,
        localField: 'customer',
        foreignField: '_id',
        as: 'customer',
      },
    },
    {
      $lookup: {
        from: Company.collection.name,
        localField: 'company',
        foreignField: '_id',
        as: 'company',
      },
    },
    {
      $lookup: {
        from: ShowRoom.collection.name,
        localField: 'showRoom',
        foreignField: '_id',
        as: 'showRoom',
      },
    },
    { $unwind: { path: '$customer', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
    { $unwind: { path: '$showRoom', preserveNullAndEmptyArrays: true } },
    ...(id ? [{ $match: idMatchQuery }] : []),
    { $match: searchQuery },
    { $count: 'totalCount' },
  ]);

  const totalData =
    totalDataAggregation.length > 0 ? totalDataAggregation[0].totalCount : 0;
  const totalPages = Math.ceil(totalData / limit);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);

  return {
    jobCards,
    meta: {
      totalData,
      totalPages,
      currentPage: page,
      pageNumbers,
    },
  };
};

const getSingleJobCardDetails = async (tenantDomain: string, id: string) => {
  const { Model: JobCard } = await getTenantModel(tenantDomain, 'JobCard');
  const { Model: ShowRoom } = await getTenantModel(tenantDomain, 'ShowRoom');
  const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');
  const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
  const { Model: Vehicle } = await getTenantModel(tenantDomain, 'Vehicle');

  const singleJobCard = await JobCard.findById(id)
    .populate({
      path: 'showRoom',
      model: ShowRoom,
      populate: {
        path: 'vehicles',
        model: Vehicle,
      },
    })
    .populate({
      path: 'customer',
      model: Customer,
      populate: {
        path: 'vehicles',
        model: Vehicle,
      },
    })
    .populate({
      path: 'company',
      model: Company,
      populate: {
        path: 'vehicles',
        model: Vehicle,
      },
    })
    .populate({
      path: 'vehicle',
      model: Vehicle,
    });

  if (!singleJobCard) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No job card found');
  }

  return singleJobCard;
};

const getSingleJobCardDetailsWithJobNo = async (
  tenantDomain: string,
  jobNo: string,
) => {

  const { Model: JobCard } = await getTenantModel(tenantDomain, 'JobCard');
  const { Model: ShowRoom } = await getTenantModel(tenantDomain, 'ShowRoom');
  const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');
  const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
  const { Model: Vehicle } = await getTenantModel(tenantDomain, 'Vehicle');

  const singleJobCard = await JobCard.findOne({ job_no: jobNo })
    .populate({
      path: 'showRoom',
      model: ShowRoom,
      populate: {
        path: 'vehicles',
        model: Vehicle,
      },
    })
    .populate({
      path: 'customer',
      model: Customer,
      populate: {
        path: 'vehicles',
        model: Vehicle,
      },
    })
    .populate({
      path: 'company',
      model: Company,
      populate: {
        path: 'vehicles',
        model: Vehicle,
      },
    })
    .populate({
      path: 'vehicle',
      model: Vehicle,
    });

  if (!singleJobCard) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No job card found');
  }

  return singleJobCard;
};

const updateJobCardDetails = async (
  tenantDomain: string,
  id: string,
  payload: {
    jobCard: TJobCard;
    customer: TCustomer;
    company: TCompany;
    showroom: TShowRoom;
    vehicle: TVehicle;
  },
) => {
  const { Model: JobCard } = await getTenantModel(tenantDomain, 'JobCard');
  const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');
  const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
  const { Model: ShowRoom } = await getTenantModel(tenantDomain, 'ShowRoom');
  const { Model: Vehicle } = await getTenantModel(tenantDomain, 'Vehicle');

  const { jobCard, customer, company, showroom, vehicle } = payload;

  const existingJobCard = await JobCard.findById(id);
  if (!existingJobCard) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No job card exist.');
  }

  let newUserForJobCard;

  const sanitizeCustomerData = sanitizePayload(customer);
  const sanitizeCompanyData = sanitizePayload(company);
  const sanitizeShowRoomData = sanitizePayload(showroom);

  if (jobCard.user_type === 'customer') {
    newUserForJobCard = await Customer.findOneAndUpdate(
      { customerId: existingJobCard.Id },
      { $set: sanitizeCustomerData },
      { new: true, runValidators: true },
    );
  }

  if (jobCard.user_type === 'company') {
    newUserForJobCard = await Company.findOneAndUpdate(
      { companyId: existingJobCard.Id },
      { $set: sanitizeCompanyData },
      { new: true, runValidators: true },
    );
  }

  if (jobCard.user_type === 'showRoom') {
    newUserForJobCard = await ShowRoom.findOneAndUpdate(
      { showRoomId: existingJobCard.Id },
      { $set: sanitizeShowRoomData },
      { new: true, runValidators: true },
    );
  }

  const updateJobCard = await newUserForJobCard?.save();

  if (!updateJobCard) {
    throw new AppError(StatusCodes.NOT_ACCEPTABLE, 'Something went wrong!');
  }
  if (vehicle.chassis_no) {
    const updatedVehicle = await Vehicle.findOneAndUpdate(
      { chassis_no: vehicle.chassis_no },
      { $set: sanitizePayload(vehicle) },
      { new: true, runValidators: true },
    );

    if (!updatedVehicle) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        'Vehicle not found for given chassis_no',
      );
    }
  }

  const sanitizeJobCard = sanitizePayload(jobCard);

  const updateCard = await JobCard.findByIdAndUpdate(
    existingJobCard._id,
    { $set: sanitizeJobCard },
    { new: true, runValidators: true },
  );

  return updateCard;
};

const deleteJobCard = async (tenantDomain: string, id: string) => {
  const { Model: JobCard } = await getTenantModel(tenantDomain, 'JobCard');
  const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');
  const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
  const { Model: ShowRoom } = await getTenantModel(tenantDomain, 'ShowRoom');

  const existingJobCard = await JobCard.findById(id);
  if (!existingJobCard) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No job card exist.');
  }

  if (existingJobCard.user_type === 'customer') {
    await Customer.findOneAndUpdate(
      { customerId: existingJobCard.Id },
      { $pull: { jobCards: existingJobCard._id } },
      { new: true, runValidators: true },
    );
  } else if (existingJobCard.user_type === 'company') {
    await Company.findOneAndUpdate(
      { companyId: existingJobCard.Id },
      { $pull: { jobCards: existingJobCard._id } },
      { new: true, runValidators: true },
    );
  } else if (existingJobCard.user_type === 'showRoom') {
    await ShowRoom.findOneAndUpdate(
      { showRoomId: existingJobCard.Id },
      { $pull: { jobCards: existingJobCard._id } },
      { new: true, runValidators: true },
    );
  } else {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid user type');
  }

  const jobCard = await JobCard.findByIdAndDelete(existingJobCard._id);

  if (!jobCard) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No job card available');
  }

  return null;
};

const permanatlyDeleteJobCard = async (tenantDomain: string, id: string) => {
  const { Model: JobCard } = await getTenantModel(tenantDomain, 'JobCard');
  const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');
  const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
  const { Model: ShowRoom } = await getTenantModel(tenantDomain, 'ShowRoom');

  const existingJobCard = await JobCard.findById(id);
  if (!existingJobCard) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No job card exist.');
  }

  if (existingJobCard.user_type === 'customer') {
    await Customer.findOneAndUpdate(
      { customerId: existingJobCard.Id },
      { $pull: { jobCards: existingJobCard._id } },
      { new: true, runValidators: true },
    );
  } else if (existingJobCard.user_type === 'company') {
    await Company.findOneAndUpdate(
      { companyId: existingJobCard.Id },
      { $pull: { jobCards: existingJobCard._id } },
      { new: true, runValidators: true },
    );
  } else if (existingJobCard.user_type === 'showRoom') {
    await ShowRoom.findOneAndUpdate(
      { showRoomId: existingJobCard.Id },
      { $pull: { jobCards: existingJobCard._id } },
      { new: true, runValidators: true },
    );
  } else {
    throw new AppError(StatusCodes.BAD_REQUEST, 'Invalid user type');
  }

  const jobCard = await JobCard.findByIdAndDelete(existingJobCard._id);

  if (!jobCard) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No job card available');
  }

  return null;
};

const movetoRecyclebinJobcard = async (tenantDomain: string, id: string) => {
  const { Model: JobCard } = await getTenantModel(tenantDomain, 'JobCard');

  const existingJobCard = await JobCard.findById(id);
  if (!existingJobCard) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No job card exists.');
  }

  const recycledJobCard = await JobCard.findByIdAndUpdate(
    existingJobCard._id,
    {
      isRecycled: true,
      recycledAt: new Date(),
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!recycledJobCard) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      'Failed to move job card to recycle bin.',
    );
  }

  return recycledJobCard;
};

const restorefromRecyclebinJobcard = async (
  tenantDomain: string,
  id: string,
) => {
  const { Model: JobCard } = await getTenantModel(tenantDomain, 'JobCard');

  const existingJobCard = await JobCard.findById(id);
  if (!existingJobCard) {
    throw new AppError(StatusCodes.NOT_FOUND, 'No job card exists.');
  }

  const restoredJobCard = await JobCard.findByIdAndUpdate(
    existingJobCard._id,
    {
      isRecycled: false,
      recycledAt: null,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!restoredJobCard) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      'Failed to restore the job card from the recycle bin.',
    );
  }

  return restoredJobCard;
};

const getUserDetailsForJobCard = async (
  tenantDomain: string,
  id: string,
  userType: string,
) => {
  const { Model: Customer } = await getTenantModel(tenantDomain, 'Customer');
  const { Model: Company } = await getTenantModel(tenantDomain, 'Company');
  const { Model: ShowRoom } = await getTenantModel(tenantDomain, 'ShowRoom');

  let userDetails;

  switch (userType) {
    case 'customer':
      userDetails = await Customer.findOne({ customerId: id }).populate(
        'vehicles',
      );
      if (!userDetails) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Customer not found.');
      }
      break;
    case 'company':
      userDetails = await Company.findOne({ companyId: id }).populate(
        'vehicles',
      );
      if (!userDetails) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Company not found.');
      }
      break;
    case 'showRoom':
      userDetails = await ShowRoom.findOne({ showRoomId: id }).populate(
        'vehicles',
      );
      if (!userDetails) {
        throw new AppError(StatusCodes.NOT_FOUND, 'Showroom not found.');
      }
      break;
    default:
      throw new AppError(StatusCodes.NOT_FOUND, 'Invalid user type.');
  }

  return userDetails;
};
 const generateJobCardPdf = async (
  tenantDomain: string,
  id: string,
  imageUrl: string,
  companyData: string,
): Promise<Buffer> => {
  const { Model: JobCard } = await getTenantModel(tenantDomain, 'JobCard');
  const jobcard = await JobCard.findById(id)
    .populate('customer')
    .populate('company')
    .populate('showRoom')
    .populate('vehicle');
  const companyProfile = JSON.parse(companyData || '{}');
  if (!jobcard) {
    throw new Error('jobcard not found');
  }

  // Fetch both logos
  const images = ['logo.png', 'car3.jpeg'];
  const imageBase64Array = await Promise.all(
    images.map(async (imageName) => {
      try {
        const imageResponse = await fetch(`${imageUrl}/images/${imageName}`);
        const imageBuffer = await imageResponse.arrayBuffer();
        return Buffer.from(imageBuffer).toString('base64');
      } catch (error) {
        console.warn(`Failed to load ${imageName}:`, error);
        return '';
      }
    }),
  );

  const filePath = join(__dirname, '../../templates/jobcard.ejs');

  const html = await new Promise<string>((resolve, reject) => {
    ejs.renderFile(
      filePath,
      {
        jobcard,
        imageUrl,
        logoBase64: imageBase64Array[0],
        carImageBase64: imageBase64Array[1],
        companyData: companyProfile,
      },
      (err, str) => {
        if (err) return reject(err);
        resolve(str);
      },
    );
  });

  try {
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: ['networkidle0', 'load', 'domcontentloaded'],
      timeout: 30000,
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px',
      },
    });

    await browser.close();
    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('PDF generation failed');
  }
};

export const JobCardServices = {
  createJobCardDetails,
  getAllJobCardsFromDB,
  getSingleJobCardDetails,
  updateJobCardDetails,
  deleteJobCard,
  getSingleJobCardDetailsWithJobNo,
  generateJobCardPdf,
  getUserDetailsForJobCard,
  movetoRecyclebinJobcard,
  restorefromRecyclebinJobcard,
  permanatlyDeleteJobCard,
};
