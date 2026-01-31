import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { getTenantModel } from '../../utils/getTenantModels';
import { TCompanyProfile } from './companyProfile.interface';


const createCompanyProfile = async (
  tenantDomain: string,
  payload: TCompanyProfile
): Promise<TCompanyProfile> => {
  const { Model: CompanyProfile } = await getTenantModel(
    tenantDomain,
    'CompanyProfile'
  );

  const existingProfile = await CompanyProfile.findOne();
  if (existingProfile) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Company profile already exists. Please update it instead.'
    );
  }

  const result = await CompanyProfile.create(payload);
  return result;
};



const getCompanyProfile = async (
  tenantDomain: string,
): Promise<TCompanyProfile | null> => {
  try {
    const { Model: CompanyProfile } = await getTenantModel(
      tenantDomain,
      'CompanyProfile',
    );

    const profile = await CompanyProfile.findOne();

    // Do NOT throw an error here. Return null if not found.
    return profile;
  } catch (error: any) {
    // Only catch actual server errors, not "not found"
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Internal Server Error');
  }
};

const updateCompanyProfile = async (
  tenantDomain: string,
  id: string,
  payload: Partial<TCompanyProfile>
): Promise<TCompanyProfile | null> => {
  const { Model: CompanyProfile } = await getTenantModel(
    tenantDomain,
    'CompanyProfile'
  );

  if (!id) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Company profile ID is required for update');
  }

  const result = await CompanyProfile.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Company profile not found');
  }

  return result;
};

export const getSingleCompanyProfile = async (
  tenantDomain: string,
  id: string,
): Promise<TCompanyProfile | null> => {
  try {
    const { Model: CompanyProfile } = await getTenantModel(
      tenantDomain,
      'CompanyProfile', 
    );

    const profile = await CompanyProfile.findOne({ _id: id }); 

    if (!profile) {
      throw new AppError(
        httpStatus.NOT_FOUND,
        'Company profile not found', 
      );
    }

    return profile;
  } catch (error: any) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      error.message || 'Internal Server Error',
    );
  }
};


export const companyProfileService = {
  getCompanyProfile,
  updateCompanyProfile,
  createCompanyProfile
};